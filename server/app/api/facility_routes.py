from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import require_roles
from app.services.supabase_repository import SupabaseRepository

router = APIRouter(tags=["facility"])


@router.get("/facilities")
async def list_facilities(user: dict[str, Any] = Depends(require_roles("facility", "administrator"))) -> dict[str, Any]:
    repo = SupabaseRepository()
    if user.get("role") == "facility":
        facility = repo.get_facility_by_user_id(str(user.get("id")))
        return {"items": [facility] if facility else []}
    return {"items": repo.list_facilities()}


@router.get("/facilities/{facility_id}/dashboard")
async def facility_dashboard(facility_id: str, user: dict[str, Any] = Depends(require_roles("facility", "administrator"))) -> dict[str, Any]:
    repo = SupabaseRepository()
    if user.get("role") == "facility" and not (repo.get_facility_by_user_id(str(user.get("id"))) or {}).get("id") == facility_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    facility = repo._single("facilities", "id", facility_id)
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    return repo.get_facility_dashboard(facility_id)
