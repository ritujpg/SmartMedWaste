from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/api", tags=["tracking"])


@router.get("/tracking/{tracking_id}")
async def tracking_lookup(tracking_id: str) -> dict[str, Any]:
    return {
        "tracking_id": tracking_id,
        "facility": "Apollo Hospitals",
        "category": "YELLOW",
        "quantity_kg": 12.4,
        "status": "Collector En Route",
        "events": [
            {"step": "Waste Generated", "time": "Today, 08:40 AM"},
            {"step": "Collection Requested", "time": "Today, 09:12 AM"},
            {"step": "Collector Assigned", "time": "Today, 09:30 AM"},
        ],
    }


@router.post("/tracking/{tracking_id}/scan")
async def scan_tracking(tracking_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    return {"status": "scanned", "tracking_id": tracking_id, "message": "tracking event recorded"}
