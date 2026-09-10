from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.utils.enums import (AlertSeverity, CollectionPriority, CollectionStatus, CollectorStatus,
                             ComplianceStatus, UserRole, WasteCategory, WasteStatus)


class APIModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=160)
    phone: str | None = Field(default=None, max_length=30)
    role: UserRole = UserRole.FACILITY_ADMIN
    facility_id: UUID | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserRead(APIModel):
    id: UUID
    email: EmailStr
    full_name: str
    phone: str | None = None
    role: UserRole
    facility_id: UUID | None = None
    is_active: bool


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class FacilityCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    address: str = ""
    pincode: str = Field(default="", max_length=12)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class FacilityRead(APIModel):
    id: UUID
    name: str
    address: str
    pincode: str
    latitude: float | None
    longitude: float | None


class WasteCreate(BaseModel):
    category: WasteCategory
    quantity_kg: Decimal = Field(gt=0, le=100000)
    description: str = Field(default="", max_length=2000)
    classification_id: UUID | None = None


class WasteUpdate(BaseModel):
    category: WasteCategory | None = None
    status: WasteStatus | None = None
    quantity_kg: Decimal | None = Field(default=None, gt=0, le=100000)
    description: str | None = Field(default=None, max_length=2000)


class WasteRead(APIModel):
    id: UUID
    waste_code: str
    facility_id: UUID
    category: WasteCategory
    status: WasteStatus
    quantity_kg: Decimal
    description: str
    qr_reference: str | None
    barcode_reference: str | None
    created_at: datetime


class ClassificationRead(BaseModel):
    classification_id: UUID
    predicted_category: WasteCategory
    assessment_confidence: float = Field(ge=0, le=1)
    recommended_bin: str
    reason: str
    requires_human_verification: bool


class ClassificationConfirm(BaseModel):
    confirmed_category: WasteCategory


class ClassificationReport(BaseModel):
    corrected_category: WasteCategory | None = None
    reason: str = Field(min_length=2, max_length=2000)


class CollectionCreate(BaseModel):
    waste_id: UUID
    priority: CollectionPriority = CollectionPriority.NORMAL
    notes: str = Field(default="", max_length=2000)


class CollectionUpdate(BaseModel):
    status: CollectionStatus | None = None
    notes: str | None = Field(default=None, max_length=2000)


class CollectionRead(APIModel):
    id: UUID
    request_code: str
    waste_id: UUID
    facility_id: UUID
    collector_id: UUID | None
    priority: CollectionPriority
    status: CollectionStatus
    notes: str
    created_at: datetime


class AssignRequest(BaseModel):
    collector_id: UUID


class TrackingEventCreate(BaseModel):
    waste_id: UUID
    request_id: UUID | None = None
    event_type: str = Field(min_length=2, max_length=80)
    status: str = Field(min_length=2, max_length=50)
    location: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    notes: str = ""


class TrackingRead(APIModel):
    id: UUID
    waste_id: UUID
    request_id: UUID | None
    event_type: str
    status: str
    location: str | None
    latitude: float | None
    longitude: float | None
    user_id: UUID | None
    notes: str
    created_at: datetime


class StatusUpdate(BaseModel):
    status: CollectorStatus


class LocationUpdate(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class EmergencyCreate(BaseModel):
    waste_id: UUID
    message: str = Field(default="Emergency collection requested", max_length=2000)


class EmergencyRead(APIModel):
    id: UUID
    emergency_code: str
    facility_id: UUID
    collection_request_id: UUID | None
    status: str
    message: str
    eta_minutes: int | None


class AlertRead(APIModel):
    id: UUID
    user_id: UUID | None
    facility_id: UUID | None
    severity: AlertSeverity
    alert_type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime


class ComplianceRead(BaseModel):
    facility_id: UUID
    segregation_accuracy: float
    collection_timeliness: float
    tracking_completeness: float
    overall_score: float
    status: ComplianceStatus


class AuditCreate(BaseModel):
    facility_id: UUID
    notes: str = ""


class GreenCreditRead(BaseModel):
    facility_id: UUID
    current_balance: int
    earned_this_month: int
    used: int
    transactions: list[dict]


class Page(BaseModel):
    items: list
    page: int
    page_size: int
    total: int
