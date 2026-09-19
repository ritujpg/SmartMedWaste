from __future__ import annotations

import os
import logging
from io import BytesIO
from pathlib import Path
from typing import Any

from fastapi import HTTPException
from PIL import Image, UnidentifiedImageError

from app.core.config import settings


MODEL_PATH = Path(
    os.getenv("LOCAL_CLASSIFIER_MODEL_PATH", "")
    or Path(__file__).resolve().parents[2] / "ml" / "models" / "best.pt"
)
logger = logging.getLogger(__name__)
DEFAULT_INPUT_SIZE = 224


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
        names = model.names
        if isinstance(names, dict):
            names_by_index = {int(index): name for index, name in names.items()}
            indices = sorted(names_by_index)
            if indices != list(range(len(indices))):
                raise HTTPException(status_code=503, detail="Local model class indices are not contiguous")
            return [str(names_by_index[index]) for index in indices]
        if isinstance(names, (list, tuple)):
            return [str(name) for name in names]
        raise HTTPException(status_code=503, detail="Local model class names are unavailable")

    @classmethod
    def _class_name(cls, model: Any, index: int) -> str:
        names = model.names
        if isinstance(names, dict):
            for name_index, name in names.items():
                if int(name_index) == index:
                    return str(name)
            raise HTTPException(status_code=503, detail=f"Local model class index {index} is unavailable")
        return str(names[index])

    @staticmethod
    def _input_size(model: Any) -> int:
        model_args = getattr(getattr(model, "model", None), "args", {})
        configured_size = model_args.get("imgsz") if isinstance(model_args, dict) else getattr(model_args, "imgsz", None)
        if isinstance(configured_size, (list, tuple)):
            configured_size = configured_size[0]
        if isinstance(configured_size, (int, float)) and configured_size > 0:
            return int(configured_size)
        return DEFAULT_INPUT_SIZE

    @classmethod
    def classify(cls, image_bytes: bytes) -> dict[str, Any]:
        if not image_bytes:
            raise HTTPException(status_code=400, detail="empty image payload")
        try:
            image = Image.open(BytesIO(image_bytes)).convert("RGB")
        except (UnidentifiedImageError, OSError) as exc:
            raise HTTPException(status_code=400, detail="uploaded file is not a valid image") from exc

        model = cls._load_model()
        input_size = cls._input_size(model)
        try:
            result = model.predict(source=image, imgsz=input_size, verbose=False)[0]
            probabilities = result.probs
            top_indices = [int(index) for index in probabilities.top5]
            top_confidences = [float(value) for value in probabilities.top5conf]
        except Exception as exc:
            raise HTTPException(status_code=502, detail="Local classification inference failed") from exc
        if not top_indices:
            raise HTTPException(status_code=502, detail="Local classifier returned no predictions")

        top_predictions = [
            {
                "class_name": cls._class_name(model, index),
                "confidence": round(confidence, 4),
            }
            for index, confidence in zip(top_indices, top_confidences)
        ]
        confidence = top_predictions[0]["confidence"]
        predicted_class = top_predictions[0]["class_name"]
        is_confident = confidence >= settings.LOCAL_CLASSIFIER_CONFIDENCE_THRESHOLD
        logger.info(
            "Local classifier prediction: class=%s confidence=%.4f threshold=%.4f input_size=%d",
            predicted_class,
            confidence,
            settings.LOCAL_CLASSIFIER_CONFIDENCE_THRESHOLD,
            input_size,
        )
        return {
            "model": "local-yolo11n-classification",
            "predicted_class": predicted_class,
            "confidence": confidence,
            "top_predictions": top_predictions,
            "confidence_threshold": settings.LOCAL_CLASSIFIER_CONFIDENCE_THRESHOLD,
            "is_confident": is_confident,
            "requires_human_verification": not is_confident,
            "recommended_bin": None,
            "bin_mapping_verified": False,
        }