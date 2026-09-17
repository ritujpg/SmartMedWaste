import asyncio
from datetime import date, time

import pytest
from fastapi import HTTPException

from app.api import collection_routes
from app.schemas.operations import CollectionRequestCreate, StatusUpdate


class FakeRepository:
    inserted = None

    def get_facility_by_user_id(self, user_id):
        return {"id": "facility-1", "user_id": user_id}

    def insert_collection_request(self, row):
        self.inserted = row
        return {"status": "inserted", "data": [{**row, "id": "request-row-1"}]}

    def list_collection_requests_for_user(self, user):
        return [{
            "id": "request-row-1",
            "request_code": "REQ-1",
            "facility_id": "facility-1",
            "waste_category": "BLUE",
            "estimated_quantity": 2,
            "quantity_unit": "kg",
            "special_handling_requirement": "None",
            "notes": "Call on arrival",
            "preferred_pickup_date": "2026-09-17",
            "preferred_pickup_time": "10:30:00",
            "assigned_collector_id": None,
            "priority": "Normal",
            "status": "Requested",
        }]

    def get_collection_request(self, request_id):
        assert request_id == "REQ-1"
        return {"request_code": "REQ-1", "facility_id": "facility-1", "status": "Requested", "assigned_collector_id": None}

    def get_collector_by_user_id(self, user_id):
        return None

    def update_collection_request(self, request_id, values):
        assert request_id == "REQ-1"
        assert values == {"status": "Assigned"}
        return {"status": "updated", "data": [{"request_code": request_id, **values}]}


@pytest.mark.asyncio
async def test_create_collection_request_maps_to_schema_columns(monkeypatch):
    repo = FakeRepository()
    monkeypatch.setattr(collection_routes, "SupabaseRepository", lambda: repo)
    payload = CollectionRequestCreate(
        category="YELLOW",
        quantity_kg=12.5,
        priority="High",
        special_handling="Sharps container",
        pickup_location="Main campus",
        pickup_notes="Use loading bay",
        pickup_date=date(2026, 9, 17),
        pickup_time=time(10, 30),
    )

    result = await collection_routes.create_collection_request(payload, {"id": "user-1", "role": "facility"})

    assert result["id"] == "request-row-1"
    assert repo.inserted["facility_id"] == "facility-1"
    assert repo.inserted["waste_category"] == "YELLOW"
    assert repo.inserted["estimated_quantity"] == 12.5
    assert repo.inserted["special_handling_requirement"] == "Sharps container"
    assert repo.inserted["notes"] == "Use loading bay"
    assert repo.inserted["preferred_pickup_date"] == "2026-09-17"
    assert repo.inserted["preferred_pickup_time"] == "10:30:00"
    assert repo.inserted["assigned_collector_id"] is None
    assert repo.inserted["status"] == "Requested"
    assert repo.inserted["request_code"].startswith("REQ-")
    assert result["request_id"] == repo.inserted["request_code"]
    assert result["category"] == "YELLOW"
    assert result["quantity_kg"] == 12.5


@pytest.mark.asyncio
async def test_create_collection_request_rejects_user_without_facility(monkeypatch):
    class NoFacilityRepository(FakeRepository):
        def get_facility_by_user_id(self, user_id):
            return None

    monkeypatch.setattr(collection_routes, "SupabaseRepository", NoFacilityRepository)
    payload = CollectionRequestCreate(category="RED", quantity_kg=1)

    with pytest.raises(HTTPException) as error:
        await collection_routes.create_collection_request(payload, {"id": "user-1", "role": "facility"})

    assert error.value.status_code == 400
    assert error.value.detail == "No facility is associated with this user"


def test_workflow_service_uses_repository_schema_columns(monkeypatch):
    from app.services.workflow_service import WorkflowService

    class WorkflowRepository(FakeRepository):
        pass

    repo = WorkflowRepository()
    monkeypatch.setattr("app.services.workflow_service.SupabaseRepository", lambda: repo)
    service = WorkflowService()
    service.create_collection_request({
        "request_id": "REQ-1",
        "facility_id": "facility-1",
        "category": "BLUE",
        "quantity_kg": 2,
        "pickup_notes": "Call on arrival",
    })

    assert repo.inserted["request_code"] == "REQ-1"
    assert repo.inserted["waste_category"] == "BLUE"
    assert repo.inserted["estimated_quantity"] == 2
    assert repo.inserted["notes"] == "Call on arrival"


@pytest.mark.asyncio
async def test_list_collection_requests_normalizes_deployed_columns(monkeypatch):
    repo = FakeRepository()
    monkeypatch.setattr(collection_routes, "SupabaseRepository", lambda: repo)

    result = await collection_routes.list_collection_requests({"id": "user-1", "role": "facility"})

    item = result["items"][0]
    assert item["request_id"] == "REQ-1"
    assert item["category"] == "BLUE"
    assert item["quantity_kg"] == 2
    assert item["pickup_notes"] == "Call on arrival"
    assert item["pickup_date"] == "2026-09-17"
    assert item["pickup_time"] == "10:30:00"
    assert item["collector_id"] is None


@pytest.mark.asyncio
async def test_status_update_uses_request_code_and_normalizes_response(monkeypatch):
    repo = FakeRepository()
    monkeypatch.setattr(collection_routes, "SupabaseRepository", lambda: repo)

    result = await collection_routes.update_collection_request_status(
        "REQ-1",
        StatusUpdate(status="Assigned"),
        {"id": "admin-1", "role": "administrator"},
    )

    assert result["request_id"] == "REQ-1"
    assert result["status"] == "Assigned"
