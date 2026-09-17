from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user_from_request, require_roles
from app.services.supabase_repository import SupabaseRepository

router = APIRouter(tags=["compliance"])


@router.get("/compliance")
async def compliance_index(user: dict[str, Any] = Depends(get_current_user_from_request)) -> dict[str, Any]:
    repo = SupabaseRepository()
    facility_id = None
    if user.get("role") == "facility":
        facility = repo.get_facility_by_user_id(str(user.get("id")))
        facility_id = facility.get("id") if facility else None
    records = repo.list_compliance_records_for_facility(facility_id)
    latest = records[0] if records else {}
    return {"overall_score": latest.get("score"), "status": latest.get("status"), "issues": latest.get("issues", []), "records": records}


@router.get("/compliance/{facility_id}")
async def compliance_by_facility(facility_id: str, user: dict[str, Any] = Depends(require_roles("facility", "administrator"))) -> dict[str, Any]:
    records = SupabaseRepository().list_compliance_records_for_facility(facility_id)
    latest = records[0] if records else {}
    return {"facility_id": facility_id, "score": latest.get("score"), "status": latest.get("status"), "issues": latest.get("issues", [])}
