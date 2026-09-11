from abc import ABC, abstractmethod
from typing import Any

from fastapi import HTTPException


class AIClassificationProvider(ABC):
    @abstractmethod
    async def classify(self, image_bytes: bytes, file_name: str | None = None) -> dict[str, Any]:
        """Return a response schema that follows the client UI’s requested contract."""
        raise NotImplementedError


class GeminiProvider(AIClassificationProvider):
    def __init__(self, api_key: str, model: str = "gemini-3.6-flash"):
        self.api_key = api_key
        self.model = model

    async def classify(self, image_bytes: bytes, file_name: str | None = None) -> dict[str, Any]:
        if not self.api_key:
            raise HTTPException(status_code=503, detail="GEMINI_API_KEY is not configured")

        try:
            from google import genai
            from google.genai import types
        except Exception as exc:
            raise HTTPException(status_code=503, detail=f"Gemini SDK unavailable: {exc}") from exc

        try:
            client = genai.Client(api_key=self.api_key)
            mime_type = self._mime_for_file(file_name or "image")
            response = client.models.generate_content(
                model=self.model,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    "Classify this healthcare waste image as YELLOW, RED, WHITE, or BLUE. Return a JSON object with keys predicted_category, assessment_confidence, recommended_bin, reason, requires_human_verification. predicted_category must be one of YELLOW, RED, WHITE, BLUE. Use assessment_confidence as a numeric 0-1 value. If confidence is low, requires_human_verification must be true."
                ],
            )
            text = getattr(response, "text", None)
            if not text:
                # Some SDK versions expose text in candidates.
                if hasattr(response, "candidates"):
                    candidates = response.candidates
                    if candidates:
                        top = candidates[0]
                        text = getattr(top, "text", None)
            if not text:
                raise HTTPException(status_code=502, detail="Gemini returned no usable text")
            parsed = self._parse_text_response(text)
            return parsed
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Gemini request failed: {exc}") from exc

    def _mime_for_file(self, file_name: str) -> str:
        low = (file_name or "").lower()
        if low.endswith(".jpeg") or low.endswith(".jpg"):
            return "image/jpeg"
        if low.endswith(".png"):
            return "image/png"
        if low.endswith(".webp"):
            return "image/webp"
        return "application/octet-stream"

    def _parse_text_response(self, text: str) -> dict[str, Any]:
        import json
        import re

        # Keep parsing permissive and error grounded: surface failure if the model cannot provide the contract.
        cleaned = text.strip()
        match = re.search(r"\{.*\}", cleaned, re.S)
        if match:
            cleaned = match.group(0)
        try:
            payload = json.loads(cleaned)
        except Exception:
            # Return a safe structure when Gemini collapsed into text. Do not fake a category.
            raise HTTPException(status_code=502, detail="Gemini response did not parse as structured JSON")

        allowed_categories = {"YELLOW", "RED", "WHITE", "BLUE"}
        predicted = str(payload.get("predicted_category", "")).upper()
        if predicted not in allowed_categories:
            raise HTTPException(status_code=502, detail="Gemini returned an unsupported waste category")
        confidence = float(payload.get("assessment_confidence", 0.0))
        if confidence < 0 or confidence > 1:
            raise HTTPException(status_code=502, detail="Gemini confidence is outside 0-1")
        requires_human_verification = bool(payload.get("requires_human_verification", confidence < 0.7))
        return {
            "predicted_category": predicted,
            "assessment_confidence": confidence,
            "recommended_bin": str(payload.get("recommended_bin", "")),
            "reason": str(payload.get("reason", "")),
            "requires_human_verification": requires_human_verification,
        }
