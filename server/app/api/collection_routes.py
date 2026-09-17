from __future__ import annotations

from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_current_user_from_request, require_roles
from app.schemas.operations import CollectionRequestCreate, StatusUpdate
from app.services.supabase_repository import SupabaseRepository

router = APIRouter(tags=["collection"])


def _facility_id(repo: SupabaseRepository, user: dict[str, Any]) -> str | None:
    facility = repo.get_facility_by_user_id(str(user.get("id")))
    return str(facility["id"]) if facility else None


@router.get("/collection-requests")
async def list_collection_requests(user: dict[str, Any] = Depends(get_current_user_from_request)) -> dict[str, Any]:
    repo = SupabaseRepository()
    return {"items": repo.list_collection_requests_for_user(user)}


@router.post("/collection-requests", status_code=status.HTTP_201_CREATED)
async def create_collection_request(payload: CollectionRequestCreate, user: dict[str, Any] = Depends(require_roles("facility", "administrator"))) -> dict[str, Any]:
    repo = SupabaseRepository()
    facility_id = _facility_id(repo, user)
    if not facility_id and user.get("role") != "administrator":
        raise HTTPException(status_code=400, detail="No facility is associated with this user")
    row = payload.model_dump(mode="json")
    row.update({
        "request_id": f"REQ-{uuid4().hex[:12].upper()}",
        "facility_id": facility_id,
        "status": "Requested",
    })
    result = repo.insert_collection_request(row)
    if result.get("status") != "inserted":
        raise HTTPException(status_code=503 if result.get("status") == "skipped" else 400, detail=result.get("detail", "Request could not be created"))
    return result["data"][0] if result.get("data") else row


@router.patch("/collection-requests/{request_id}/status")
async def update_collection_request_status(request_id: str, payload: StatusUpdate, user: dict[str, Any] = Depends(require_roles("facility", "collector", "administrator"))) -> dict[str, Any]:
    repo = SupabaseRepository()
    current = repo.get_collection_request(request_id)
    if not current:
        raise HTTPException(status_code=404, detail="Collection request not found")
    if user.get("role") == "facility" and current.get("facility_id") != _facility_id(repo, user):
        raise HTTPException(status_code=403, detail="Forbidden")
    collector = repo.get_collector_by_user_id(str(user.get("id"))) or {}
    if user.get("role") == "collector" and current.get("collector_id") != collector.get("id"):
        raise HTTPException(status_code=403, detail="Forbidden")
    result = repo.update_collection_request(request_id, {"status": payload.status})
    if result.get("status") != "updated":
        raise HTTPException(status_code=503 if result.get("status") == "skipped" else 400, detail=result.get("detail", "Status update failed"))
    return result["data"][0] if result.get("data") else {"request_id": request_id, "status": payload.status}
