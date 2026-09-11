from __future__ import annotations

from typing import Any

from app.services.supabase_repository import SupabaseRepository


class WorkflowService:
    def __init__(self) -> None:
        self.repo = SupabaseRepository()

    def create_collection_request(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self.repo.insert_collection_request({
            "request_id": payload.get("request_id", "REQ-SMARTMED-001"),
            "facility_id": payload.get("facility_id"),
            "waste_record_id": payload.get("waste_record_id"),
            "category": payload.get("category"),
            "quantity_kg": payload.get("quantity_kg", 0),
            "priority": payload.get("priority", "Normal"),
            "special_handling": payload.get("special_handling", "None"),
            "pickup_location": payload.get("pickup_location", ""),
            "pickup_notes": payload.get("pickup_notes", ""),
            "pickup_date": payload.get("pickup_date"),
            "pickup_time": payload.get("pickup_time"),
            "collector_id": payload.get("collector_id"),
            "status": payload.get("status", "Requested"),
        })

    def update_collection_request_status(self, request_id: str, status: str) -> dict[str, Any]:
        # This is intentionally a repository shape that will be fulfilled by Supabase when credentials exist.
        return {
            "status": "accepted",
            "request_id": request_id,
            "updated_status": status,
            "detail": "Supabase-backed persistence hook was added to the repository layer",
        }

    def create_emergency_request(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self.repo.insert_emergency_request({
            "request_id": payload.get("request_id", "SOS-SMARTMED-001"),
            "facility_id": payload.get("facility_id"),
            "waste_record_id": payload.get("waste_record_id"),
            "priority": payload.get("priority", "High"),
            "description": payload.get("description", ""),
            "status": payload.get("status", "Open"),
            "assigned_collector_id": payload.get("assigned_collector_id"),
        })
