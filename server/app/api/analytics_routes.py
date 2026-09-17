from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user_from_request
from app.services.supabase_repository import SupabaseRepository

router = APIRouter(tags=["analytics"])


@router.get("/analytics")
async def analytics_index(user: dict[str, Any] = Depends(get_current_user_from_request)) -> dict[str, Any]:
    repo = SupabaseRepository()
    records = repo.list_waste_records()
    requests = repo.list_collection_requests_for_user(user)
    total = sum(float(row.get("quantity_kg") or 0) for row in records)
    by_category = Counter(str(row.get("category") or "UNKNOWN") for row in records)
    by_status = Counter(str(row.get("status") or "UNKNOWN") for row in requests)
    processed = sum(float(row.get("quantity_kg") or 0) for row in records if row.get("status") in {"Processed", "Delivered"})
    daily = defaultdict(float)
    today = datetime.now(timezone.utc).date()
    for row in records:
        created = str(row.get("created_at") or "")[:10]
        try:
            daily[created] += float(row.get("quantity_kg") or 0)
        except ValueError:
            continue
    trend = [{"day": (today - timedelta(days=offset)).strftime("%a"), "value": daily.get((today - timedelta(days=offset)).isoformat(), 0)} for offset in range(6, -1, -1)]
    return {
        "total_waste_kg": total,
        "waste_by_category": dict(by_category),
        "collection_status": dict(by_status),
        "processed_waste_kg": processed,
        "pending_collections": sum(1 for row in requests if row.get("status") not in {"Processed", "Delivered"}),
        "request_count": len(requests),
        "daily_trend": trend,
        "facility_metrics": [],
    }
