from datetime import date, time
from typing import Literal
from pydantic import BaseModel, Field

Category = Literal["YELLOW", "RED", "WHITE", "BLUE"]
RequestPriority = Literal["Normal", "High", "Emergency"]
RequestStatus = Literal["Requested", "Assigned", "Collector En Route", "Picked Up", "In Transit", "Delivered", "Processed", "Rejected"]

class CollectionRequestCreate(BaseModel):
    category: Category
    quantity_kg: float = Field(ge=0)
    priority: RequestPriority = "Normal"
    special_handling: str | None = None
    pickup_location: str | None = None
    pickup_notes: str | None = None
    pickup_date: date | None = None
    pickup_time: time | None = None
    waste_record_id: str | None = None

class StatusUpdate(BaseModel):
    status: RequestStatus

class TrackingEventCreate(BaseModel):
    event_type: str = Field(min_length=1, max_length=80)
    status: str = Field(min_length=1, max_length=80)
    description: str | None = None
    metadata: dict = Field(default_factory=dict)

class EmergencyCreate(BaseModel):
    priority: Literal["Low", "Medium", "High", "Critical"] = "High"
    description: str = Field(min_length=1)
    waste_record_id: str | None = None

class EmergencyStatusUpdate(BaseModel):
    status: Literal["Open", "Assigned", "In Progress", "Resolved", "Closed"]

class RouteCreate(BaseModel):
    name: str = Field(min_length=1)
    vehicle: str | None = None
    request_ids: list[str] = Field(default_factory=list)

class RouteStatusUpdate(BaseModel):
    status: str = Field(min_length=1, max_length=40)
