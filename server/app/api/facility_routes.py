from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/api", tags=["facility"])


@router.get("/facilities")
async def list_facilities() -> dict[str, Any]:
    return {
        "items": [
            {"id": "fac-1", "name": "Apollo Hospitals", "status": "active", "compliance_score": 92},
            {"id": "fac-2", "name": "Fortis Bannerghatta", "status": "active", "compliance_score": 88},
        ]
    }


@router.get("/facilities/{facility_id}/dashboard")
async def facility_dashboard(facility_id: str) -> dict[str, Any]:
    return {
        "facility_id": facility_id,
        "waste_generated_today": "46.2 kg",
        "pending_collections": 7,
        "compliance_score": 92,
    }
