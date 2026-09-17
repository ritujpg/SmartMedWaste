from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from app.core.dependencies import require_roles
from app.services.supabase_repository import SupabaseRepository

router = APIRouter(tags=["admin"])


@router.get("/admin/dashboard")
async def admin_dashboard(user: dict[str, Any] = Depends(require_roles("administrator"))) -> dict[str, Any]:
    return SupabaseRepository().list_admin_dashboard()


@router.get("/admin/facilities")
async def admin_facilities(user: dict[str, Any] = Depends(require_roles("administrator"))) -> dict[str, Any]:
    return {"items": SupabaseRepository().list_facilities()}


@router.get("/admin/collectors")
async def admin_collectors(user: dict[str, Any] = Depends(require_roles("administrator"))) -> dict[str, Any]:
    return {"items": SupabaseRepository().list_collectors()}


@router.get("/admin/users")
async def admin_users(user: dict[str, Any] = Depends(require_roles("administrator"))) -> dict[str, Any]:
    return {"items": SupabaseRepository().query_users()}
