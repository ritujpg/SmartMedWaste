from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, status

from app.services.workflow_service import WorkflowService

router = APIRouter(prefix="/api", tags=["emergency"])


@router.get("/emergency")
async def list_emergencies() -> dict[str, Any]:
    return {
        "items": [
            {"id": "SOS-24001", "facility": "Apollo Hospitals", "priority": "Critical", "description": "Unsegregated sharps container", "status": "Open", "assigned_collector": "Arjun Mehta"}
        ]
    }


@router.post("/emergency")
async def create_emergency(payload: dict[str, Any]) -> dict[str, Any]:
    service = WorkflowService()
    return service.create_emergency_request(payload)
