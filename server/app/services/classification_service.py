from __future__ import annotations

from typing import Any

from app.core.config import settings
from app.services.ai_provider import GeminiProvider
from app.services.supabase_repository import SupabaseRepository


class ClassificationService:
    def __init__(self) -> None:
        self.repo = SupabaseRepository()

    async def classify_image(self, image_bytes: bytes, file_name: str | None = None) -> dict[str, Any]:
        if not image_bytes:
            raise ValueError("empty image bytes")
        provider = GeminiProvider(settings.GEMINI_API_KEY, settings.GEMINI_MODEL)
        return await provider.classify(image_bytes, file_name or "image")

    def store_classification(self, payload: dict[str, Any], record_id: str | None = None) -> dict[str, Any]:
        row = {
            "waste_record_id": record_id,
            "provider": "gemini",
            "provider_model": settings.GEMINI_MODEL,
            "predicted_category": payload.get("predicted_category"),
            "assessment_confidence": payload.get("assessment_confidence"),
            "recommended_bin": payload.get("recommended_bin"),
            "reason": payload.get("reason"),
            "requires_human_verification": bool(payload.get("requires_human_verification")),
        }
        return self.repo.insert_waste_record({
            "tracking_id": "WM-auto-generated",
            "category": payload.get("predicted_category"),
            "quantity_kg": 0,
            "priority": "Normal",
            "recommended_bin": payload.get("recommended_bin"),
            "reason": payload.get("reason"),
            "assessment_confidence": payload.get("assessment_confidence"),
            "requires_human_verification": bool(payload.get("requires_human_verification")),
            "status": "Requested",
        })
