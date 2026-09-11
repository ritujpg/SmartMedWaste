from typing import Any

from fastapi import APIRouter

router = APIRouter()

# Keep the existing health/docs hooks in the registry and mount the modular route files.
@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "SmartMedWaste-fastapi"}


@router.get("/docs")
async def docs_info() -> dict:
    return {"message": "FastAPI docs available at /docs"}


# Module route registration
from app.api.auth_routes import router as auth_router
from app.api.waste_routes import router as waste_router
from app.api.facility_routes import router as facility_router
from app.api.collection_routes import router as collection_router
from app.api.tracking_routes import router as tracking_router
from app.api.emergency_routes import router as emergency_router

router.include_router(auth_router)
router.include_router(waste_router)
router.include_router(facility_router)
router.include_router(collection_router)
router.include_router(tracking_router)
router.include_router(emergency_router)

