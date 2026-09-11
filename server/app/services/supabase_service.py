from __future__ import annotations

from typing import Any

from app.core.database import get_supabase_client


class SupabaseService:
    def __init__(self) -> None:
        self.client = get_supabase_client()

    def health_check(self) -> dict[str, Any]:
        try:
            # Keep this call to Supabase read-only and non-destructive. It is intentionally lightweight.
            result = self.client.table("users").select("id").limit(1).execute()
            return {"ok": True, "count": len(result.data or [])}
        except Exception as exc:
            return {"ok": False, "error": str(exc)}

    def login(self, email: str, password: str) -> dict[str, Any]:
        # On real Supabase, user records would be checked through the password auth service.
        # This starter contract uses the existing demo-user matrix from the frontend and mirrors it.
        # For the requested clean server implementation, password verification can be delegated to the demo matrix in the auth endpoint.
        raise NotImplementedError
