from __future__ import annotations

from typing import Any

from fastapi import APIRouter, File, UploadFile

from app.services.detection import DetectionService

router = APIRouter(tags=["detection"])


@router.post("/detect")
async def detect(file: UploadFile = File(...)) -> dict[str, Any]:
    """Receive the current phone-camera frame as multipart/form-data and hand it
    to the detection service. The service returns a mock medical-waste result for now,
    and it is structured so a later YOLOv11 provider can replace the mock detector.
    """
    service = DetectionService()
    return await service.detect(file)
