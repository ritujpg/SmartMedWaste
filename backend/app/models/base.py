from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.utils.enums import (AlertSeverity, CollectionPriority, CollectionStatus, CollectorStatus,
                             ComplianceStatus, UserRole, WasteCategory, WasteStatus)


def now() -> datetime:
    return datetime.now(timezone.utc)


class Timestamped(Base):
    __abstract__ = True
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now, nullable=False)


class Facility(Timestamped):
    __tablename__ = "facilities"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    address: Mapped[str] = mapped_column(Text, default="")
    pincode: Mapped[str] = mapped_column(String(12), default="")
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    users: Mapped[list["User"]] = relationship(back_populates="facility")
    waste_records: Mapped[list["WasteRecord"]] = relationship(back_populates="facility")


class User(Timestamped):
    __tablename__ = "users"
    __table_args__ = (Index("ix_users_email", "email", unique=True),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30))
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    facility_id: Mapped[UUID | None] = mapped_column(ForeignKey("facilities.id", ondelete="SET NULL"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    facility: Mapped[Facility | None] = relationship(back_populates="users")
    collector: Mapped["Collector | None"] = relationship(back_populates="user", uselist=False)


class Collector(Timestamped):
    __tablename__ = "collectors"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    status: Mapped[CollectorStatus] = mapped_column(Enum(CollectorStatus), default=CollectorStatus.AVAILABLE)
    current_latitude: Mapped[float | None] = mapped_column(Float)
    current_longitude: Mapped[float | None] = mapped_column(Float)
    user: Mapped[User] = relationship(back_populates="collector")
    requests: Mapped[list["CollectionRequest"]] = relationship(back_populates="collector")


class WasteRecord(Timestamped):
    __tablename__ = "waste_records"
    __table_args__ = (Index("ix_waste_facility_status", "facility_id", "status"),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    waste_code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    facility_id: Mapped[UUID] = mapped_column(ForeignKey("facilities.id", ondelete="CASCADE"), nullable=False)
    category: Mapped[WasteCategory] = mapped_column(Enum(WasteCategory), nullable=False)
    status: Mapped[WasteStatus] = mapped_column(Enum(WasteStatus), default=WasteStatus.GENERATED)
    quantity_kg: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    qr_reference: Mapped[str | None] = mapped_column(Text)
    barcode_reference: Mapped[str | None] = mapped_column(Text)
    facility: Mapped[Facility] = relationship(back_populates="waste_records")
    classification: Mapped["AIClassification | None"] = relationship(back_populates="waste", uselist=False)
    collection_requests: Mapped[list["CollectionRequest"]] = relationship(back_populates="waste")


class AIClassification(Timestamped):
    __tablename__ = "ai_classifications"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    facility_id: Mapped[UUID | None] = mapped_column(ForeignKey("facilities.id", ondelete="CASCADE"))
    requested_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    waste_id: Mapped[UUID | None] = mapped_column(ForeignKey("waste_records.id", ondelete="CASCADE"), unique=True)
    predicted_category: Mapped[WasteCategory] = mapped_column(Enum(WasteCategory), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    assessment_confidence: Mapped[float] = mapped_column(Float, nullable=False)
    recommended_bin: Mapped[str] = mapped_column(String(100), nullable=False)
    reason: Mapped[str] = mapped_column(Text, default="")
    provider_name: Mapped[str] = mapped_column(String(50), default="mock")
    model_version: Mapped[str | None] = mapped_column(String(100))
    requires_human_verification: Mapped[bool] = mapped_column(Boolean, default=True)
    human_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    confirmed_category: Mapped[WasteCategory | None] = mapped_column(Enum(WasteCategory))
    verified_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reported_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    report_reason: Mapped[str | None] = mapped_column(Text)
    reported_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    waste: Mapped[WasteRecord | None] = relationship(back_populates="classification")


class AIClassificationReport(Timestamped):
    __tablename__ = "ai_classification_reports"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    classification_id: Mapped[UUID] = mapped_column(ForeignKey("ai_classifications.id", ondelete="CASCADE"), nullable=False)
    reported_by: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    original_category: Mapped[WasteCategory] = mapped_column(Enum(WasteCategory), nullable=False)
    corrected_category: Mapped[WasteCategory | None] = mapped_column(Enum(WasteCategory))
    reason: Mapped[str] = mapped_column(Text, nullable=False)


class CollectionRequest(Timestamped):
    __tablename__ = "collection_requests"
    __table_args__ = (Index("ix_requests_status_priority", "status", "priority"),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    request_code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    waste_id: Mapped[UUID] = mapped_column(ForeignKey("waste_records.id", ondelete="CASCADE"), nullable=False)
    facility_id: Mapped[UUID] = mapped_column(ForeignKey("facilities.id", ondelete="CASCADE"), nullable=False)
    collector_id: Mapped[UUID | None] = mapped_column(ForeignKey("collectors.id", ondelete="SET NULL"))
    priority: Mapped[CollectionPriority] = mapped_column(Enum(CollectionPriority), default=CollectionPriority.NORMAL)
    status: Mapped[CollectionStatus] = mapped_column(Enum(CollectionStatus), default=CollectionStatus.REQUESTED)
    notes: Mapped[str] = mapped_column(Text, default="")
    waste: Mapped[WasteRecord] = relationship(back_populates="collection_requests")
    facility: Mapped[Facility] = relationship()
    collector: Mapped[Collector | None] = relationship(back_populates="requests")


class TrackingEvent(Timestamped):
    __tablename__ = "tracking_events"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    waste_id: Mapped[UUID] = mapped_column(ForeignKey("waste_records.id", ondelete="CASCADE"), nullable=False)
    request_id: Mapped[UUID | None] = mapped_column(ForeignKey("collection_requests.id", ondelete="SET NULL"))
    event_type: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    location: Mapped[str | None] = mapped_column(String(255))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    notes: Mapped[str] = mapped_column(Text, default="")


class Route(Timestamped):
    __tablename__ = "routes"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    collector_id: Mapped[UUID | None] = mapped_column(ForeignKey("collectors.id", ondelete="SET NULL"))
    total_distance_km: Mapped[float] = mapped_column(Float, default=0)
    estimated_duration_minutes: Mapped[int] = mapped_column(Integer, default=0)
    traffic_condition: Mapped[str] = mapped_column(String(30), default="MODERATE")
    efficiency: Mapped[float] = mapped_column(Float, default=0)


class RouteStop(Timestamped):
    __tablename__ = "route_stops"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    route_id: Mapped[UUID] = mapped_column(ForeignKey("routes.id", ondelete="CASCADE"))
    request_id: Mapped[UUID] = mapped_column(ForeignKey("collection_requests.id", ondelete="CASCADE"))
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)


class EmergencyRequest(Timestamped):
    __tablename__ = "emergency_requests"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    emergency_code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    facility_id: Mapped[UUID] = mapped_column(ForeignKey("facilities.id", ondelete="CASCADE"))
    collection_request_id: Mapped[UUID | None] = mapped_column(ForeignKey("collection_requests.id", ondelete="SET NULL"))
    status: Mapped[str] = mapped_column(String(30), default="OPEN")
    message: Mapped[str] = mapped_column(Text, default="")
    eta_minutes: Mapped[int | None] = mapped_column(Integer)


class GreenCreditTransaction(Timestamped):
    __tablename__ = "green_credit_transactions"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    facility_id: Mapped[UUID] = mapped_column(ForeignKey("facilities.id", ondelete="CASCADE"))
    amount: Mapped[int] = mapped_column(Integer)
    reason: Mapped[str] = mapped_column(String(255))


class Alert(Timestamped):
    __tablename__ = "alerts"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    facility_id: Mapped[UUID | None] = mapped_column(ForeignKey("facilities.id", ondelete="CASCADE"))
    severity: Mapped[AlertSeverity] = mapped_column(Enum(AlertSeverity), default=AlertSeverity.INFO)
    alert_type: Mapped[str] = mapped_column(String(80), nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    waste_id: Mapped[UUID | None] = mapped_column(ForeignKey("waste_records.id", ondelete="SET NULL"))
    request_id: Mapped[UUID | None] = mapped_column(ForeignKey("collection_requests.id", ondelete="SET NULL"))
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)


class ComplianceAudit(Timestamped):
    __tablename__ = "compliance_audits"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    facility_id: Mapped[UUID] = mapped_column(ForeignKey("facilities.id", ondelete="CASCADE"))
    score: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[ComplianceStatus] = mapped_column(Enum(ComplianceStatus), default=ComplianceStatus.CRITICAL)
    notes: Mapped[str] = mapped_column(Text, default="")


class WasteAreaAnalytics(Timestamped):
    __tablename__ = "waste_area_analytics"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    pincode: Mapped[str] = mapped_column(String(12), index=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    waste_volume: Mapped[float] = mapped_column(Float, default=0)
    collection_requests: Mapped[int] = mapped_column(Integer, default=0)
    facility_count: Mapped[int] = mapped_column(Integer, default=0)
    trend_percentage: Mapped[float] = mapped_column(Float, default=0)
    intensity: Mapped[float] = mapped_column(Float, default=0)


class NotificationPreference(Timestamped):
    __tablename__ = "notification_preferences"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    email_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    in_app_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
