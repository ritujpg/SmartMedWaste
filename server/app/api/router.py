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
from app.api.collector_routes import router as collector_router
from app.api.admin_routes import router as admin_router
from app.api.compliance_routes import router as compliance_router
from app.api.credits_routes import router as credits_router
from app.api.analytics_routes import router as analytics_router
from app.api.detection_routes import router as detection_router
from app.api.route_routes import router as route_router
from app.api.reports_routes import router as reports_router
from app.api.robot_routes import router as robot_router

router.include_router(auth_router, prefix="/api")
router.include_router(waste_router, prefix="/api")
router.include_router(facility_router, prefix="/api")
router.include_router(collection_router, prefix="/api")
router.include_router(tracking_router, prefix="/api")
router.include_router(emergency_router, prefix="/api")
router.include_router(collector_router, prefix="/api")
router.include_router(admin_router, prefix="/api")
router.include_router(compliance_router, prefix="/api")
router.include_router(credits_router, prefix="/api")
router.include_router(analytics_router, prefix="/api")
router.include_router(detection_router)
router.include_router(route_router, prefix="/api")
router.include_router(reports_router, prefix="/api")
router.include_router(robot_router, prefix="/api")

