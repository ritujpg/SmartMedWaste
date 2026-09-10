import asyncio
import os
from decimal import Decimal

from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models.base import Collector, Facility, User, WasteRecord
from app.utils.enums import UserRole, WasteCategory
from app.utils.generators import public_id


async def _get_or_create_facility(db, name: str, address: str, pincode: str) -> Facility:
    facility = await db.scalar(select(Facility).where(Facility.name == name))
    if facility is None:
        facility = Facility(name=name, address=address, pincode=pincode)
        db.add(facility)
        await db.flush()
    return facility


async def _get_or_create_user(db, *, email: str, full_name: str, role: UserRole,
                              password: str, facility_id=None) -> User:
    user = await db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(email=email, full_name=full_name, password_hash=hash_password(password),
                    role=role, facility_id=facility_id)
        db.add(user)
        await db.flush()
    else:
        user.full_name = full_name
        user.role = role
        user.facility_id = facility_id
        user.is_active = True
        user.password_hash = hash_password(password)
    return user


async def seed() -> None:
    settings = get_settings()
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    async with SessionLocal() as db:
        facilities = [
            await _get_or_create_facility(db, f"Demo Facility {index}", f"Operations campus {index}", f"5600{index:02d}")
            for index in range(1, 9)
        ]
        shared_password = os.getenv("DEMO_PASSWORD", settings.demo_password)
        facility_password = os.getenv("DEMO_FACILITY_PASSWORD", shared_password)
        collector_password = os.getenv("DEMO_COLLECTOR_PASSWORD", shared_password)
        admin_password = os.getenv("DEMO_ADMIN_PASSWORD", shared_password)
        await _get_or_create_user(db, email=settings.demo_admin_email, full_name="System Administrator",
                                  role=UserRole.ADMINISTRATOR, password=admin_password)
        await _get_or_create_user(db, email=settings.demo_facility_email, full_name="Facility Administrator",
                                  role=UserRole.FACILITY_ADMIN, password=facility_password, facility_id=facilities[0].id)
        collector_user = await _get_or_create_user(db, email=settings.demo_collector_email, full_name="Demo Collector",
                                                   role=UserRole.COLLECTOR, password=collector_password)
        if await db.scalar(select(Collector).where(Collector.user_id == collector_user.id)) is None:
            db.add(Collector(user_id=collector_user.id))
        if await db.scalar(select(WasteRecord.id).limit(1)) is None:
            for index in range(32):
                db.add(WasteRecord(waste_code=public_id("WM"), facility_id=facilities[index % 8].id,
                                   category=list(WasteCategory)[index % 4], quantity_kg=Decimal(index + 1)))
        await db.commit()
    print(f"Seeded demo accounts: {settings.demo_facility_email}, {settings.demo_collector_email}, {settings.demo_admin_email}")


if __name__ == "__main__":
    asyncio.run(seed())
