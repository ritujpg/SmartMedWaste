from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user_from_request
from app.services.supabase_repository import SupabaseRepository

router = APIRouter(tags=["green_credits"])


@router.get("/green-credits")
async def green_credits(user: dict[str, Any] = Depends(get_current_user_from_request)) -> dict[str, Any]:
    repo = SupabaseRepository()
    facility = repo.get_facility_by_user_id(str(user.get("id")))
    rows = repo.list_green_credit_transactions(facility.get("id") if facility else None)
    balance = sum((1 if str(row.get("type", "earned")) == "earned" else -1) * int(row.get("points") or 0) for row in rows)
    month_earned = sum(int(row.get("points") or 0) for row in rows if str(row.get("type", "earned")) == "earned")
    return {"current_balance": balance, "month_earned": month_earned, "history": rows}
