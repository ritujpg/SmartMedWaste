from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, status

from app.schemas.auth import LoginRequest, SignupRequest
from app.services.auth_service import AuthService

router = APIRouter(prefix="/api", tags=["auth"])


@router.post("/auth/login")
async def login(payload: LoginRequest) -> dict[str, Any]:
    service = AuthService()
    result = service.authenticate_demo_account(payload.email.lower(), payload.password)
    if not result:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return result


@router.post("/auth/signup")
async def signup(payload: SignupRequest) -> dict[str, Any]:
    if not payload.name or not payload.organization:
        raise HTTPException(status_code=400, detail="name and organization are required")
    service = AuthService()
    return service.create_user_from_signup(payload.model_dump())


@router.get("/auth/me")
async def current_user() -> dict[str, Any]:
    return {
        "id": "usr-facility-01",
        "name": "Riya Kapoor",
        "email": "facility@smartmedwaste.demo",
        "role": "facility",
        "organization": "Apollo Hospitals",
    }
