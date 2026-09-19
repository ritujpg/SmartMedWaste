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

    
    def insert_facility(self, row: dict[str, Any]) -> dict[str, Any]:
        if not self.client:
            return {"status": "skipped", "detail": "Supabase is not configured"}

        try:
            result = self.client.table("facilities").insert({
                "user_id": row["user_id"],
                "name": row["name"],
                "is_active": True,
            }).execute()

            return {"status": "inserted", "data": result.data or []}
        except Exception as exc:
            return {"status": "error", "detail": str(exc)}

    def insert_collector(self, row: dict[str, Any]) -> dict[str, Any]:
        if not self.client:
            return {"status": "skipped", "detail": "Supabase is not configured"}
        try:
            result = self.client.table("collectors").insert({
                "user_id": row["user_id"],
                "name": row["name"],
                "organization": row.get("organization"),
                "status": "available",
            }).execute()
            return {"status": "inserted", "data": result.data or []}
        except Exception as exc:
            return {"status": "error", "detail": str(exc)}

    def delete_facility_by_user_id(self, user_id: str) -> dict[str, Any]:
        if not self.client:
            return {"status": "skipped", "detail": "Supabase is not configured"}
        try:
            self.client.table("facilities").delete().eq("user_id", user_id).execute()
            return {"status": "deleted"}
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

    def update_emergency_request(self, request_id: str, values: dict[str, Any]) -> dict[str, Any]:
        if not self.client:
            return {"status": "skipped", "detail": "Supabase is not configured"}
        try:
            result = self.client.table("emergency_requests").update(values).eq("request_id", request_id).execute()
            return {"status": "updated", "data": result.data or []}
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

    def list_report_records(self, table: str, user: dict[str, Any], start_date: str, end_date: str) -> list[dict[str, Any]]:
        allowed_tables = {"waste_records", "ai_classifications", "collection_requests", "compliance_records"}
        if table not in allowed_tables or not self.client:
            return []
        try:
            query = self.client.table(table).select("*").gte("created_at", start_date).lt("created_at", end_date)
            role = str(user.get("role") or "")
            if role == "facility":
                facility = self.get_facility_by_user_id(str(user.get("id")))
                facility_id = facility.get("id") if facility else "00000000-0000-0000-0000-000000000000"
                if table != "ai_classifications":
                    query = query.eq("facility_id", facility_id)
            elif role == "collector" and table == "collection_requests":
                collector = self.get_collector_by_user_id(str(user.get("id")))
                collector_id = collector.get("id") if collector else "00000000-0000-0000-0000-000000000000"
                query = query.eq("assigned_collector_id", collector_id)
            return query.order("created_at", desc=True).execute().data or []
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

    def get_facility_by_user_id(self, user_id: str) -> dict[str, Any] | None:
        return self._single("facilities", "user_id", user_id)

    def get_collector_by_user_id(self, user_id: str) -> dict[str, Any] | None:
        return self._single("collectors", "user_id", user_id)

    def list_collection_requests_for_user(self, user: dict[str, Any]) -> list[dict[str, Any]]:
        if not self.client:
            return []
        try:
            query = self.client.table("collection_requests").select("*")
            role = str(user.get("role") or "")
            if role == "facility":
                facility = self.get_facility_by_user_id(str(user.get("id")))
                query = query.eq("facility_id", facility.get("id")) if facility else query.eq("facility_id", "00000000-0000-0000-0000-000000000000")
            elif role == "collector":
                collector = self.get_collector_by_user_id(str(user.get("id")))
                query = query.eq("assigned_collector_id", collector.get("id")) if collector else query.eq("assigned_collector_id", "00000000-0000-0000-0000-000000000000")
            return query.order("created_at", desc=True).execute().data or []
        except Exception:
            return []

    def get_collection_request(self, request_id: str) -> dict[str, Any] | None:
        if not self.client:
            return None
        try:
            result = self.client.table("collection_requests").select("*").eq("request_code", request_id).limit(1).execute()
            rows = result.data or []
            return rows[0] if rows else None
        except Exception:
            return None

    def update_collection_request(self, request_id: str, values: dict[str, Any]) -> dict[str, Any]:
        if not self.client:
            return {"status": "skipped", "detail": "Supabase is not configured"}
        try:
            result = self.client.table("collection_requests").update(values).eq("request_code", request_id).execute()
            return {"status": "updated", "data": result.data or []}
        except Exception as exc:
            return {"status": "error", "detail": str(exc)}

    def update_waste_record(self, waste_id: str, values: dict[str, Any]) -> dict[str, Any]:
        if not self.client:
            return {"status": "skipped", "detail": "Supabase is not configured"}
        try:
            result = self.client.table("waste_records").update(values).eq("id", waste_id).execute()
            return {"status": "updated", "data": result.data or []}
        except Exception as exc:
            return {"status": "error", "detail": str(exc)}

    def get_waste_by_tracking_id(self, tracking_id: str) -> dict[str, Any] | None:
        return self._single("waste_records", "tracking_id", tracking_id)

    def list_tracking_events_for_record(self, waste_record_id: str) -> list[dict[str, Any]]:
        if not self.client:
            return []
        try:
            return self.client.table("tracking_events").select("*").eq("waste_record_id", waste_record_id).order("event_at").execute().data or []
        except Exception:
            return []

    def insert_route(self, row: dict[str, Any]) -> dict[str, Any]:
        if not self.client:
            return {"status": "skipped", "detail": "Supabase is not configured"}
        try:
            result = self.client.table("routes").insert(row).execute()
            return {"status": "inserted", "data": result.data or []}
        except Exception as exc:
            return {"status": "error", "detail": str(exc)}

    def insert_route_stops(self, rows: list[dict[str, Any]]) -> dict[str, Any]:
        if not self.client:
            return {"status": "skipped", "detail": "Supabase is not configured"}
        if not rows:
            return {"status": "inserted", "data": []}
        try:
            result = self.client.table("route_stops").insert(rows).execute()
            return {"status": "inserted", "data": result.data or []}
        except Exception as exc:
            return {"status": "error", "detail": str(exc)}

    def update_route(self, route_id: str, values: dict[str, Any]) -> dict[str, Any]:
        if not self.client:
            return {"status": "skipped", "detail": "Supabase is not configured"}
        try:
            result = self.client.table("routes").update(values).eq("id", route_id).execute()
            return {"status": "updated", "data": result.data or []}
        except Exception as exc:
            return {"status": "error", "detail": str(exc)}

    def list_routes_for_collector(self, collector_id: str) -> list[dict[str, Any]]:
        return self._rows("routes") if not self.client else self.client.table("routes").select("*").eq("collector_id", collector_id).order("created_at", desc=True).execute().data or []

    def list_alerts_for_user(self, user: dict[str, Any]) -> list[dict[str, Any]]:
        if not self.client:
            return []
        try:
            query = self.client.table("alerts").select("*").eq("user_id", str(user.get("id")))
            return query.order("created_at", desc=True).execute().data or []
        except Exception:
            return []

    def update_alert(self, alert_id: str, values: dict[str, Any]) -> dict[str, Any]:
        if not self.client:
            return {"status": "skipped", "detail": "Supabase is not configured"}
        try:
            result = self.client.table("alerts").update(values).eq("id", alert_id).execute()
            return {"status": "updated", "data": result.data or []}
        except Exception as exc:
            return {"status": "error", "detail": str(exc)}

    def list_green_credit_transactions(self, facility_id: str | None = None) -> list[dict[str, Any]]:
        if not self.client:
            return []
        try:
            query = self.client.table("green_credit_transactions").select("*")
            if facility_id:
                query = query.eq("facility_id", facility_id)
            return query.order("created_at", desc=True).execute().data or []
        except Exception:
            return []

    def list_compliance_records_for_facility(self, facility_id: str | None = None) -> list[dict[str, Any]]:
        if not self.client:
            return []
        try:
            query = self.client.table("compliance_records").select("*")
            if facility_id:
                query = query.eq("facility_id", facility_id)
            return query.order("created_at", desc=True).execute().data or []
        except Exception:
            return []
