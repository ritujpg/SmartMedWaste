import pytest

from app.core.config import get_settings
from app.services.ai_service import (AIConfigurationError, AIClassificationService,
                                     GeminiClassificationResponse, GeminiWasteClassificationProvider,
                                     GEMINI_RESPONSE_SCHEMA,
                                     InvalidAIResponseError,
                                     InvalidImageError, MockWasteClassificationProvider,
                                     get_classification_provider)
from app.utils.enums import WasteCategory


@pytest.fixture(autouse=True)
def use_mock_provider_for_unit_tests(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "mock")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_mock_provider_returns_structured_deterministic_result():
    result = await AIClassificationService().classify(b"image", "image/png")
    assert result.provider_name == "mock"
    assert result.predicted_category == WasteCategory.YELLOW
    assert result.assessment_confidence == 0.92
    assert result.requires_human_verification is False


@pytest.mark.asyncio
async def test_image_validation_rejects_empty_unsupported_and_oversized(monkeypatch):
    with pytest.raises(InvalidImageError):
        await AIClassificationService().classify(b"", "image/png")
    with pytest.raises(InvalidImageError):
        await AIClassificationService().classify(b"image", "application/pdf")
    monkeypatch.setenv("AI_MAX_IMAGE_SIZE_BYTES", "2")
    get_settings.cache_clear()
    with pytest.raises(InvalidImageError):
        await AIClassificationService().classify(b"image", "image/png")
    monkeypatch.delenv("AI_MAX_IMAGE_SIZE_BYTES", raising=False)
    get_settings.cache_clear()


def test_structured_response_schema_rejects_invalid_model_output():
    valid = GeminiClassificationResponse(
        predicted_category=WasteCategory.BLUE,
        assessment_confidence=0.81,
        recommended_bin="Blue biomedical container",
        reason="Visible glass item",
        requires_human_verification=False,
    )
    assert valid.predicted_category == WasteCategory.BLUE
    with pytest.raises(ValueError):
        GeminiClassificationResponse.model_validate({
            "predicted_category": "ORANGE",
            "assessment_confidence": 1.4,
            "recommended_bin": "x",
            "reason": "bad",
            "requires_human_verification": False,
        })


def test_gemini_provider_requires_configuration(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "gemini")
    get_settings.cache_clear()
    monkeypatch.setattr(get_settings(), "gemini_api_key", None)
    with pytest.raises(AIConfigurationError):
        get_classification_provider()
    monkeypatch.setenv("AI_PROVIDER", "mock")
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_gemini_provider_parses_fake_structured_response(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    get_settings.cache_clear()
    provider = GeminiWasteClassificationProvider.__new__(GeminiWasteClassificationProvider)
    provider.model = "test-model"

    class FakeModels:
        async def generate_content(self, **kwargs):
            assert kwargs["model"] == "test-model"
            assert kwargs["contents"][0].inline_data.mime_type == "image/png"
            assert kwargs["config"].response_schema == GEMINI_RESPONSE_SCHEMA
            assert "additionalProperties" not in kwargs["config"].response_schema
            return type("Response", (), {"text": '{"predicted_category":"BLUE","assessment_confidence":0.81,"recommended_bin":"Blue container","reason":"Visible glass","requires_human_verification":false}'})()

    provider.client = type("Client", (), {"aio": type("Aio", (), {"models": FakeModels()})()})()
    result = await provider.classify(b"png-bytes", "image/png")
    assert result.predicted_category == WasteCategory.BLUE
    assert result.assessment_confidence == 0.81
    assert result.requires_human_verification is False
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    get_settings.cache_clear()
