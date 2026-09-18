from __future__ import annotations

import os
from io import BytesIO
from pathlib import Path
from typing import Any

from fastapi import HTTPException
from PIL import Image, UnidentifiedImageError


MODEL_PATH = Path(
    os.getenv("LOCAL_CLASSIFIER_MODEL_PATH", "")
    or Path(__file__).resolve().parents[2] / "ml" / "models" / "best.pt"
)
LOW_CONFIDENCE_THRESHOLD = 0.7


class LocalClassificationService:
    _model: Any = None

    @classmethod
    def _load_model(cls) -> Any:
        if cls._model is not None:
            return cls._model
        if not MODEL_PATH.is_file():
            raise HTTPException(status_code=503, detail="Local classification model is unavailable")
        try:
            from ultralytics import YOLO

            model = YOLO(str(MODEL_PATH))
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Local classification model could not be loaded") from exc
        if model.task != "classify":
            raise HTTPException(status_code=503, detail="Configured local model is not a classification model")
        cls._model = model
        return model

    @classmethod
    def class_names(cls) -> list[str]:
        model = cls._load_model()
        return [str(model.names[index]) for index in sorted(model.names)]

    @classmethod
    def classify(cls, image_bytes: bytes) -> dict[str, Any]:
        if not image_bytes:
            raise HTTPException(status_code=400, detail="empty image payload")
        try:
            image = Image.open(BytesIO(image_bytes)).convert("RGB")
        except (UnidentifiedImageError, OSError) as exc:
            raise HTTPException(status_code=400, detail="uploaded file is not a valid image") from exc

        model = cls._load_model()
        try:
            result = model.predict(source=image, verbose=False)[0]
            probabilities = result.probs
            top_indices = [int(index) for index in probabilities.top5]
            top_confidences = [float(value) for value in probabilities.top5conf]
        except Exception as exc:
            raise HTTPException(status_code=502, detail="Local classification inference failed") from exc
        if not top_indices:
            raise HTTPException(status_code=502, detail="Local classifier returned no predictions")

        top_predictions = [
            {
                "class_name": str(model.names[index]),
                "confidence": round(confidence, 4),
            }
            for index, confidence in zip(top_indices, top_confidences)
        ]
        confidence = top_predictions[0]["confidence"]
        return {
            "model": "local-yolo11n-classification",
            "predicted_class": top_predictions[0]["class_name"],
            "confidence": confidence,
            "top_predictions": top_predictions,
            "requires_human_verification": confidence < LOW_CONFIDENCE_THRESHOLD,
            "recommended_bin": None,
            "bin_mapping_verified": False,
        }