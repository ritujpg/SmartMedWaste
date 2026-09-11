from __future__ import annotations

from typing import Any

from app.core.security import create_jwt_token, get_password_hash, verify_password, decode_jwt_token
from app.services.supabase_repository import SupabaseRepository


class AuthService:
    def __init__(self) -> None:
        self.repo = SupabaseRepository()

    def authenticate_email_password(self, email: str, password: str) -> dict[str, Any] | None:
        email = email.lower().strip()
        user = self.repo.get_user_by_email(email)
        if not user:
            return None
        if user.get("is_active") is False:
            return None
        password_hash = str(user.get("password_hash") or "")
        if not password_hash:
            return None
        if not verify_password(password, password_hash):
            return None

        user_id = str(user.get("id") or user.get("user_id") or "")
        role = str(user.get("role") or "facility")
        email_value = str(user.get("email") or email)

        token = create_jwt_token(subject=email_value, role=role, user_id=user_id, email=email_value)
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": self.serialize_user(user),
        }

    def serialize_user(self, user: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": str(user.get("id") or ""),
            "name": str(user.get("name") or user.get("full_name") or user.get("email") or ""),
            "email": str(user.get("email") or ""),
            "role": str(user.get("role") or "facility"),
            "organization": str(user.get("organization") or ""),
            "phone": str(user.get("phone") or ""),
            "is_active": bool(user.get("is_active", True)),
        }

    def create_user_from_signup(self, payload: dict[str, Any]) -> dict[str, Any]:
        email = str(payload["email"]).lower().strip()
        existing = self.repo.get_user_by_email(email)
        if existing:
            return {
                "status": "error",
                "detail": "email already exists",
                "user": None,
            }

        password_hash = get_password_hash(payload["password"])
        repo_result = self.repo.insert_user({
            "email": email,
            "password_hash": password_hash,
            "name": payload["name"],
            "role": payload["role"],
            "organization": payload.get("organization", ""),
        })
        if repo_result.get("status") == "error":
            return {
                "status": "error",
                "detail": repo_result.get("detail", "signup failed"),
                "user": None,
            }

        # Verify the row was truly inserted through Supabase persistence.
        user = self.repo.get_user_by_email(email)
        return {
            "status": "created" if user else "pending",
            "user": self.serialize_user(user) if user else {
                "id": "",
                "name": payload["name"],
                "email": email,
                "role": payload["role"],
                "organization": payload.get("organization", ""),
            },
            "detail": repo_result.get("detail") if repo_result.get("status") == "error" else None,
        }

    def me_from_token(self, token: str) -> dict[str, Any] | None:
        try:
            payload = decode_jwt_token(token)
        except Exception:
            return None
        user_id = str(payload.get("id") or payload.get("sub") or "")
        if not user_id:
            return None
        user = self.repo.get_user_by_id(user_id)
        if not user:
            return None
        return self.serialize_user(user)
