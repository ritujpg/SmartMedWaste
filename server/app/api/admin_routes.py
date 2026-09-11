from __future__ import annotations

from typing import Any

from fastapi import APIRouter

router = APIRouter(tags=["admin"])


@router.get("/admin/dashboard")
async def admin_dashboard() -> dict[str, Any]:
    return {
        "name": "Ananya Rao",
        "total_facilities": 8,
        "total_collectors": 6,
        "total_waste_kg": 1264,
        "compliance_score": 92,
        "active_emergencies": 1,
    }


@router.get("/admin/facilities")
async def admin_facilities() -> dict[str, Any]:
    return {"items": [{"id": "fac-1", "name": "Apollo Hospitals", "status": "active", "compliance_score": 92}]}


@router.get("/admin/collectors")
async def admin_collectors() -> dict[str, Any]:
    return {"items": [{"id": "col-1", "name": "Arjun Mehta", "status": "available", "route": "RTE-2401"}]}
