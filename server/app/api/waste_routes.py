from __future__ import annotations

from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Body, Form

from app.core.config import settings
from app.core.dependencies import get_current_user_from_request, require_roles
from app.services.ai_provider import GeminiProvider
from app.services.local_classifier import LocalClassificationService
from app.services.supabase_repository import SupabaseRepository
from app.schemas.waste import WasteCreateRequest

router = APIRouter(tags=["waste"])


@router.post("/waste")
async def create_waste(payload: WasteCreateRequest = Body(...), user: dict[str, Any] = Depends(require_roles("facility", "administrator"))) -> dict[str, Any]:
    repo = SupabaseRepository()
    facility = repo.get_facility_by_user_id(str(user.get("id")))
    if not facility:
        raise HTTPException(status_code=409, detail="Authenticated facility profile is not provisioned")
    tracking_id = f"WM-{uuid4().hex[:12].upper()}"
    row = {
        "tracking_id": tracking_id,
        "category": payload.category,
        "quantity_kg": payload.quantity_kg,
        "requires_human_verification": payload.requires_human_verification,
        "image_url": payload.image_url,
        "status": payload.status,
        "facility_id": facility.get("id") if facility else None,
    }
    result = repo.insert_waste_record(row)
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("detail", "waste insert failed"))
    if result.get("status") == "skipped":
        raise HTTPException(status_code=503, detail=result.get("detail", "Supabase is not configured"))
    rows = result.get("data") or []
    if rows:
        return rows[0]
    return {"status": "inserted", "tracking_id": tracking_id}


@router.get("/waste/{waste_id}")
async def get_waste_record(waste_id: str, user: dict[str, Any] = Depends(get_current_user_from_request)) -> dict[str, Any]:
    repo = SupabaseRepository()
    row = repo.get_waste_record_by_id(waste_id)
    if not row:
        raise HTTPException(status_code=404, detail="Waste record not found")
    if user.get("role") == "facility":
        facility = repo.get_facility_by_user_id(str(user.get("id")))
        if not facility or row.get("facility_id") != facility.get("id"):
            raise HTTPException(status_code=403, detail="Forbidden")
    return row


@router.delete("/waste/{waste_id}")
async def delete_waste_record(waste_id: str, user: dict[str, Any] = Depends(require_roles("facility", "administrator"))) -> dict[str, Any]:
    repo = SupabaseRepository()
    result = repo.delete_waste_record_by_id(waste_id)
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("detail", "waste delete failed"))
    if result.get("status") == "skipped":
        raise HTTPException(status_code=503, detail=result.get("detail", "Supabase is not configured"))
    return {"status": "deleted", "id": waste_id}


@router.post("/waste/classify")
async def classify_waste(file: UploadFile = File(...), model: str = Form("gemini")) -> dict[str, Any]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="image file is required")
    lower = file.filename.lower()
    if not (lower.endswith(".jpg") or lower.endswith(".jpeg") or lower.endswith(".png") or lower.endswith(".webp")):
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WebP images are supported")
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="empty image payload")
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="maximum image size is 10MB")

    if model == "local":
        return LocalClassificationService.classify(contents)
    if model != "gemini":
        raise HTTPException(status_code=400, detail="model must be either 'gemini' or 'local'")
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY is not configured")

    provider = GeminiProvider(settings.GEMINI_API_KEY, settings.GEMINI_MODEL)
    try:
        return await provider.classify(contents, file.filename)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini classification failed: {exc}") from exc
