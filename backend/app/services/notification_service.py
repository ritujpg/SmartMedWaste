from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import Alert
from app.utils.enums import AlertSeverity


class NotificationService:
    async def create(self, db: AsyncSession, *, title: str, message: str, alert_type: str,
                     severity: AlertSeverity = AlertSeverity.INFO, user_id=None, facility_id=None,
                     waste_id=None, request_id=None) -> Alert:
        alert = Alert(title=title, message=message, alert_type=alert_type, severity=severity,
                      user_id=user_id, facility_id=facility_id, waste_id=waste_id, request_id=request_id)
        db.add(alert)
        await db.flush()
        return alert
