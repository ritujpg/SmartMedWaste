from __future__ import annotations

from typing import Any

from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.core.dependencies import get_current_user_from_request
from app.services.detection import DetectionService
from app.services.supabase_repository import SupabaseRepository

router = APIRouter(tags=["detection"])


@router.post("/detect")
async def detect(file: UploadFile = File(...), user: dict[str, Any] = Depends(get_current_user_from_request)) -> dict[str, Any]:
    """Receive the current phone-camera frame as multipart/form-data and hand it
    to the detection service. The service returns a mock medical-waste result for now,
    and it is structured so a later YOLOv11 provider can replace the mock detector.
    """
    service = DetectionService()
    return await service.detect(file)


@router.post("/api/waste/detections", status_code=201)
async def persist_detection(payload: dict[str, Any], user: dict[str, Any] = Depends(get_current_user_from_request)) -> dict[str, Any]:
    category = str(payload.get("category") or "").upper()
    category_map = {"YELLOW", "RED", "WHITE", "BLUE"}
    if category not in category_map:
        raise HTTPException(status_code=422, detail="A valid waste category is required")
    repo = SupabaseRepository()
    facility = repo.get_facility_by_user_id(str(user.get("id")))
    if user.get("role") == "facility" and not facility:
        raise HTTPException(status_code=400, detail="No facility is associated with this user")
    waste = repo.insert_waste_record({
        "tracking_id": f"WM-{uuid4().hex[:12].upper()}",
        "facility_id": facility.get("id") if facility else None,
        "category": category,
        "quantity_kg": 0,
        "bin_recommended": payload.get("bin"),
        "reason": payload.get("reason") or payload.get("object"),
        "assessment_confidence": float(payload.get("confidence") or 0),
        "requires_human_verification": float(payload.get("confidence") or 0) < 0.7,
        "status": "Requested",
    })
    if waste.get("status") != "inserted" or not waste.get("data"):
        raise HTTPException(status_code=503 if waste.get("status") == "skipped" else 400, detail=waste.get("detail", "Detection could not be persisted"))
    record = waste["data"][0]
    classification = repo.insert_ai_classification({
        "waste_record_id": record.get("id"),
        "provider": "roboflow",
        "provider_model": "configured-detection-model",
        "predicted_category": category,
        "assessment_confidence": float(payload.get("confidence") or 0),
        "recommended_bin": str(payload.get("bin") or ""),
        "reason": str(payload.get("object") or ""),
        "requires_human_verification": float(payload.get("confidence") or 0) < 0.7,
    })
    if classification.get("status") != "inserted":
        raise HTTPException(status_code=400, detail=classification.get("detail", "Classification could not be persisted"))
    return record
