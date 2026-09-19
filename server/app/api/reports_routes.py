from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime, time, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.dependencies import get_current_user_from_request
from app.services.supabase_repository import SupabaseRepository

router = APIRouter(tags=["reports"])


def _date_bounds(start_date: date | None, end_date: date | None) -> tuple[date, date]:
    today = datetime.now(timezone.utc).date()
    start = start_date or (today - timedelta(days=29))
    end = end_date or today
    if start > end:
        raise HTTPException(status_code=400, detail="start_date must be on or before end_date")
    return start, end


def _created_at_bounds(start_date: date, end_date: date) -> tuple[str, str]:
    start = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
    end = datetime.combine(end_date + timedelta(days=1), time.min, tzinfo=timezone.utc)
    return start.isoformat(), end.isoformat()


@router.get("/reports")
async def reports_index(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    user: dict[str, Any] = Depends(get_current_user_from_request),
) -> dict[str, Any]:
    start, end = _date_bounds(start_date, end_date)
    created_start, created_end = _created_at_bounds(start, end)
    repo = SupabaseRepository()

    waste = repo.list_report_records("waste_records", user, created_start, created_end)
    requests = repo.list_report_records("collection_requests", user, created_start, created_end)
    compliance = repo.list_report_records("compliance_records", user, created_start, created_end)
    classifications = repo.list_report_records("ai_classifications", user, created_start, created_end)
    if user.get("role") == "facility":
        waste_ids = {row.get("id") for row in waste}
        classifications = [row for row in classifications if row.get("waste_record_id") in waste_ids]

    daily = defaultdict(float)
    for row in waste:
        day = str(row.get("created_at") or "")[:10]
        if day:
            daily[day] += float(row.get("quantity_kg") or 0)

    category_totals = defaultdict(float)
    category_counts = Counter()
    for row in waste:
        category = str(row.get("category") or "UNKNOWN")
        category_totals[category] += float(row.get("quantity_kg") or 0)
        category_counts[category] += 1

    return {
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "waste_generation": {
            "total_kg": sum(float(row.get("quantity_kg") or 0) for row in waste),
            "record_count": len(waste),
            "daily": [{"date": day, "quantity_kg": round(daily[day], 2)} for day in sorted(daily)],
        },
        "waste_categories": [
            {"category": category, "quantity_kg": round(category_totals[category], 2), "record_count": category_counts[category]}
            for category in sorted(category_totals)
        ],
        "collection_requests": {
            "record_count": len(requests),
            "by_status": dict(Counter(str(row.get("status") or "UNKNOWN") for row in requests)),
            "records": requests,
        },
        "ai_classifications": {
            "record_count": len(classifications),
            "records": classifications,
        },
        "compliance": {
            "record_count": len(compliance),
            "records": compliance,
        },
    }