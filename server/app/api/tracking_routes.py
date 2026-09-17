from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_current_user_from_request
from app.schemas.operations import TrackingEventCreate
from app.services.supabase_repository import SupabaseRepository

router = APIRouter(tags=["tracking"])


@router.get("/tracking/{tracking_id}")
async def tracking_lookup(tracking_id: str, user: dict[str, Any] = Depends(get_current_user_from_request)) -> dict[str, Any]:
    repo = SupabaseRepository()
    record = repo.get_waste_by_tracking_id(tracking_id)
    if not record:
        raise HTTPException(status_code=404, detail="Waste record not found")
    if user.get("role") == "facility":
        facility = repo.get_facility_by_user_id(str(user.get("id")))
        if not facility or record.get("facility_id") != facility.get("id"):
            raise HTTPException(status_code=403, detail="Forbidden")
    if user.get("role") == "collector":
        collector = repo.get_collector_by_user_id(str(user.get("id")))
        if not collector or record.get("collector_id") != collector.get("id"):
            raise HTTPException(status_code=403, detail="Forbidden")
    events = repo.list_tracking_events_for_record(str(record["id"]))
    return {
        "tracking_id": tracking_id,
        "category": record.get("category"),
        "quantity_kg": record.get("quantity_kg", 0),
        "status": record.get("status"),
        "facility_id": record.get("facility_id"),
        "events": events,
    }


@router.post("/tracking/{tracking_id}/scan", status_code=status.HTTP_201_CREATED)
async def scan_tracking(tracking_id: str, payload: TrackingEventCreate, user: dict[str, Any] = Depends(get_current_user_from_request)) -> dict[str, Any]:
    repo = SupabaseRepository()
    record = repo.get_waste_by_tracking_id(tracking_id)
    if not record:
        raise HTTPException(status_code=404, detail="Waste record not found")
    result = repo.insert_tracking_event({
        "waste_record_id": record["id"],
        "event_type": payload.event_type,
        "status": payload.status,
        "description": payload.description,
        "actor_user_id": user["id"],
        "metadata": payload.metadata,
    })
    if result.get("status") != "inserted":
        raise HTTPException(status_code=503 if result.get("status") == "skipped" else 400, detail=result.get("detail", "Tracking event could not be recorded"))
    status_result = repo.update_waste_record(str(record["id"]), {"status": payload.status})
    if status_result.get("status") not in {"updated", "skipped"}:
        raise HTTPException(status_code=400, detail=status_result.get("detail", "Waste status could not be updated"))
    return result["data"][0] if result.get("data") else {"tracking_id": tracking_id, "status": "recorded"}
