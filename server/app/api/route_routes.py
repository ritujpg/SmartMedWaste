from __future__ import annotations

from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import require_roles
from app.schemas.operations import RouteCreate, RouteStatusUpdate
from app.services.supabase_repository import SupabaseRepository

router = APIRouter(tags=["routes"])


@router.get("/routes")
async def list_routes(user: dict[str, Any] = Depends(require_roles("collector", "administrator"))) -> dict[str, Any]:
    repo = SupabaseRepository()
    collector = repo.get_collector_by_user_id(str(user.get("id")))
    return {"items": repo.list_routes_for_collector(str(collector["id"])) if collector and user.get("role") == "collector" else repo._rows("routes")}


@router.post("/routes", status_code=status.HTTP_201_CREATED)
async def create_route(payload: RouteCreate, user: dict[str, Any] = Depends(require_roles("collector", "administrator"))) -> dict[str, Any]:
    repo = SupabaseRepository()
    collector = repo.get_collector_by_user_id(str(user.get("id")))
    route = repo.insert_route({"name": payload.name, "vehicle": payload.vehicle, "collector_id": collector.get("id") if collector else None, "status": "planned"})
    if route.get("status") != "inserted" or not route.get("data"):
        raise HTTPException(status_code=503 if route.get("status") == "skipped" else 400, detail=route.get("detail", "Route could not be created"))
    route_row = route["data"][0]
    stops = repo.insert_route_stops([{"route_id": route_row["id"], "request_id": request_id, "stop_order": index + 1, "status": "pending"} for index, request_id in enumerate(payload.request_ids)])
    if stops.get("status") not in {"inserted", "skipped"}:
        raise HTTPException(status_code=400, detail=stops.get("detail", "Route stops could not be created"))
    return route_row


@router.patch("/routes/{route_id}/status")
async def update_route_status(route_id: str, payload: RouteStatusUpdate, user: dict[str, Any] = Depends(require_roles("collector", "administrator"))) -> dict[str, Any]:
    repo = SupabaseRepository()
    result = repo.update_route(route_id, {"status": payload.status})
    if result.get("status") != "updated":
        raise HTTPException(status_code=503 if result.get("status") == "skipped" else 400, detail=result.get("detail", "Route could not be updated"))
    return result["data"][0] if result.get("data") else {"id": route_id, "status": payload.status}
