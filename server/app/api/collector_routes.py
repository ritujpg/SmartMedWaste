from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from app.core.dependencies import require_roles
from app.services.supabase_repository import SupabaseRepository

router = APIRouter(tags=["collector"])


@router.get("/collector/dashboard")
async def collector_dashboard(user: dict[str, Any] = Depends(require_roles("collector", "administrator"))) -> dict[str, Any]:
    repo = SupabaseRepository()
    collector = repo.get_collector_by_user_id(str(user.get("id")))
    assignments = repo.list_collection_requests_for_user(user) if user.get("role") == "collector" else []
    return {"collector_id": collector.get("id") if collector else None, "name": user.get("name"), "assigned_pickups": len(assignments), "today_pickups": len(assignments), "route_status": collector.get("status") if collector else "available"}


@router.get("/collector/assignments")
async def collector_assignments(user: dict[str, Any] = Depends(require_roles("collector", "administrator"))) -> dict[str, Any]:
    return {"items": SupabaseRepository().list_collection_requests_for_user(user)}


@router.get("/collector/routes")
async def collector_routes(user: dict[str, Any] = Depends(require_roles("collector", "administrator"))) -> dict[str, Any]:
    repo = SupabaseRepository()
    collector = repo.get_collector_by_user_id(str(user.get("id")))
    return {"items": repo.list_routes_for_collector(str(collector["id"])) if collector else []}
