from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import CollectionRequest, TrackingEvent, WasteRecord
from app.utils.enums import CollectionStatus, WasteStatus


TRANSITIONS = {
    CollectionStatus.REQUESTED: {CollectionStatus.ASSIGNED, CollectionStatus.CANCELLED},
    CollectionStatus.ASSIGNED: {CollectionStatus.COLLECTOR_EN_ROUTE, CollectionStatus.CANCELLED},
    CollectionStatus.COLLECTOR_EN_ROUTE: {CollectionStatus.PICKED_UP},
    CollectionStatus.PICKED_UP: {CollectionStatus.IN_TRANSIT},
    CollectionStatus.IN_TRANSIT: {CollectionStatus.DELIVERED},
    CollectionStatus.DELIVERED: {CollectionStatus.PROCESSED},
    CollectionStatus.PROCESSED: set(),
    CollectionStatus.CANCELLED: set(),
}


class CollectionWorkflowService:
    async def transition(self, db: AsyncSession, request: CollectionRequest, waste: WasteRecord,
                         next_status: CollectionStatus, user_id=None) -> CollectionRequest:
        if next_status not in TRANSITIONS[request.status]:
            raise HTTPException(status_code=409, detail=f"Invalid transition from {request.status} to {next_status}")
        request.status = next_status
        if next_status != CollectionStatus.CANCELLED:
            waste.status = WasteStatus[next_status.value]
        db.add(TrackingEvent(waste_id=waste.id, request_id=request.id, user_id=user_id,
                             event_type=next_status.value.lower(), status=next_status.value))
        await db.flush()
        return request
