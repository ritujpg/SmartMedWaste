from __future__ import annotations

from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_current_user_from_request, require_roles
from app.schemas.operations import EmergencyCreate, EmergencyStatusUpdate
from app.services.supabase_repository import SupabaseRepository

router = APIRouter(tags=["emergency"])


@router.get("/emergency")
async def list_emergencies(user: dict[str, Any] = Depends(get_current_user_from_request)) -> dict[str, Any]:
    repo = SupabaseRepository()
    rows = repo.list_emergency_requests()
    if user.get("role") == "facility":
        facility = repo.get_facility_by_user_id(str(user.get("id")))
        rows = [row for row in rows if facility and row.get("facility_id") == facility.get("id")]
    elif user.get("role") == "collector":
        collector = repo.get_collector_by_user_id(str(user.get("id")))
        rows = [row for row in rows if collector and row.get("assigned_collector_id") == collector.get("id")]
    return {"items": rows}


@router.post("/emergency", status_code=status.HTTP_201_CREATED)
async def create_emergency(payload: EmergencyCreate, user: dict[str, Any] = Depends(require_roles("facility", "administrator"))) -> dict[str, Any]:
    repo = SupabaseRepository()
    facility = repo.get_facility_by_user_id(str(user.get("id")))
    if user.get("role") == "facility" and not facility:
        raise HTTPException(status_code=400, detail="No facility is associated with this user")
    result = repo.insert_emergency_request({
        "request_id": f"SOS-{uuid4().hex[:12].upper()}",
        "facility_id": facility.get("id") if facility else None,
        "waste_record_id": payload.waste_record_id,
        "priority": payload.priority,
        "description": payload.description,
        "status": "Open",
    })
    if result.get("status") != "inserted":
        raise HTTPException(status_code=503 if result.get("status") == "skipped" else 400, detail=result.get("detail", "Emergency could not be created"))
    return result["data"][0] if result.get("data") else {"status": "created"}


@router.patch("/emergency/{request_id}/status")
async def update_emergency(request_id: str, payload: EmergencyStatusUpdate, user: dict[str, Any] = Depends(require_roles("collector", "administrator"))) -> dict[str, Any]:
    repo = SupabaseRepository()
    result = repo.update_emergency_request(request_id, {"status": payload.status})
    if result.get("status") != "updated":
        raise HTTPException(status_code=503 if result.get("status") == "skipped" else 400, detail=result.get("detail", "Emergency could not be updated"))
    return result["data"][0] if result.get("data") else {"request_id": request_id, "status": payload.status}
