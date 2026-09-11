from __future__ import annotations

from typing import Any

from fastapi import APIRouter

router = APIRouter(tags=["analytics"])


@router.get("/analytics")
async def analytics_index() -> dict[str, Any]:
    return {
        "total_waste_kg": 1264,
        "waste_by_category": {"YELLOW": 42, "RED": 26, "WHITE": 18, "BLUE": 14},
        "collection_status": {"Requested": 8, "Assigned": 4, "In Transit": 3, "Processed": 16},
        "processed_waste_kg": 890,
        "facility_metrics": [{"facility": "Apollo Hospitals", "waste_kg": 246, "compliance_score": 92}],
    }
