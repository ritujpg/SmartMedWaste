from __future__ import annotations

import base64
import binascii
from typing import Any

from fastapi import APIRouter, HTTPException, UploadFile, File, status

from app.core.config import settings
from app.services.ai_provider import GeminiProvider
from app.services.classification_service import ClassificationService

router = APIRouter(prefix="/api", tags=["waste"])


@router.post("/waste/classify")
async def classify_waste(file: UploadFile = File(...)) -> dict[str, Any]:
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

    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY is not configured")

    provider = GeminiProvider(settings.GEMINI_API_KEY, settings.GEMINI_MODEL)
    try:
        return await provider.classify(contents, file.filename)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini classification failed: {exc}") from exc
