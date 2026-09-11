from __future__ import annotations

from typing import Any

from fastapi import APIRouter

router = APIRouter(tags=["collector"])


@router.get("/collector/dashboard")
async def collector_dashboard() -> dict[str, Any]:
    return {
        "collector_id": "usr-collector-01",
        "name": "Arjun Mehta",
        "assigned_pickups": 5,
        "available_pickups": 2,
        "route_status": "en_route",
        "today_pickups": 7,
    }


@router.get("/collector/assignments")
async def collector_assignments() -> dict[str, Any]:
    return {
        "items": [
            {"id": "REQ-24091", "facility": "Apollo Hospitals", "category": "YELLOW", "quantity_kg": 12.4, "priority": "High", "status": "Assigned", "pickup": "Today, 10:30 AM"}
        ]
    }


@router.get("/collector/routes")
async def collector_routes() -> dict[str, Any]:
    return {
        "route_id": "RTE-2401",
        "collector": "Arjun Mehta",
        "vehicle": "GV-14",
        "status": "active",
        "stops": 4,
    }
