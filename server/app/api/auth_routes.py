from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, status, Header

from app.schemas.auth import LoginRequest, SignupRequest
from app.services.auth_service import AuthService

router = APIRouter(tags=["auth"])


@router.post("/auth/login")
async def login(payload: LoginRequest) -> dict[str, Any]:
    service = AuthService()
    result = service.authenticate_email_password(payload.email.lower(), payload.password)
    if not result:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return result


@router.post("/auth/signup")
async def signup(payload: SignupRequest) -> dict[str, Any]:
    if not payload.name:
        raise HTTPException(status_code=400, detail="name is required")
    if not payload.organization:
        raise HTTPException(status_code=400, detail="organization is required")
    service = AuthService()
    result = service.create_user_from_signup(payload.model_dump())
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("detail", "signup failed"))
    return result


@router.get("/auth/me")
async def current_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    token = authorization.split(" ", 1)[1].strip()
    service = AuthService()
    user = service.me_from_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user
