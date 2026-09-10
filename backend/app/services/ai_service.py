import json
import logging
from dataclasses import dataclass
from typing import Protocol

from app.core.config import get_settings
from app.utils.enums import WasteCategory
from pydantic import BaseModel, ConfigDict, Field, ValidationError

logger = logging.getLogger("smartmedwaste.ai")
SUPPORTED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
GEMINI_RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "predicted_category": {
            "type": "STRING",
            "enum": ["YELLOW", "RED", "WHITE", "BLUE"],
        },
        "assessment_confidence": {"type": "NUMBER"},
        "recommended_bin": {"type": "STRING"},
        "reason": {"type": "STRING"},
        "requires_human_verification": {"type": "BOOLEAN"},
    },
    "required": [
        "predicted_category",
        "assessment_confidence",
        "recommended_bin",
        "reason",
        "requires_human_verification",
    ],
}


class AIServiceError(Exception):
    """Safe, client-facing classification failure without provider details."""


class AIConfigurationError(AIServiceError):
    pass


class AIProviderError(AIServiceError):
    pass


class InvalidAIResponseError(AIServiceError):
    pass


class InvalidImageError(AIServiceError):
    pass


class GeminiClassificationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    predicted_category: WasteCategory
    assessment_confidence: float = Field(ge=0, le=1)
    recommended_bin: str = Field(min_length=1, max_length=160)
    reason: str = Field(min_length=1, max_length=2000)
    requires_human_verification: bool


@dataclass
class ClassificationResult:
    predicted_category: WasteCategory
    assessment_confidence: float
    recommended_bin: str
    reason: str
    requires_human_verification: bool
    provider_name: str
    model_version: str | None = None


class WasteClassificationProvider(Protocol):
    name: str

    async def classify(self, image_bytes: bytes, mime_type: str) -> ClassificationResult:
        ...


class MockWasteClassificationProvider:
    name = "mock"

    async def classify(self, image_bytes: bytes, mime_type: str) -> ClassificationResult:
        confidence = 0.92 if image_bytes else 0.0
        return ClassificationResult(
            predicted_category=WasteCategory.YELLOW,
            assessment_confidence=confidence,
            recommended_bin="Yellow biomedical waste container",
            reason="Controlled development result; no image model was used.",
            requires_human_verification=confidence < get_settings().ai_confidence_threshold / 100,
            provider_name=self.name,
            model_version="mock-v1",
        )


class GeminiWasteClassificationProvider:
    name = "gemini"

    def __init__(self) -> None:
        settings = get_settings()
        if not settings.gemini_api_key:
            raise AIConfigurationError("Gemini classification is not configured")
        try:
            from google import genai
        except ImportError as exc:
            raise AIConfigurationError("Gemini classification dependency is not installed") from exc
        self.model = settings.gemini_model
        self.client = genai.Client(api_key=settings.gemini_api_key)

    async def classify(self, image_bytes: bytes, mime_type: str) -> ClassificationResult:
        from google.genai import types

        prompt = (
            "Classify the visible item in this image using only these application categories: "
            "YELLOW, RED, WHITE, or BLUE. Base the assessment on the visible item and the following "
            "application definitions: YELLOW is infectious or soiled waste; RED is contaminated recyclable "
            "plastic waste; WHITE is sharps; BLUE is glassware or metallic implants. Do not invent or cite "
            "medical regulations. If the image is ambiguous, obscured, contains multiple items, or cannot be "
            "confidently classified, set requires_human_verification to true and lower the assessment confidence. "
            "Return only JSON matching the requested schema."
        )
        try:
            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=[types.Part.from_bytes(data=image_bytes, mime_type=mime_type), prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=GEMINI_RESPONSE_SCHEMA,
                ),
            )
        except Exception as exc:
            settings = get_settings()
            provider_message = getattr(exc, "message", str(exc))
            if settings.gemini_api_key:
                provider_message = provider_message.replace(settings.gemini_api_key, "[REDACTED]")
            provider_message = " ".join(str(provider_message).split())[:500]
            status_code = getattr(exc, "code", getattr(exc, "status_code", "unknown"))
            logger.warning(
                "Gemini classification failed type=%s status=%s message=%s",
                type(exc).__name__,
                status_code,
                provider_message,
            )
            raise AIProviderError("Gemini classification is temporarily unavailable") from exc

        try:
            payload = response.text
            parsed = GeminiClassificationResponse.model_validate(json.loads(payload))
        except (AttributeError, TypeError, ValueError, json.JSONDecodeError, ValidationError) as exc:
            logger.warning("Gemini returned an invalid classification response: %s", type(exc).__name__)
            raise InvalidAIResponseError("Gemini returned an invalid classification response") from exc

        threshold = get_settings().ai_confidence_threshold / 100
        return ClassificationResult(
            predicted_category=parsed.predicted_category,
            assessment_confidence=parsed.assessment_confidence,
            recommended_bin=parsed.recommended_bin,
            reason=parsed.reason,
            requires_human_verification=parsed.requires_human_verification or parsed.assessment_confidence < threshold,
            provider_name=self.name,
            model_version=self.model,
        )


def get_classification_provider() -> WasteClassificationProvider:
    provider = get_settings().ai_provider.lower()
    if provider == "mock":
        return MockWasteClassificationProvider()
    if provider == "gemini":
        return GeminiWasteClassificationProvider()
    raise AIConfigurationError(f"Unsupported AI provider: {provider}")


class AIClassificationService:
    """Provider-independent façade for image validation and classification."""

    async def classify(self, image_bytes: bytes, mime_type: str) -> ClassificationResult:
        settings = get_settings()
        if not image_bytes:
            raise InvalidImageError("Image is required and cannot be empty")
        if mime_type not in SUPPORTED_IMAGE_TYPES:
            raise InvalidImageError("Unsupported image type; use JPEG, PNG, or WebP")
        if len(image_bytes) > settings.ai_max_image_size_bytes:
            raise InvalidImageError("Image exceeds the maximum allowed size")
        provider = get_classification_provider()
        logger.info("AI classification requested with provider=%s", provider.name)
        result = await provider.classify(image_bytes, mime_type)
        logger.info("AI classification completed with provider=%s", provider.name)
        return result
