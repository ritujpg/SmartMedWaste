from __future__ import annotations

from typing import Any

from app.core.database import get_supabase_client


class SupabaseRepository:
    def __init__(self) -> None:
        self.client = get_supabase_client()

    def _rows(self, table: str, select: str = "*", limit: int | None = None) -> list[dict[str, Any]]:
        if not self.client:
            return []
        try:
            query = self.client.table(table).select(select)
            if limit is not None:
                query = query.limit(limit)
            data = query.execute()
            return data.data or []
        except Exception:
            return []

    def _single(self, table: str, criteria: str, value: Any, select: str = "*") -> dict[str, Any] | None:
        if not self.client:
            return None
        try:
            data = self.client.table(table).select(select).eq(criteria, value).limit(1).execute()
            rows = data.data or []
            return rows[0] if rows else None
        except Exception:
            return None

    def query_users(self) -> list[dict[str, Any]]:
        if not self.client:
            return []
        try:
            data = self.client.table("users").select("*").execute()
            return data.data or []
        except Exception:
            return []

    def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        if not self.client:
            return None
        try:
            data = self.client.table("users").select("*").eq("email", email.lower().strip()).limit(1).execute()
            rows = data.data or []
            return rows[0] if rows else None
        except Exception:
            return None

    def get_user_by_id(self, user_id: str) -> dict[str, Any] | None:
        if not self.client:
            return None
        try:
            data = self.client.table("users").select("*").eq("id", user_id).limit(1).execute()
            rows = data.data or []
            return rows[0] if rows else None
        except Exception:
            return None

    def get_waste_record_by_id(self, waste_id: str) -> dict[str, Any] | None:
        if not self.client:
            return None
        try:
            data = self.client.table("waste_records").select("*").eq("id", waste_id).limit(1).execute()
            rows = data.data or []
            return rows[0] if rows else None
        except Exception:
            return None

    def delete_user_by_email(self, email: str) -> dict[str, Any]:
        if not self.client:
            return {"status": "skipped", "detail": "SUPABASE_URL and SUPABASE_SECRET_KEY are not configured"}
        try:
            self.client.table("users").delete().eq("email", email.lower().strip()).execute()
            return {"status": "deleted"}
        except Exception as exc:
            return {"status": "error", "detail": str(exc)}

    def delete_waste_record_by_id(self, waste_id: str) -> dict[str, Any]:
        if not self.client:
            return {"status": "skipped", "detail": "SUPABASE_URL and SUPABASE_SECRET_KEY are not configured"}
        try:
            self.client.table("waste_records").delete().eq("id", waste_id).execute()
            return {"status": "deleted"}
        except Exception as exc:
            return {"status": "error", "detail": str(exc)}

    def insert_user(self, row: dict[str, Any]) -> dict[str, Any]:
        if not self.client:
            return {"status": "skipped", "detail": "SUPABASE_URL and SUPABASE_SECRET_KEY are not configured"}
        try:
            payload = {
                "email": row.get("email"),
                "password_hash": row.get("password_hash"),
                "name": row.get("name"),
                "role": row.get("role", "facility"),
                "organization": row.get("organization"),
                "phone": row.get("phone"),
                "is_active": True,
            }
            result = self.client.table("users").insert(payload).execute()
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

    def insert_ai_classification(self, row: dict[str, Any]) -> dict[str, Any]:
        if not self.client:
            return {"status": "skipped", "detail": "SUPABASE_URL and SUPABASE_SECRET_KEY are not configured"}
        try:
            result = self.client.table("ai_classifications").insert(row).execute()
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

    def get_waste_record_by_id(self, waste_id: str) -> dict[str, Any] | None:
        if not self.client:
            return None
        try:
            data = self.client.table("waste_records").select("*").eq("id", waste_id).limit(1).execute()
            rows = data.data or []
            return rows[0] if rows else None
        except Exception:
            return None

    def delete_waste_record_by_id(self, waste_id: str) -> dict[str, Any]:
        if not self.client:
            return {"status": "skipped", "detail": "SUPABASE_URL and SUPABASE_SECRET_KEY are not configured"}
        try:
            self.client.table("waste_records").delete().eq("id", waste_id).execute()
            return {"status": "deleted"}
        except Exception as exc:
            return {"status": "error", "detail": str(exc)}

    def list_facilities(self) -> list[dict[str, Any]]:
        return self._rows("facilities")

    def list_collectors(self) -> list[dict[str, Any]]:
        return self._rows("collectors")

    def get_facility_dashboard(self, facility_id: str) -> dict[str, Any]:
        facility = self._single("facilities", "id", facility_id)
        if not facility:
            return {}
        return {
            "facility_id": facility_id,
            "facility": facility.get("name"),
            "waste_generated_today": 0,
            "pending_collections": 0,
            "compliance_score": facility.get("compliance_score", 0),
        }

    def list_collection_requests(self) -> list[dict[str, Any]]:
        return self._rows("collection_requests")

    def list_tracking_events(self) -> list[dict[str, Any]]:
        return self._rows("tracking_events")

    def list_emergency_requests(self) -> list[dict[str, Any]]:
        return self._rows("emergency_requests")

    def get_tracking_event_by_tracking_id(self, tracking_id: str) -> dict[str, Any] | None:
        if not self.client:
            return None
        try:
            data = self.client.table("tracking_events").select("*").eq("tracking_id", tracking_id).limit(1).execute()
            rows = data.data or []
            return rows[0] if rows else None
        except Exception:
            return None

    def get_tracking_record(self, tracking_id: str) -> dict[str, Any] | None:
        return self.get_tracking_event_by_tracking_id(tracking_id)

    def insert_tracking_event(self, row: dict[str, Any]) -> dict[str, Any]:
        if not self.client:
            return {"status": "skipped", "detail": "SUPABASE_URL and SUPABASE_SECRET_KEY are not configured"}
        try:
            result = self.client.table("tracking_events").insert(row).execute()
            return {"status": "inserted", "data": result.data or []}
        except Exception as exc:
            return {"status": "error", "detail": str(exc)}

    def get_green_credit_totals(self) -> dict[str, Any]:
        return {"current_balance": 0, "month_earned": 0, "history": []}

    def list_green_credits(self) -> list[dict[str, Any]]:
        return []

    def list_compliance_records(self) -> list[dict[str, Any]]:
        return []

    def list_analytics(self) -> dict[str, Any]:
        return {
            "total_waste_kg": 0,
            "waste_by_category": {},
            "collection_status": {},
            "processed_waste_kg": 0,
            "facility_metrics": [],
        }

    def list_admin_dashboard(self) -> dict[str, Any]:
        return {
            "name": "SmartMedWaste",
            "total_facilities": len(self.list_facilities()),
            "total_collectors": len(self.list_collectors()),
            "total_waste_kg": sum(float(row.get("quantity_kg") or 0) for row in self.list_waste_records()),
            "compliance_score": 0,
            "active_emergencies": len(self.list_emergency_requests()),
        }

    def list_collection_requests(self) -> list[dict[str, Any]]:
        if not self.client:
            return []
        try:
            data = self.client.table("collection_requests").select("*").execute()
            return data.data or []
        except Exception:
            return []

    def list_waste_records(self) -> list[dict[str, Any]]:
        if not self.client:
            return []
        try:
            data = self.client.table("waste_records").select("*").execute()
            return data.data or []
        except Exception:
            return []

    def list_emergency_requests(self) -> list[dict[str, Any]]:
        if not self.client:
            return []
        try:
            data = self.client.table("emergency_requests").select("*").execute()
            return data.data or []
        except Exception:
            return []

    def list_tracking_events(self) -> list[dict[str, Any]]:
        if not self.client:
            return []
        try:
            data = self.client.table("tracking_events").select("*").execute()
            return data.data or []
        except Exception:
            return []
