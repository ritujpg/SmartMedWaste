from __future__ import annotations

import base64
import os
from typing import Any

import httpx
from fastapi import UploadFile


class DetectionService:
    """Real-time medical-waste detection using Roboflow."""

    OBJECT_CATEGORY_MAP = {
        "Syringe": ("Sharps", "Syringe", "White"),
        "Glove": ("Contaminated Plastic", "Glove", "Red"),
        "Mask": ("Contaminated Waste", "Mask", "Red"),
        "Cotton_Bandage": (
            "Soiled/Infectious Waste",
            "Cotton/Bandage",
            "Yellow",
        ),
        "Cotton/Bandage": (
            "Soiled/Infectious Waste",
            "Cotton/Bandage",
            "Yellow",
        ),
        "IV_Bottle": ("Contaminated Plastic", "IV Bottle", "Red"),
        "IV Bottle": ("Contaminated Plastic", "IV Bottle", "Red"),
        "Pill_Strip": ("Pharmaceutical Waste", "Pill Strip", "Yellow"),
        "Pill Strip": ("Pharmaceutical Waste", "Pill Strip", "Yellow"),
    }

    def __init__(self) -> None:
        self.api_key = os.getenv("ROBOFLOW_API_KEY", "")
        self.model = os.getenv(
            "ROBOFLOW_MODEL",
            "medical-waste-yolo-r9iko/1",
        )

    async def detect(
        self,
        file: UploadFile | None = None,
    ) -> dict[str, Any]:

        if file is None:
            return self._no_detection()

        if not self.api_key:
            raise RuntimeError(
                "ROBOFLOW_API_KEY is missing from .env"
            )

        image_bytes = await file.read()

        if not image_bytes:
            return self._no_detection()

        # Convert the camera image to base64.
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")

        # Roboflow expects the base64 image in the request body.
        url = (
            f"https://serverless.roboflow.com/"
            f"{self.model}"
            f"?api_key={self.api_key}"
        )

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                data=image_base64,
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            )

        if response.status_code != 200:
            raise RuntimeError(
                f"Roboflow inference failed "
                f"({response.status_code}): {response.text}"
            )

        result = response.json()

        predictions = result.get("predictions", [])

        if not predictions:
            return self._no_detection()

        # Select the highest-confidence detection.
        prediction = max(
            predictions,
            key=lambda item: float(
                item.get("confidence", 0)
            ),
        )

        object_name = str(
            prediction.get("class", "Unknown")
        )

        confidence = float(
            prediction.get("confidence", 0)
        )

        category, subcategory, bin_name = (
            self.OBJECT_CATEGORY_MAP.get(
                object_name,
                (
                    "Unclassified",
                    object_name,
                    "Unknown",
                ),
            )
        )

        # Roboflow gives center x/y plus width/height.
        x_center = float(
            prediction.get("x", 0)
        )
        y_center = float(
            prediction.get("y", 0)
        )
        width = float(
            prediction.get("width", 0)
        )
        height = float(
            prediction.get("height", 0)
        )

        return {
            "object": object_name,
            "category": category,
            "subcategory": subcategory,
            "bin": bin_name,
            "confidence": round(
                confidence,
                2,
            ),
            "box": {
                "x": round(
                    x_center - width / 2,
                    2,
                ),
                "y": round(
                    y_center - height / 2,
                    2,
                ),
                "width": round(width, 2),
                "height": round(height, 2),
            },
        }

    @staticmethod
    def _no_detection() -> dict[str, Any]:
        return {
            "object": None,
            "category": None,
            "subcategory": None,
            "bin": None,
            "confidence": 0.0,
            "box": None,
            "message": "No medical waste detected",
        }