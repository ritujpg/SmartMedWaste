from datetime import datetime, timezone
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import (ensure_facility_access, get_current_user, require_administrator,
                                   require_collector, require_facility_admin)
from app.core.security import create_access_token, hash_password
from app.core.database import get_db
from app.models.base import (AIClassification, AIClassificationReport, Alert, CollectionRequest, Collector, ComplianceAudit,
                             EmergencyRequest, Facility, GreenCreditTransaction, Route, RouteStop,
                             TrackingEvent, User, WasteAreaAnalytics, WasteRecord)
from app.schemas.all import *
from app.services.ai_service import (AIClassificationService, AIConfigurationError, AIProviderError,
                                     InvalidAIResponseError, InvalidImageError)
from app.services.auth_service import authenticate_user
from app.services.collection_service import CollectionWorkflowService
from app.services.compliance_service import ComplianceService
from app.services.green_credit_service import GreenCreditService
from app.services.notification_service import NotificationService
from app.services.qr_service import QRService
from app.services.routing_service import RoutingService
from app.utils.enums import AlertSeverity, CollectionPriority, CollectionStatus, CollectorStatus, UserRole, WasteStatus
from app.utils.generators import public_id

api = APIRouter(prefix="/api")
auth = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger("smartmedwaste.api")


def ok(data, message: str = "Success"):
    return {"success": True, "data": data, "message": message}


def page(items, page: int, page_size: int, total: int):
    return ok({"items": items, "page": page, "page_size": page_size, "total": total})


async def ensure_request_access(user: User, request: CollectionRequest, db: AsyncSession) -> None:
    if user.role == UserRole.ADMINISTRATOR:
        return
    if user.role == UserRole.FACILITY_ADMIN:
        ensure_facility_access(user, request.facility_id)
        return
    collector_id = await db.scalar(select(Collector.id).where(Collector.user_id == user.id))
    if request.collector_id != collector_id:
        raise HTTPException(403, "Collection request is not assigned to you")


async def ensure_waste_access(user: User, waste: WasteRecord, db: AsyncSession) -> None:
    if user.role != UserRole.COLLECTOR:
        ensure_facility_access(user, waste.facility_id)
        return
    collector_id = await db.scalar(select(Collector.id).where(Collector.user_id == user.id))
    assigned = await db.scalar(select(CollectionRequest.id).where(CollectionRequest.waste_id == waste.id,
                                                                    CollectionRequest.collector_id == collector_id))
    if assigned is None:
        raise HTTPException(403, "Waste record is not assigned to you")


@auth.post("/signup", response_model=dict, status_code=201)
async def signup(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    if await db.scalar(select(User).where(User.email == payload.email)):
        raise HTTPException(409, "Email already registered")
    if payload.role == UserRole.ADMINISTRATOR:
        raise HTTPException(403, "Administrator accounts are provisioned separately")
    facility_id = payload.facility_id
    if payload.role == UserRole.FACILITY_ADMIN:
        if facility_id is None:
            facility = Facility(name=f"{payload.full_name}'s Facility")
            db.add(facility)
            await db.flush()
            facility_id = facility.id
        else:
            raise HTTPException(403, "Facility membership must be provisioned by an administrator")
    user = User(email=payload.email, full_name=payload.full_name, phone=payload.phone,
                password_hash=hash_password(payload.password), role=payload.role, facility_id=facility_id)
    db.add(user)
    await db.flush()
    if payload.role == UserRole.COLLECTOR:
        db.add(Collector(user_id=user.id))
    await db.commit()
    await db.refresh(user)
    return ok(TokenResponse(access_token=create_access_token(user.id), user=user), "Account created")


@auth.post("/login", response_model=dict)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(401, "Invalid email or password")
    return ok(TokenResponse(access_token=create_access_token(user.id), user=user), "Signed in")


@auth.post("/token", response_model=dict)
async def token(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if user is None:
        raise HTTPException(401, "Invalid email or password")
    return {"access_token": create_access_token(user.id), "token_type": "bearer"}


@auth.get("/me", response_model=dict)
async def me(user: User = Depends(get_current_user)):
    return ok(UserRead.model_validate(user))


@auth.post("/logout", response_model=dict)
async def logout(user: User = Depends(get_current_user)):
    return ok(None, "Signed out; discard the access token on the client")


api.include_router(auth)


@api.get("/facilities", response_model=dict, tags=["Facilities"])
async def list_facilities(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(Facility).order_by(Facility.name)
    if user.role != UserRole.ADMINISTRATOR:
        query = query.where(Facility.id == user.facility_id)
    return ok([FacilityRead.model_validate(item) for item in (await db.scalars(query)).all()])


@api.post("/facilities", response_model=dict, status_code=201, tags=["Facilities"])
async def create_facility(payload: FacilityCreate, user: User = Depends(require_administrator), db: AsyncSession = Depends(get_db)):
    facility = Facility(**payload.model_dump())
    db.add(facility); await db.commit(); await db.refresh(facility)
    return ok(FacilityRead.model_validate(facility), "Facility created")


@api.get("/facilities/{facility_id}", response_model=dict, tags=["Facilities"])
async def get_facility(facility_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    ensure_facility_access(user, facility_id)
    facility = await db.get(Facility, facility_id)
    if not facility: raise HTTPException(404, "Facility not found")
    return ok(FacilityRead.model_validate(facility))


@api.patch("/facilities/{facility_id}", response_model=dict, tags=["Facilities"])
async def update_facility(facility_id: UUID, payload: FacilityCreate, user: User = Depends(require_facility_admin), db: AsyncSession = Depends(get_db)):
    ensure_facility_access(user, facility_id)
    facility = await db.get(Facility, facility_id)
    if not facility: raise HTTPException(404, "Facility not found")
    for key, value in payload.model_dump().items(): setattr(facility, key, value)
    await db.commit(); await db.refresh(facility)
    return ok(FacilityRead.model_validate(facility))


@api.delete("/facilities/{facility_id}", response_model=dict, tags=["Facilities"])
async def delete_facility(facility_id: UUID, user: User = Depends(require_administrator), db: AsyncSession = Depends(get_db)):
    facility = await db.get(Facility, facility_id)
    if not facility: raise HTTPException(404, "Facility not found")
    await db.delete(facility); await db.commit(); return ok(None, "Facility deleted")


@api.get("/users/me", response_model=dict, tags=["Users"])
async def user_me(user: User = Depends(get_current_user)): return ok(UserRead.model_validate(user))


@api.patch("/users/me", response_model=dict, tags=["Users"])
async def update_me(payload: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    for key in ("full_name", "phone"):
        if key in payload: setattr(user, key, payload[key])
    await db.commit(); await db.refresh(user); return ok(UserRead.model_validate(user))


@api.get("/users", response_model=dict, tags=["Users"])
async def list_users(user: User = Depends(require_administrator), db: AsyncSession = Depends(get_db)):
    return ok([UserRead.model_validate(item) for item in (await db.scalars(select(User))).all()])


@api.get("/users/{user_id}", response_model=dict, tags=["Users"])
async def get_user(user_id: UUID, user: User = Depends(require_administrator), db: AsyncSession = Depends(get_db)):
    found = await db.get(User, user_id)
    if not found: raise HTTPException(404, "User not found")
    return ok(UserRead.model_validate(found))


@api.patch("/users/{user_id}", response_model=dict, tags=["Users"])
async def update_user(user_id: UUID, payload: dict, user: User = Depends(require_administrator), db: AsyncSession = Depends(get_db)):
    found = await db.get(User, user_id)
    if not found: raise HTTPException(404, "User not found")
    for key in ("full_name", "phone", "is_active"): 
        if key in payload: setattr(found, key, payload[key])
    await db.commit(); await db.refresh(found); return ok(UserRead.model_validate(found))


@api.delete("/users/{user_id}", response_model=dict, tags=["Users"])
async def delete_user(user_id: UUID, user: User = Depends(require_administrator), db: AsyncSession = Depends(get_db)):
    found = await db.get(User, user_id)
    if not found: raise HTTPException(404, "User not found")
    await db.delete(found); await db.commit(); return ok(None, "User deleted")


@api.post("/waste/classify", response_model=dict, tags=["Waste"])
async def classify_waste(image: UploadFile = File(...), user: User = Depends(require_facility_admin), db: AsyncSession = Depends(get_db)):
    if not user.facility_id:
        raise HTTPException(400, "User is not linked to a facility")
    try:
        result = await AIClassificationService().classify(await image.read(), image.content_type or "")
    except InvalidImageError as exc:
        raise HTTPException(400, str(exc)) from exc
    except (AIConfigurationError, AIProviderError) as exc:
        raise HTTPException(503, str(exc)) from exc
    except InvalidAIResponseError as exc:
        raise HTTPException(502, str(exc)) from exc
    classification = AIClassification(
        facility_id=user.facility_id,
        requested_by=user.id,
        predicted_category=result.predicted_category,
        confidence=result.assessment_confidence,
        assessment_confidence=result.assessment_confidence,
        recommended_bin=result.recommended_bin,
        reason=result.reason,
        provider_name=result.provider_name,
        model_version=result.model_version,
        requires_human_verification=result.requires_human_verification,
    )
    db.add(classification)
    await db.commit()
    await db.refresh(classification)
    logger.info("AI classification completed classification_id=%s provider=%s", classification.id, result.provider_name)
    return ok(ClassificationRead(
        classification_id=classification.id,
        predicted_category=result.predicted_category,
        assessment_confidence=result.assessment_confidence,
        recommended_bin=result.recommended_bin,
        reason=result.reason,
        requires_human_verification=result.requires_human_verification,
    ), "Waste image classified")


def _classification_response(classification: AIClassification) -> ClassificationRead:
    return ClassificationRead(
        classification_id=classification.id,
        predicted_category=classification.predicted_category,
        assessment_confidence=classification.assessment_confidence,
        recommended_bin=classification.recommended_bin,
        reason=classification.reason,
        requires_human_verification=classification.requires_human_verification and not classification.human_verified,
    )


@api.post("/waste/classifications/{classification_id}/confirm", response_model=dict, tags=["Waste"])
async def confirm_classification(classification_id: UUID, payload: ClassificationConfirm,
                                 user: User = Depends(require_facility_admin), db: AsyncSession = Depends(get_db)):
    classification = await db.get(AIClassification, classification_id)
    if not classification:
        raise HTTPException(404, "Classification not found")
    ensure_facility_access(user, classification.facility_id)
    if classification.waste_id:
        raise HTTPException(409, "Classification has already been used")
    classification.confirmed_category = payload.confirmed_category
    classification.human_verified = True
    classification.verified_by = user.id
    classification.verified_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(classification)
    return ok(_classification_response(classification), "Classification confirmed")


@api.post("/waste/classifications/{classification_id}/report", response_model=dict, tags=["Waste"])
async def report_classification(classification_id: UUID, payload: ClassificationReport,
                                user: User = Depends(require_facility_admin), db: AsyncSession = Depends(get_db)):
    classification = await db.get(AIClassification, classification_id)
    if not classification:
        raise HTTPException(404, "Classification not found")
    ensure_facility_access(user, classification.facility_id)
    report = AIClassificationReport(
        classification_id=classification.id,
        reported_by=user.id,
        original_category=classification.predicted_category,
        corrected_category=payload.corrected_category,
        reason=payload.reason,
    )
    classification.reported_by = user.id
    classification.report_reason = payload.reason
    classification.reported_at = datetime.now(timezone.utc)
    db.add(report)
    await db.commit()
    return ok({"report_id": report.id, "classification_id": classification.id}, "Classification report recorded")


@api.post("/waste", response_model=dict, status_code=201, tags=["Waste"])
async def create_waste(payload: WasteCreate, user: User = Depends(require_facility_admin), db: AsyncSession = Depends(get_db)):
    if not user.facility_id: raise HTTPException(400, "User is not linked to a facility")
    classification = None
    if payload.classification_id:
        classification = await db.get(AIClassification, payload.classification_id)
        if not classification:
            raise HTTPException(404, "Classification not found")
        ensure_facility_access(user, classification.facility_id)
        if classification.waste_id:
            raise HTTPException(409, "Classification has already been used")
        if classification.requires_human_verification and not classification.human_verified:
            raise HTTPException(409, "This classification requires human confirmation before waste creation")
        expected_category = classification.confirmed_category or classification.predicted_category
        if payload.category != expected_category:
            raise HTTPException(400, "Waste category does not match the confirmed classification")
    waste = WasteRecord(waste_code=public_id("WM"), facility_id=user.facility_id, **payload.model_dump(exclude={"classification_id"}))
    db.add(waste)
    await db.flush()
    waste.qr_reference = QRService().qr_data_uri(waste.id)
    waste.barcode_reference = waste.waste_code
    db.add(TrackingEvent(waste_id=waste.id, event_type="generated", status=WasteStatus.GENERATED.value, user_id=user.id))
    if classification:
        classification.waste_id = waste.id
    await db.commit(); await db.refresh(waste)
    return ok(WasteRead.model_validate(waste), "Waste record created")


@api.get("/waste", response_model=dict, tags=["Waste"])
async def list_waste(category: str | None = None, status_filter: str | None = Query(None, alias="status"), facility_id: UUID | None = None,
                     search: str | None = None, page_number: int = Query(1, alias="page", ge=1), page_size: int = Query(25, ge=1, le=100),
                     user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(WasteRecord)
    if user.role != UserRole.ADMINISTRATOR:
        if user.role == UserRole.FACILITY_ADMIN: facility_id = user.facility_id
        else: query = query.join(CollectionRequest).where(CollectionRequest.collector_id == (await db.scalar(select(Collector.id).where(Collector.user_id == user.id))))
    if facility_id: query = query.where(WasteRecord.facility_id == facility_id)
    if category: query = query.where(WasteRecord.category == category)
    if status_filter: query = query.where(WasteRecord.status == status_filter)
    if search: query = query.where(WasteRecord.waste_code.ilike(f"%{search}%"))
    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    items = (await db.scalars(query.order_by(WasteRecord.created_at.desc()).offset((page_number-1)*page_size).limit(page_size))).all()
    return page([WasteRead.model_validate(item) for item in items], page_number, page_size, total or 0)


@api.get("/waste/{waste_id}", response_model=dict, tags=["Waste"])
async def get_waste(waste_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    waste = await db.get(WasteRecord, waste_id)
    if not waste: raise HTTPException(404, "Waste record not found")
    await ensure_waste_access(user, waste, db)
    return ok(WasteRead.model_validate(waste))


@api.patch("/waste/{waste_id}", response_model=dict, tags=["Waste"])
async def update_waste(waste_id: UUID, payload: WasteUpdate, user: User = Depends(require_facility_admin), db: AsyncSession = Depends(get_db)):
    waste = await db.get(WasteRecord, waste_id)
    if not waste: raise HTTPException(404, "Waste record not found")
    ensure_facility_access(user, waste.facility_id)
    for key, value in payload.model_dump(exclude_none=True).items(): setattr(waste, key, value)
    await db.commit(); await db.refresh(waste); return ok(WasteRead.model_validate(waste))


@api.delete("/waste/{waste_id}", response_model=dict, tags=["Waste"])
async def delete_waste(waste_id: UUID, user: User = Depends(require_facility_admin), db: AsyncSession = Depends(get_db)):
    waste = await db.get(WasteRecord, waste_id)
    if not waste: raise HTTPException(404, "Waste record not found")
    ensure_facility_access(user, waste.facility_id); await db.delete(waste); await db.commit(); return ok(None, "Waste deleted")


@api.get("/waste/{waste_id}/qr", response_model=dict, tags=["Waste"])
async def get_qr(waste_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    waste = await db.get(WasteRecord, waste_id)
    if not waste: raise HTTPException(404, "Waste record not found")
    ensure_facility_access(user, waste.facility_id); return ok({"waste_id": waste.id, "qr": waste.qr_reference})


@api.get("/waste/{waste_id}/barcode", response_model=dict, tags=["Waste"])
async def get_barcode(waste_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    waste = await db.get(WasteRecord, waste_id)
    if not waste: raise HTTPException(404, "Waste record not found")
    ensure_facility_access(user, waste.facility_id); return ok({"waste_id": waste.id, "barcode": waste.barcode_reference})


@api.post("/collection-requests", response_model=dict, status_code=201, tags=["Collections"])
async def create_collection(payload: CollectionCreate, user: User = Depends(require_facility_admin), db: AsyncSession = Depends(get_db)):
    waste = await db.get(WasteRecord, payload.waste_id)
    if not waste: raise HTTPException(404, "Waste record not found")
    ensure_facility_access(user, waste.facility_id)
    request = CollectionRequest(request_code=public_id("REQ"), waste_id=waste.id, facility_id=waste.facility_id, **payload.model_dump(exclude={"waste_id"}))
    waste.status = WasteStatus.COLLECTION_REQUESTED; db.add(request); await db.flush()
    db.add(TrackingEvent(waste_id=waste.id, request_id=request.id, user_id=user.id, event_type="collection_requested", status=request.status.value))
    await NotificationService().create(db, title="Collection requested", message=request.request_code, alert_type="COLLECTION_REQUESTED", facility_id=waste.facility_id, request_id=request.id)
    await db.commit(); await db.refresh(request); return ok(CollectionRead.model_validate(request), "Collection requested")


@api.get("/collection-requests", response_model=dict, tags=["Collections"])
async def list_collections(status_filter: str | None = Query(None, alias="status"), priority: str | None = None,
                           user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(CollectionRequest).order_by(CollectionRequest.created_at.desc())
    if user.role == UserRole.FACILITY_ADMIN: query = query.where(CollectionRequest.facility_id == user.facility_id)
    elif user.role == UserRole.COLLECTOR:
        collector_id = await db.scalar(select(Collector.id).where(Collector.user_id == user.id)); query = query.where(CollectionRequest.collector_id == collector_id)
    if status_filter: query = query.where(CollectionRequest.status == status_filter)
    if priority: query = query.where(CollectionRequest.priority == priority)
    return ok([CollectionRead.model_validate(item) for item in (await db.scalars(query)).all()])


@api.get("/collection-requests/{request_id}", response_model=dict, tags=["Collections"])
async def get_collection(request_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    request = await db.get(CollectionRequest, request_id)
    if not request: raise HTTPException(404, "Collection request not found")
    await ensure_request_access(user, request, db); return ok(CollectionRead.model_validate(request))


@api.post("/collection-requests/{request_id}/assign", response_model=dict, tags=["Collections"])
async def assign_collection(request_id: UUID, payload: AssignRequest, user: User = Depends(require_administrator), db: AsyncSession = Depends(get_db)):
    request = await db.get(CollectionRequest, request_id); collector = await db.get(Collector, payload.collector_id)
    if not request or not collector: raise HTTPException(404, "Request or collector not found")
    waste = await db.get(WasteRecord, request.waste_id); request.collector_id = collector.id
    await CollectionWorkflowService().transition(db, request, waste, CollectionStatus.ASSIGNED, user.id)
    await db.commit(); return ok(CollectionRead.model_validate(request), "Collector assigned")


@api.patch("/collection-requests/{request_id}", response_model=dict, tags=["Collections"])
async def update_collection(request_id: UUID, payload: CollectionUpdate, user: User = Depends(require_collector), db: AsyncSession = Depends(get_db)):
    request = await db.get(CollectionRequest, request_id)
    if not request: raise HTTPException(404, "Collection request not found")
    if user.role == UserRole.COLLECTOR:
        collector_id = await db.scalar(select(Collector.id).where(Collector.user_id == user.id))
        if request.collector_id != collector_id: raise HTTPException(403, "Request is not assigned to you")
    if payload.status:
        await CollectionWorkflowService().transition(db, request, await db.get(WasteRecord, request.waste_id), payload.status, user.id)
    if payload.notes is not None: request.notes = payload.notes
    await db.commit(); return ok(CollectionRead.model_validate(request))


@api.post("/collection-requests/{request_id}/cancel", response_model=dict, tags=["Collections"])
async def cancel_collection(request_id: UUID, user: User = Depends(require_facility_admin), db: AsyncSession = Depends(get_db)):
    request = await db.get(CollectionRequest, request_id)
    if not request: raise HTTPException(404, "Collection request not found")
    ensure_facility_access(user, request.facility_id)
    await CollectionWorkflowService().transition(db, request, await db.get(WasteRecord, request.waste_id), CollectionStatus.CANCELLED, user.id)
    await db.commit(); return ok(CollectionRead.model_validate(request), "Collection cancelled")


@api.post("/collection-requests/{request_id}/scan", response_model=dict, tags=["Collections"])
async def scan_collection(request_id: UUID, waste_id: UUID, user: User = Depends(require_collector), db: AsyncSession = Depends(get_db)):
    request = await db.get(CollectionRequest, request_id); waste = await db.get(WasteRecord, waste_id)
    collector_id = await db.scalar(select(Collector.id).where(Collector.user_id == user.id))
    if not request or not waste or request.waste_id != waste.id or request.collector_id != collector_id: raise HTTPException(403, "QR does not match assigned request")
    if request.status == CollectionStatus.ASSIGNED:
        await CollectionWorkflowService().transition(db, request, waste, CollectionStatus.COLLECTOR_EN_ROUTE, user.id)
    await CollectionWorkflowService().transition(db, request, waste, CollectionStatus.PICKED_UP, user.id)
    await db.commit(); return ok({"request": CollectionRead.model_validate(request), "waste": WasteRead.model_validate(waste)}, "Pickup confirmed")


@api.get("/tracking/waste/{waste_id}", response_model=dict, tags=["Tracking"])
async def tracking_waste(waste_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    waste = await db.get(WasteRecord, waste_id)
    if not waste: raise HTTPException(404, "Waste record not found")
    await ensure_waste_access(user, waste, db)
    events = (await db.scalars(select(TrackingEvent).where(TrackingEvent.waste_id == waste_id).order_by(TrackingEvent.created_at))).all()
    return ok([TrackingRead.model_validate(event) for event in events])


@api.get("/tracking/request/{request_id}", response_model=dict, tags=["Tracking"])
async def tracking_request(request_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    request = await db.get(CollectionRequest, request_id)
    if not request: raise HTTPException(404, "Collection request not found")
    await ensure_request_access(user, request, db)
    events = (await db.scalars(select(TrackingEvent).where(TrackingEvent.request_id == request_id).order_by(TrackingEvent.created_at))).all()
    return ok([TrackingRead.model_validate(event) for event in events])


@api.post("/tracking/events", response_model=dict, status_code=201, tags=["Tracking"])
async def create_tracking(payload: TrackingEventCreate, user: User = Depends(require_collector), db: AsyncSession = Depends(get_db)):
    collector_id = await db.scalar(select(Collector.id).where(Collector.user_id == user.id))
    if payload.request_id is None:
        raise HTTPException(400, "A collection request is required for collector tracking events")
    request = await db.get(CollectionRequest, payload.request_id)
    if request is None or request.collector_id != collector_id or request.waste_id != payload.waste_id:
        raise HTTPException(403, "Tracking event is not assigned to you")
    event = TrackingEvent(**payload.model_dump(), user_id=user.id); db.add(event); await db.commit(); await db.refresh(event)
    return ok(TrackingRead.model_validate(event), "Tracking event recorded")


@api.get("/collectors", response_model=dict, tags=["Collectors"])
async def list_collectors(user: User = Depends(require_administrator), db: AsyncSession = Depends(get_db)):
    collectors = (await db.scalars(select(Collector))).all()
    return ok([{"id": item.id, "user_id": item.user_id, "status": item.status, "latitude": item.current_latitude, "longitude": item.current_longitude} for item in collectors])


@api.get("/collectors/{collector_id}", response_model=dict, tags=["Collectors"])
async def get_collector(collector_id: UUID, user: User = Depends(require_collector), db: AsyncSession = Depends(get_db)):
    collector = await db.get(Collector, collector_id)
    if not collector: raise HTTPException(404, "Collector not found")
    if user.role == UserRole.COLLECTOR and collector.user_id != user.id: raise HTTPException(403, "Collector access denied")
    return ok({"id": collector.id, "user_id": collector.user_id, "status": collector.status, "latitude": collector.current_latitude, "longitude": collector.current_longitude})


@api.get("/collectors/{collector_id}/pickups", response_model=dict, tags=["Collectors"])
async def collector_pickups(collector_id: UUID, user: User = Depends(require_collector), db: AsyncSession = Depends(get_db)):
    collector = await db.get(Collector, collector_id)
    if not collector: raise HTTPException(404, "Collector not found")
    if user.role == UserRole.COLLECTOR and collector.user_id != user.id: raise HTTPException(403, "Collector access denied")
    requests = (await db.scalars(select(CollectionRequest).where(CollectionRequest.collector_id == collector_id))).all()
    return ok([CollectionRead.model_validate(item) for item in requests])


@api.get("/collectors/{collector_id}/history", response_model=dict, tags=["Collectors"])
async def collector_history(collector_id: UUID, user: User = Depends(require_collector), db: AsyncSession = Depends(get_db)):
    return await collector_pickups(collector_id, user, db)


@api.patch("/collectors/{collector_id}/status", response_model=dict, tags=["Collectors"])
async def collector_status(collector_id: UUID, payload: StatusUpdate, user: User = Depends(require_collector), db: AsyncSession = Depends(get_db)):
    collector = await db.get(Collector, collector_id)
    if not collector: raise HTTPException(404, "Collector not found")
    if user.role == UserRole.COLLECTOR and collector.user_id != user.id: raise HTTPException(403, "Collector access denied")
    collector.status = payload.status; await db.commit(); return ok({"id": collector.id, "status": collector.status})


@api.patch("/collectors/{collector_id}/location", response_model=dict, tags=["Collectors"])
async def collector_location(collector_id: UUID, payload: LocationUpdate, user: User = Depends(require_collector), db: AsyncSession = Depends(get_db)):
    collector = await db.get(Collector, collector_id)
    if not collector: raise HTTPException(404, "Collector not found")
    if user.role == UserRole.COLLECTOR and collector.user_id != user.id: raise HTTPException(403, "Collector access denied")
    collector.current_latitude, collector.current_longitude = payload.latitude, payload.longitude; await db.commit(); return ok(payload.model_dump())


@api.post("/emergencies", response_model=dict, status_code=201, tags=["Emergencies"])
async def create_emergency(payload: EmergencyCreate, user: User = Depends(require_facility_admin), db: AsyncSession = Depends(get_db)):
    waste = await db.get(WasteRecord, payload.waste_id)
    if not waste: raise HTTPException(404, "Waste record not found")
    ensure_facility_access(user, waste.facility_id)
    request = CollectionRequest(request_code=public_id("REQ"), waste_id=waste.id, facility_id=waste.facility_id, priority=CollectionPriority.EMERGENCY)
    db.add(request); await db.flush()
    collector = await db.scalar(select(Collector).where(Collector.status == CollectorStatus.AVAILABLE))
    if collector: request.collector_id = collector.id
    emergency = EmergencyRequest(emergency_code=public_id("SOS"), facility_id=waste.facility_id, collection_request_id=request.id, message=payload.message, eta_minutes=20 if collector else None)
    db.add(emergency); waste.status = WasteStatus.COLLECTION_REQUESTED
    db.add(TrackingEvent(waste_id=waste.id, request_id=request.id, user_id=user.id,
                         event_type="emergency_requested", status=request.status.value, notes=payload.message))
    if collector:
        await CollectionWorkflowService().transition(db, request, waste, CollectionStatus.ASSIGNED, user.id)
    await NotificationService().create(db, title="Emergency request", message=payload.message, alert_type="EMERGENCY", severity=AlertSeverity.CRITICAL,
                                       facility_id=waste.facility_id, user_id=collector.user_id if collector else None, request_id=request.id)
    await db.commit(); await db.refresh(emergency)
    return ok(EmergencyRead.model_validate(emergency), "Emergency request created")


@api.get("/emergencies", response_model=dict, tags=["Emergencies"])
async def list_emergencies(user: User = Depends(require_administrator), db: AsyncSession = Depends(get_db)):
    return ok([EmergencyRead.model_validate(item) for item in (await db.scalars(select(EmergencyRequest).order_by(EmergencyRequest.created_at.desc()))).all()])


@api.get("/emergencies/{emergency_id}", response_model=dict, tags=["Emergencies"])
async def get_emergency(emergency_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    emergency = await db.get(EmergencyRequest, emergency_id)
    if not emergency: raise HTTPException(404, "Emergency not found")
    ensure_facility_access(user, emergency.facility_id)
    return ok(EmergencyRead.model_validate(emergency))


@api.patch("/emergencies/{emergency_id}", response_model=dict, tags=["Emergencies"])
async def update_emergency(emergency_id: UUID, payload: dict, user: User = Depends(require_administrator), db: AsyncSession = Depends(get_db)):
    emergency = await db.get(EmergencyRequest, emergency_id)
    if not emergency: raise HTTPException(404, "Emergency not found")
    if "status" in payload: emergency.status = payload["status"]
    if "message" in payload: emergency.message = payload["message"]
    await db.commit(); await db.refresh(emergency)
    return ok(EmergencyRead.model_validate(emergency))


@api.post("/emergencies/{emergency_id}/resolve", response_model=dict, tags=["Emergencies"])
async def resolve_emergency(emergency_id: UUID, user: User = Depends(require_administrator), db: AsyncSession = Depends(get_db)):
    emergency = await db.get(EmergencyRequest, emergency_id)
    if not emergency: raise HTTPException(404, "Emergency not found")
    emergency.status = "RESOLVED"; await db.commit(); return ok(EmergencyRead.model_validate(emergency), "Emergency resolved")


@api.get("/alerts", response_model=dict, tags=["Alerts"])
async def list_alerts(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(Alert).order_by(Alert.created_at.desc())
    if user.role == UserRole.FACILITY_ADMIN:
        query = query.where((Alert.user_id == user.id) | (Alert.facility_id == user.facility_id))
    elif user.role == UserRole.COLLECTOR:
        query = query.where(Alert.user_id == user.id)
    return ok([AlertRead.model_validate(item) for item in (await db.scalars(query)).all()])


@api.patch("/alerts/{alert_id}/read", response_model=dict, tags=["Alerts"])
async def read_alert(alert_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    alert = await db.get(Alert, alert_id)
    if not alert: raise HTTPException(404, "Alert not found")
    if user.role != UserRole.ADMINISTRATOR and alert.facility_id != user.facility_id and alert.user_id != user.id: raise HTTPException(403, "Alert access denied")
    alert.is_read = True; await db.commit(); return ok(AlertRead.model_validate(alert))


@api.patch("/alerts/read-all", response_model=dict, tags=["Alerts"])
async def read_all_alerts(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user.role == UserRole.ADMINISTRATOR:
        alerts = (await db.scalars(select(Alert))).all()
    elif user.role == UserRole.FACILITY_ADMIN:
        alerts = (await db.scalars(select(Alert).where((Alert.user_id == user.id) | (Alert.facility_id == user.facility_id)))).all()
    else:
        alerts = (await db.scalars(select(Alert).where(Alert.user_id == user.id))).all()
    for alert in alerts: alert.is_read = True
    await db.commit(); return ok(None, "Alerts marked as read")


@api.get("/compliance/overview", response_model=dict, tags=["Compliance"])
async def compliance_overview(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    facility_id = user.facility_id
    return await compliance_for(facility_id, db)


async def compliance_for(facility_id: UUID | None, db: AsyncSession):
    waste_query = select(WasteRecord)
    request_query = select(CollectionRequest)
    if facility_id is not None:
        waste_query = waste_query.where(WasteRecord.facility_id == facility_id)
        request_query = request_query.where(CollectionRequest.facility_id == facility_id)
    waste_rows = (await db.scalars(waste_query)).all()
    request_rows = (await db.scalars(request_query)).all()
    waste_ids = [row.id for row in waste_rows]
    classified = 0
    if waste_ids:
        classified = await db.scalar(select(func.count()).select_from(AIClassification).where(AIClassification.waste_id.in_(waste_ids))) or 0
    segregation = 100.0 if not waste_rows else round((classified / len(waste_rows)) * 100, 2)
    completed_requests = sum(request.status in {CollectionStatus.DELIVERED, CollectionStatus.PROCESSED} for request in request_rows)
    timeliness = 100.0 if not request_rows else round((completed_requests / len(request_rows)) * 100, 2)
    complete_tracking = 0
    if waste_ids:
        tracked = await db.scalar(select(func.count(func.distinct(TrackingEvent.waste_id))).where(TrackingEvent.waste_id.in_(waste_ids))) or 0
        complete_tracking = round((tracked / len(waste_ids)) * 100, 2)
    score, state = ComplianceService().calculate(segregation, timeliness, complete_tracking)
    return ok(ComplianceRead(facility_id=facility_id, segregation_accuracy=segregation, collection_timeliness=timeliness,
                             tracking_completeness=complete_tracking, overall_score=score, status=state))


@api.get("/compliance/facility/{facility_id}", response_model=dict, tags=["Compliance"])
async def facility_compliance(facility_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    ensure_facility_access(user, facility_id); return await compliance_for(facility_id, db)


@api.get("/green-credits", response_model=dict, tags=["Green Credits"])
async def green_credits(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    transactions = (await db.scalars(select(GreenCreditTransaction).where(GreenCreditTransaction.facility_id == user.facility_id))).all()
    balance = sum(item.amount for item in transactions)
    return ok(GreenCreditRead(facility_id=user.facility_id, current_balance=balance, earned_this_month=balance, used=0,
                              transactions=[{"amount": item.amount, "reason": item.reason, "created_at": item.created_at} for item in transactions]))


@api.get("/green-credits/transactions", response_model=dict, tags=["Green Credits"])
async def credit_transactions(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (await db.scalars(select(GreenCreditTransaction).where(GreenCreditTransaction.facility_id == user.facility_id))).all()
    return ok([{"id": row.id, "amount": row.amount, "reason": row.reason, "created_at": row.created_at} for row in rows])


@api.get("/green-credits/{facility_id}", response_model=dict, tags=["Green Credits"])
async def facility_green_credits(facility_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    ensure_facility_access(user, facility_id)
    transactions = (await db.scalars(select(GreenCreditTransaction).where(GreenCreditTransaction.facility_id == facility_id))).all()
    balance = sum(item.amount for item in transactions)
    return ok(GreenCreditRead(facility_id=facility_id, current_balance=balance, earned_this_month=balance, used=0, transactions=[]))


@api.post("/green-credits/calculate", response_model=dict, tags=["Green Credits"])
async def calculate_credits(waste_id: UUID, user: User = Depends(require_facility_admin), db: AsyncSession = Depends(get_db)):
    waste = await db.get(WasteRecord, waste_id)
    if not waste: raise HTTPException(404, "Waste record not found")
    ensure_facility_access(user, waste.facility_id)
    amount = GreenCreditService().calculate(waste.quantity_kg, waste.status in {WasteStatus.PROCESSED, WasteStatus.DELIVERED})
    transaction = GreenCreditTransaction(facility_id=waste.facility_id, amount=amount, reason="Correct segregation confirmation")
    db.add(transaction); await db.commit(); return ok({"amount": amount, "transaction_id": transaction.id})


@api.get("/analytics/heatmap", response_model=dict, tags=["Analytics"])
async def heatmap(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (await db.scalars(select(WasteAreaAnalytics))).all()
    return ok([{"pincode": row.pincode, "latitude": row.latitude, "longitude": row.longitude, "waste_volume": row.waste_volume,
                "collection_requests": row.collection_requests, "facility_count": row.facility_count, "trend_percentage": row.trend_percentage, "intensity": row.intensity} for row in rows])


@api.get("/analytics/overview", response_model=dict, tags=["Analytics"])
async def analytics_overview(user: User = Depends(require_administrator), db: AsyncSession = Depends(get_db)):
    day_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    waste_volume = await db.scalar(select(func.coalesce(func.sum(WasteRecord.quantity_kg), 0)).where(WasteRecord.created_at >= day_start)) or 0
    request_count = await db.scalar(select(func.count()).select_from(CollectionRequest)) or 0
    processed = await db.scalar(select(func.count()).select_from(WasteRecord).where(WasteRecord.status == WasteStatus.PROCESSED)) or 0
    return ok({"waste_volume": float(waste_volume), "collection_requests": request_count, "processed": processed,
               "active_facilities": await db.scalar(select(func.count()).select_from(Facility)) or 0})


@api.get("/analytics/waste-trends", response_model=dict, tags=["Analytics"])
async def waste_trends(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(WasteRecord).order_by(WasteRecord.created_at)
    if user.role == UserRole.FACILITY_ADMIN:
        query = query.where(WasteRecord.facility_id == user.facility_id)
    rows = (await db.scalars(query)).all()
    totals: dict[str, float] = {}
    for row in rows:
        key = row.created_at.date().isoformat()
        totals[key] = totals.get(key, 0) + float(row.quantity_kg)
    items = [{"date": date, "waste_volume": volume} for date, volume in sorted(totals.items())]
    return ok({"items": items, "empty_state": None if items else "No waste trend data for the selected period"})


@api.get("/analytics/category-distribution", response_model=dict, tags=["Analytics"])
async def category_distribution(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    query = select(WasteRecord.category, func.count()).group_by(WasteRecord.category)
    if user.role == UserRole.FACILITY_ADMIN:
        query = query.where(WasteRecord.facility_id == user.facility_id)
    return ok([{"category": category, "count": count} for category, count in (await db.execute(query)).all()])


@api.get("/analytics/facility-performance", response_model=dict, tags=["Analytics"])
async def facility_performance(user: User = Depends(require_administrator), db: AsyncSession = Depends(get_db)):
    facilities = (await db.scalars(select(Facility).order_by(Facility.name))).all()
    performance = []
    for facility in facilities:
        waste_volume = await db.scalar(select(func.coalesce(func.sum(WasteRecord.quantity_kg), 0)).where(WasteRecord.facility_id == facility.id)) or 0
        requests = await db.scalar(select(func.count()).select_from(CollectionRequest).where(CollectionRequest.facility_id == facility.id)) or 0
        processed = await db.scalar(select(func.count()).select_from(WasteRecord).where(WasteRecord.facility_id == facility.id, WasteRecord.status == WasteStatus.PROCESSED)) or 0
        performance.append({"facility_id": facility.id, "facility_name": facility.name, "waste_volume": float(waste_volume),
                            "collection_requests": requests, "processed_waste": processed})
    return ok(performance)


@api.get("/compliance/audits", response_model=dict, tags=["Compliance"])
async def compliance_audits(user: User = Depends(require_administrator), db: AsyncSession = Depends(get_db)):
    return ok([{"id": audit.id, "facility_id": audit.facility_id, "score": audit.score, "status": audit.status, "notes": audit.notes} for audit in (await db.scalars(select(ComplianceAudit))).all()])


@api.post("/compliance/audits", response_model=dict, status_code=201, tags=["Compliance"])
async def create_compliance_audit(payload: AuditCreate, user: User = Depends(require_administrator), db: AsyncSession = Depends(get_db)):
    metrics = await compliance_for(payload.facility_id, db)
    compliance = metrics["data"]
    audit = ComplianceAudit(facility_id=payload.facility_id, score=compliance.overall_score, status=compliance.status, notes=payload.notes)
    db.add(audit); await db.commit(); await db.refresh(audit)
    return ok({"id": audit.id, "score": audit.score, "status": audit.status}, "Audit created")


@api.post("/routes/optimize", response_model=dict, tags=["Routes"])
async def optimize_route(request_ids: list[UUID], user: User = Depends(require_administrator), db: AsyncSession = Depends(get_db)):
    plan = await RoutingService().optimize([str(request_id) for request_id in request_ids])
    route = Route(total_distance_km=plan.total_distance_km, estimated_duration_minutes=plan.estimated_duration_minutes,
                  traffic_condition=plan.traffic_condition, efficiency=plan.route_efficiency)
    db.add(route); await db.flush()
    for sequence, request_id in enumerate(request_ids, start=1): db.add(RouteStop(route_id=route.id, request_id=request_id, sequence=sequence))
    await db.commit(); return ok({"id": route.id, "ordered_stops": plan.ordered_stops, "total_distance_km": plan.total_distance_km,
                                 "estimated_duration_minutes": plan.estimated_duration_minutes, "traffic_condition": plan.traffic_condition, "route_efficiency": plan.route_efficiency})


@api.get("/routes", response_model=dict, tags=["Routes"])
async def list_routes(user: User = Depends(require_administrator), db: AsyncSession = Depends(get_db)):
    return ok([{"id": route.id, "total_distance_km": route.total_distance_km, "estimated_duration_minutes": route.estimated_duration_minutes,
                "traffic_condition": route.traffic_condition, "efficiency": route.efficiency} for route in (await db.scalars(select(Route))).all()])


@api.get("/routes/{route_id}", response_model=dict, tags=["Routes"])
async def get_route(route_id: UUID, user: User = Depends(require_administrator), db: AsyncSession = Depends(get_db)):
    route = await db.get(Route, route_id)
    if not route: raise HTTPException(404, "Route not found")
    return ok({"id": route.id, "total_distance_km": route.total_distance_km, "estimated_duration_minutes": route.estimated_duration_minutes,
               "traffic_condition": route.traffic_condition, "efficiency": route.efficiency})


@api.get("/routes/{route_id}/stops", response_model=dict, tags=["Routes"])
async def route_stops(route_id: UUID, user: User = Depends(require_administrator), db: AsyncSession = Depends(get_db)):
    return ok([{"id": stop.id, "request_id": stop.request_id, "sequence": stop.sequence} for stop in (await db.scalars(select(RouteStop).where(RouteStop.route_id == route_id).order_by(RouteStop.sequence))).all()])


@api.post("/routes/{route_id}/recalculate", response_model=dict, tags=["Routes"])
async def recalculate_route(route_id: UUID, user: User = Depends(require_administrator), db: AsyncSession = Depends(get_db)):
    route = await db.get(Route, route_id)
    if not route: raise HTTPException(404, "Route not found")
    route.traffic_condition = "MODERATE"; route.estimated_duration_minutes += 5
    await db.commit(); return ok({"id": route.id, "status": "RECALCULATED", "estimated_duration_minutes": route.estimated_duration_minutes})


@api.get("/dashboard/facility", response_model=dict, tags=["Dashboards"])
async def facility_dashboard(user: User = Depends(require_facility_admin), db: AsyncSession = Depends(get_db)):
    day_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    waste_count = await db.scalar(select(func.coalesce(func.sum(WasteRecord.quantity_kg), 0)).where(WasteRecord.facility_id == user.facility_id, WasteRecord.created_at >= day_start)) or 0
    pending = await db.scalar(select(func.count()).select_from(CollectionRequest).where(CollectionRequest.facility_id == user.facility_id, CollectionRequest.status.not_in([CollectionStatus.PROCESSED, CollectionStatus.CANCELLED]))) or 0
    credits = await db.scalar(select(func.coalesce(func.sum(GreenCreditTransaction.amount), 0)).where(GreenCreditTransaction.facility_id == user.facility_id)) or 0
    alerts = await db.scalar(select(func.count()).select_from(Alert).where(Alert.facility_id == user.facility_id, Alert.is_read.is_(False))) or 0
    recent = (await db.scalars(select(WasteRecord).where(WasteRecord.facility_id == user.facility_id).order_by(WasteRecord.created_at.desc()).limit(10))).all()
    compliance = (await compliance_for(user.facility_id, db))["data"]
    recent_requests = (await db.scalars(select(CollectionRequest).where(CollectionRequest.facility_id == user.facility_id).order_by(CollectionRequest.created_at.desc()).limit(10))).all()
    return ok({"todays_waste": float(waste_count), "pending_requests": pending, "compliance_score": compliance.overall_score, "green_credits": int(credits),
               "active_alerts": alerts, "recent_waste": [WasteRead.model_validate(item) for item in recent],
               "recent_collection_requests": [CollectionRead.model_validate(item) for item in recent_requests]})


@api.get("/dashboard/collector", response_model=dict, tags=["Dashboards"])
async def collector_dashboard(user: User = Depends(require_collector), db: AsyncSession = Depends(get_db)):
    collector_id = await db.scalar(select(Collector.id).where(Collector.user_id == user.id))
    pending = await db.scalar(select(func.count()).select_from(CollectionRequest).where(CollectionRequest.collector_id == collector_id, CollectionRequest.status.not_in([CollectionStatus.PROCESSED, CollectionStatus.CANCELLED]))) or 0
    completed = await db.scalar(select(func.count()).select_from(CollectionRequest).where(CollectionRequest.collector_id == collector_id, CollectionRequest.status == CollectionStatus.PROCESSED)) or 0
    emergencies = await db.scalar(select(func.count()).select_from(CollectionRequest).where(CollectionRequest.collector_id == collector_id, CollectionRequest.priority == CollectionPriority.EMERGENCY)) or 0
    route = await db.scalar(select(Route).where(Route.collector_id == collector_id).order_by(Route.created_at.desc()))
    alerts = (await db.scalars(select(Alert).where((Alert.user_id == user.id) | (Alert.facility_id == user.facility_id), Alert.is_read.is_(False)).order_by(Alert.created_at.desc()).limit(10))).all()
    return ok({"todays_pickups": pending + completed, "completed": completed, "pending": pending, "emergency_requests": emergencies,
               "distance_remaining": route.total_distance_km if route else 0, "current_route": route.id if route else None,
               "recent_alerts": [AlertRead.model_validate(alert) for alert in alerts]})


@api.get("/dashboard/admin", response_model=dict, tags=["Dashboards"])
async def admin_dashboard(user: User = Depends(require_administrator), db: AsyncSession = Depends(get_db)):
    day_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    collected_today = await db.scalar(select(func.coalesce(func.sum(WasteRecord.quantity_kg), 0)).where(WasteRecord.created_at >= day_start, WasteRecord.status.in_([WasteStatus.PICKED_UP, WasteStatus.IN_TRANSIT, WasteStatus.DELIVERED, WasteStatus.PROCESSED]))) or 0
    pending = await db.scalar(select(func.count()).select_from(CollectionRequest).where(CollectionRequest.status.not_in([CollectionStatus.PROCESSED, CollectionStatus.CANCELLED]))) or 0
    active_alerts = await db.scalar(select(func.count()).select_from(Alert).where(Alert.is_read.is_(False))) or 0
    compliance_rate = await db.scalar(select(func.avg(ComplianceAudit.score)))
    rankings = await facility_performance(user, db)
    category_rows = (await db.execute(select(WasteRecord.category, func.count()).group_by(WasteRecord.category))).all()
    return ok({"total_facilities": await db.scalar(select(func.count()).select_from(Facility)) or 0,
               "active_collectors": await db.scalar(select(func.count()).select_from(Collector).where(Collector.status != CollectorStatus.OFFLINE)) or 0,
               "waste_collected_today": float(collected_today), "pending_requests": pending,
               "average_segregation_accuracy": float(compliance_rate if compliance_rate is not None else 0),
               "compliance_rate": float(compliance_rate if compliance_rate is not None else 0), "active_alerts": active_alerts,
               "charts": [{"category": category, "count": count} for category, count in category_rows],
               "facility_rankings": rankings["data"]})
