from io import BytesIO

import pytest
from fastapi import HTTPException, UploadFile
from PIL import Image

from app.services import local_classifier


def test_bundled_model_exposes_verified_class_names():
    names = local_classifier.LocalClassificationService.class_names()

    assert len(names) == 23
    assert names[0] == "ampoules_full"
    assert names[20] == "used_syringes"


def test_invalid_image_is_rejected():
    with pytest.raises(HTTPException) as error:
        local_classifier.LocalClassificationService.classify(b"not-an-image")

    assert error.value.status_code == 400


def test_classification_does_not_assign_a_bin(monkeypatch):
    class FakeProbabilities:
        top5 = [20, 2]
        top5conf = [0.95, 0.03]

    class FakeResult:
        probs = FakeProbabilities()

    class FakeModel:
        task = "classify"
        names = {20: "used_syringes", 2: "blood_soaked_bandages"}

        def predict(self, **kwargs):
            return [FakeResult()]

    monkeypatch.setattr(local_classifier.LocalClassificationService, "_model", FakeModel())
    image_buffer = BytesIO()
    Image.new("RGB", (2, 2), "white").save(image_buffer, format="PNG")
    result = local_classifier.LocalClassificationService.classify(image_buffer.getvalue())

    assert result["predicted_class"] == "used_syringes"
    assert result["confidence"] == 0.95
    assert result["recommended_bin"] is None
    assert result["bin_mapping_verified"] is False


@pytest.mark.asyncio
async def test_classification_endpoint_selects_local_model(monkeypatch):
    from app.api.waste_routes import classify_waste

    captured = {}

    def fake_classify(image_bytes):
        captured["image_bytes"] = image_bytes
        return {"model": "local-yolo11n-classification", "confidence": 0.9}

    monkeypatch.setattr(local_classifier.LocalClassificationService, "classify", fake_classify)
    image_buffer = BytesIO()
    Image.new("RGB", (2, 2), "white").save(image_buffer, format="JPEG")
    upload = UploadFile(filename="camera-frame.jpg", file=BytesIO(image_buffer.getvalue()))

    result = await classify_waste(upload, "local")

    assert result["model"] == "local-yolo11n-classification"
    assert captured["image_bytes"]


@pytest.mark.asyncio
async def test_classification_endpoint_rejects_invalid_image():
    from app.api.waste_routes import classify_waste

    upload = UploadFile(filename="camera-frame.jpg", file=BytesIO(b"invalid"))

    with pytest.raises(HTTPException) as error:
        await classify_waste(upload, "local")

    assert error.value.status_code == 400
