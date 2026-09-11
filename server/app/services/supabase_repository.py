from __future__ import annotations

from typing import Any

from app.core.database import get_supabase_client


class SupabaseRepository:
    def __init__(self) -> None:
        self.client = get_supabase_client()

    def query_users(self) -> list[dict[str, Any]]:
        if not self.client:
            return []
        try:
            data = self.client.table("users").select("*").execute()
            return data.data or []
        except Exception:
            return []

    def insert_user(self, row: dict[str, Any]) -> dict[str, Any]:
        if not self.client:
            return {"status": "skipped", "detail": "SUPABASE_URL and SUPABASE_SECRET_KEY are not configured"}
        try:
            result = self.client.table("users").insert(row).execute()
            return {"status": "inserted", "data": result.data or []}
        except Exception as exc:
            return {"status": "error", "detail": str(exc)}

    def insert_waste_record(self, row: dict[str, Any]) -> dict[str, Any]:
        if not self.client:
            return {"status": "skipped", "detail": "SUPABASE_URL and SUPABASE_SECRET_KEY are not configured"}
        try:
            result = self.client.table("waste_records").insert(row).execute()
            return {"status": "inserted", "data": result.data or []}
        except Exception as exc:
            return {"status": "error", "detail": str(exc)}

    def insert_collection_request(self, row: dict[str, Any]) -> dict[str, Any]:
        if not self.client:
            return {"status": "skipped", "detail": "SUPABASE_URL and SUPABASE_SECRET_KEY are not configured"}
        try:
            result = self.client.table("collection_requests").insert(row).execute()
            return {"status": "inserted", "data": result.data or []}
        except Exception as exc:
            return {"status": "error", "detail": str(exc)}

    def insert_tracking_event(self, row: dict[str, Any]) -> dict[str, Any]:
        if not self.client:
            return {"status": "skipped", "detail": "SUPABASE_URL and SUPABASE_SECRET_KEY are not configured"}
        try:
            result = self.client.table("tracking_events").insert(row).execute()
            return {"status": "inserted", "data": result.data or []}
        except Exception as exc:
            return {"status": "error", "detail": str(exc)}

    def insert_emergency_request(self, row: dict[str, Any]) -> dict[str, Any]:
        if not self.client:
            return {"status": "skipped", "detail": "SUPABASE_URL and SUPABASE_SECRET_KEY are not configured"}
        try:
            result = self.client.table("emergency_requests").insert(row).execute()
            return {"status": "inserted", "data": result.data or []}
        except Exception as exc:
            return {"status": "error", "detail": str(exc)}
