from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile

from app.core.config import settings
from app.core.dependencies import require_roles, get_current_user_from_request
from app.services.detection import DetectionService
from app.services.local_classifier import LocalClassificationService
from app.services.robot_integration import robot_integration

router = APIRouter(tags=["robot"])


def require_robot_device(x_robot_key: str | None = Header(default=None)) -> None:
    if not settings.ROBOT_API_KEY:
        raise HTTPException(status_code=503, detail="Robot integration is not configured")
    if x_robot_key != settings.ROBOT_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid robot device key")


@router.get("/robot/status")
async def robot_status(user: dict[str, Any] = Depends(get_current_user_from_request)) -> dict[str, Any]:
    return robot_integration.snapshot()


@router.post("/robot/authorize")
async def authorize_robot(payload: dict[str, str], user: dict[str, Any] = Depends(require_roles("facility", "administrator"))) -> dict[str, Any]:
    try:
        return robot_integration.authorize(str(payload.get("robot_id") or "robot-1"))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/robot/disarm")
async def disarm_robot(user: dict[str, Any] = Depends(require_roles("facility", "administrator"))) -> dict[str, Any]:
    return robot_integration.disarm()


@router.post("/robot/emergency-stop")
async def emergency_stop_robot(user: dict[str, Any] = Depends(require_roles("facility", "administrator"))) -> dict[str, Any]:
    return robot_integration.emergency_stop()


@router.post("/robot/heartbeat")
async def robot_heartbeat(
    payload: dict[str, Any],
    _: None = Depends(require_robot_device),
) -> dict[str, Any]:
    try:
        return robot_integration.heartbeat(
            str(payload.get("robot_id") or ""),
            bool(payload.get("scanning")),
            str(payload["mission_id"]) if payload.get("mission_id") else None,
        )
    except (PermissionError, ValueError) as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/robot/mission/start")
async def robot_mission_start(
    payload: dict[str, Any],
    _: None = Depends(require_robot_device),
) -> dict[str, Any]:
    try:
        return robot_integration.heartbeat(
            str(payload.get("robot_id") or ""),
            True,
            str(payload.get("mission_id") or "") or None,
        )
    except (PermissionError, ValueError) as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/robot/mission/stop")
async def robot_mission_stop(
    payload: dict[str, Any],
    _: None = Depends(require_robot_device),
) -> dict[str, Any]:
    try:
        return robot_integration.heartbeat(
            str(payload.get("robot_id") or ""),
            False,
            None,
        )
    except (PermissionError, ValueError) as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/robot/scan/result")
async def robot_scan_result(
    payload: dict[str, Any],
    _: None = Depends(require_robot_device),
) -> dict[str, Any]:
    result = dict(payload.get("result") or {})
    if not result:
        raise HTTPException(status_code=400, detail="result is required")
    try:
        return robot_integration.record_result(
            str(payload.get("robot_id") or ""),
            result,
            str(payload["mission_id"]) if payload.get("mission_id") else None,
        )
    except (PermissionError, ValueError) as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/robot/scan/frame")
async def robot_scan_frame(
    file: UploadFile = File(...),
    robot_id: str = "robot-1",
    mission_id: str | None = None,
    _: None = Depends(require_robot_device),
) -> dict[str, Any]:
    try:
        if settings.AI_SCANNER_MODE == "classify":
            result = LocalClassificationService.classify(await file.read())
        else:
            result = await DetectionService().detect(file)
        return robot_integration.record_result(robot_id, result, mission_id)
    except (PermissionError, ValueError) as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except Exception as exc:
        robot_integration.record_error(str(exc))
        raise HTTPException(status_code=502, detail="Robot frame processing failed") from exc