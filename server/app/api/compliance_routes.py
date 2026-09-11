from __future__ import annotations

from typing import Any

from fastapi import APIRouter

router = APIRouter(tags=["compliance"])


@router.get("/compliance")
async def compliance_index() -> dict[str, Any]:
    return {
        "overall_score": 92,
        "segregation_accuracy": 96.4,
        "collection_timeliness": 88.1,
        "tracking_completeness": 98.2,
        "records": [
            {"facility": "Apollo Hospitals", "score": 92, "status": "monitoring"}
        ],
    }


@router.get("/compliance/{facility_id}")
async def compliance_by_facility(facility_id: str) -> dict[str, Any]:
    return {"facility_id": facility_id, "score": 92, "status": "monitoring", "issues": []}
