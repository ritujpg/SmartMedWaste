from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from app.services.workflow_service import WorkflowService

router = APIRouter(tags=["collection"])


@router.get("/collection-requests")
async def list_collection_requests() -> dict[str, Any]:
    return {
        "items": [
            {"id": "REQ-24091", "facility": "Apollo Hospitals", "category": "YELLOW", "quantity": "12.4 kg", "priority": "High", "collector": "Arjun Mehta", "pickup": "Today, 10:30 AM", "status": "Collector En Route"},
        ]
    }


@router.post("/collection-requests")
async def create_collection_request(payload: dict[str, Any]) -> dict[str, Any]:
    service = WorkflowService()
    result = service.create_collection_request(payload)
    return {"status": "created", "result": result}


@router.post("/collection-requests/{request_id}/status")
async def update_collection_request_status(request_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    service = WorkflowService()
    return service.update_collection_request_status(request_id, str(payload.get("status", "Requested")))
