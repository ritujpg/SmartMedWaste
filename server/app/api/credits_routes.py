from __future__ import annotations

from typing import Any

from fastapi import APIRouter

router = APIRouter(tags=["green_credits"])


@router.get("/green-credits")
async def green_credits() -> dict[str, Any]:
    return {
        "current_balance": 2840,
        "month_earned": 480,
        "history": [
            {"type": "earned", "points": 120, "description": "Waste segregation compliance", "created_at": "2026-09-11T00:00:00Z"}
        ],
    }
