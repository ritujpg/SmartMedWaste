from __future__ import annotations

from typing import Any

from fastapi import Header, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.security import decode_jwt_token
from app.services.supabase_repository import SupabaseRepository

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user_from_request(authorization: str | None = Header(default=None)) -> dict[str, Any] | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_jwt_token(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    user_id = str(payload.get("id") or payload.get("sub") or "")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    repo = SupabaseRepository()
    user = repo.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if user.get("is_active") is False:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive")
    return user


def require_role(required_role: str):
    def dependency(authorization: str | None = Header(default=None)) -> dict[str, Any]:
        user = get_current_user_from_request(authorization)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        role = str(user.get("role") or "")
        if role != required_role:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return user

    return dependency


def require_roles(*required_roles: str):
    def dependency(authorization: str | None = Header(default=None)) -> dict[str, Any]:
        user = get_current_user_from_request(authorization)
        if not user or str(user.get("role") or "") not in required_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return user

    return dependency
