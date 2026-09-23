from __future__ import annotations

from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_current_user_from_request, require_roles
from app.schemas.operations import CollectionRequestCreate, StatusUpdate
from app.services.supabase_repository import SupabaseRepository

router = APIRouter(tags=["collection"])


def _facility_id(repo: SupabaseRepository, user: dict[str, Any]) -> str | None:
    facility = repo.get_facility_by_user_id(str(user.get("id")))
    return str(facility["id"]) if facility else None


def _to_api_request(row: dict[str, Any]) -> dict[str, Any]:
    """Expose the stable frontend contract while keeping deployed DB names internal."""
    return {
        **row,
        "request_id": row.get("request_code", row.get("request_id")),
        "category": row.get("waste_category", row.get("category")),
        "quantity_kg": row.get("estimated_quantity", row.get("quantity_kg")),
        "special_handling": row.get("special_handling_requirement", row.get("special_handling")),
        "pickup_notes": row.get("notes", row.get("pickup_notes")),
        "pickup_date": row.get("preferred_pickup_date", row.get("pickup_date")),
        "pickup_time": row.get("preferred_pickup_time", row.get("pickup_time")),
        "collector_id": row.get("assigned_collector_id", row.get("collector_id")),
        "collection_id": row.get("collection_id") or row.get("collection_id_override"),
        "barcode": row.get("barcode"),
    }


@router.get("/collection-requests")
async def list_collection_requests(user: dict[str, Any] = Depends(get_current_user_from_request)) -> dict[str, Any]:
    repo = SupabaseRepository()
    return {"items": [_to_api_request(row) for row in repo.list_collection_requests_for_user(user)]}


@router.post("/collection-requests", status_code=status.HTTP_201_CREATED)
async def create_collection_request(
    payload: CollectionRequestCreate,
    user: dict[str, Any] = Depends(
        require_roles("facility", "administrator")
    ),
) -> dict[str, Any]:
    repo = SupabaseRepository()
    facility_id = _facility_id(repo, user)

    if not facility_id and user.get("role") != "administrator":
        raise HTTPException(
            status_code=400,
            detail="No facility is associated with this user",
        )

    data = payload.model_dump(mode="json")

    row = {
        "request_code": f"REQ-{uuid4().hex[:12].upper()}",
        "facility_id": facility_id,
        "waste_category": data.get("category"),
        "estimated_quantity": data.get("quantity_kg"),
        "quantity_unit": "kg",
        "priority": data.get("priority", "Normal"),
        "special_handling_requirement": data.get("special_handling"),
        "pickup_location": data.get("pickup_location"),
        "notes": data.get("pickup_notes"),
        "preferred_pickup_date": data.get("pickup_date"),
        "preferred_pickup_time": data.get("pickup_time"),
        "assigned_collector_id": data.get("collector_id"),
        "status": "Requested",
    }

    result = repo.insert_collection_request(row)

    if result.get("status") != "inserted":
        raise HTTPException(
            status_code=503 if result.get("status") == "skipped" else 400,
            detail=result.get(
                "detail", "Request could not be created"
            ),
        )

    return _to_api_request(result["data"][0] if result.get("data") else row)

@router.patch("/collection-requests/{request_id}/status")
async def update_collection_request_status(request_id: str, payload: StatusUpdate, user: dict[str, Any] = Depends(require_roles("facility", "collector", "administrator"))) -> dict[str, Any]:
    if user.get("role") not in {"facility", "collector", "administrator"}:
        raise HTTPException(status_code=403, detail="Forbidden")
    repo = SupabaseRepository()
    current = repo.get_collection_request(request_id)
    if not current:
        raise HTTPException(status_code=404, detail="Collection request not found")
    if user.get("role") == "facility" and current.get("facility_id") != _facility_id(repo, user):
        raise HTTPException(status_code=403, detail="Forbidden")
    collector = repo.get_collector_by_user_id(str(user.get("id"))) or {}
    if user.get("role") == "collector" and current.get("assigned_collector_id") not in (None, collector.get("id")):
        raise HTTPException(status_code=403, detail="Forbidden")

    update_values: dict[str, Any] = {"status": payload.status}
    if payload.status == "Assigned" and user.get("role") == "collector":
        if current.get("status") != "Requested" or current.get("assigned_collector_id") is not None:
            raise HTTPException(status_code=409, detail="Collection request is no longer available")
        if not collector.get("id"):
            raise HTTPException(status_code=409, detail="Collector profile is not provisioned")
        collection_id = current.get("collection_id") or f"COL-{uuid4().hex[:12].upper()}"
        update_values = {
            "status": "Assigned",
            "assigned_collector_id": collector["id"],
            "collection_id": collection_id,
            "barcode": current.get("barcode") or collection_id,
        }
    elif payload.status == "Rejected" and user.get("role") == "collector":
        # The deployed enum has no Rejected value; leave it Requested so another collector can claim it.
        update_values["status"] = current.get("status", "Requested")
        update_values["assigned_collector_id"] = None

    if payload.status == "Assigned" and user.get("role") == "collector":
        result = repo.accept_collection_request(request_id, collector["id"], update_values)
    else:
        result = repo.update_collection_request(request_id, update_values)
    if result.get("status") != "updated":
        error_status = 503 if result.get("status") == "skipped" else 409 if result.get("status") == "conflict" else 400
        raise HTTPException(status_code=error_status, detail=result.get("detail", "Status update failed"))
    response = result["data"][0] if result.get("data") else {"request_code": request_id, "status": payload.status}
    return _to_api_request(response)
