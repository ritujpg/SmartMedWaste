from __future__ import annotations

from typing import Any

from app.core.security import create_jwt_token, get_password_hash, verify_password
from app.services.supabase_repository import SupabaseRepository


class AuthService:
    def __init__(self) -> None:
        self.repo = SupabaseRepository()

    def authenticate_demo_account(self, email: str, password: str) -> dict[str, Any] | None:
        demo_accounts = {
            "facility@smartmedwaste.demo": {
                "id": "usr-facility-01",
                "name": "Riya Kapoor",
                "email": "facility@smartmedwaste.demo",
                "role": "facility",
                "organization": "Apollo Hospitals",
            },
            "collector@smartmedwaste.demo": {
                "id": "usr-collector-01",
                "name": "Arjun Mehta",
                "email": "collector@smartmedwaste.demo",
                "role": "collector",
                "organization": "GreenRoute Logistics",
            },
            "admin@smartmedwaste.demo": {
                "id": "usr-admin-01",
                "name": "Ananya Rao",
                "email": "admin@smartmedwaste.demo",
                "role": "administrator",
                "organization": "SmartMedWaste Operations",
            },
        }

        account = demo_accounts.get(email.lower())
        if not account or password != "demo123":
            return None
        token = create_jwt_token(subject=account["email"], role=account["role"])
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": account,
        }

    def create_user_from_signup(self, payload: dict[str, Any]) -> dict[str, Any]:
        repo_result = self.repo.insert_user({
            "email": payload["email"].lower(),
            "password_hash": get_password_hash(payload["password"]),
            "name": payload["name"],
            "role": payload["role"],
            "organization": payload.get("organization", ""),
        })
        return {
            "status": repo_result.get("status", "created"),
            "user": {
                "id": "usr-generated",
                "name": payload["name"],
                "email": payload["email"].lower(),
                "role": payload["role"],
                "organization": payload.get("organization", ""),
            },
            "detail": repo_result.get("detail") if repo_result.get("status") == "error" else None,
        }
