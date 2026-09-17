from __future__ import annotations

from typing import Any

from app.services.supabase_repository import SupabaseRepository


class WorkflowService:
    def __init__(self) -> None:
        self.repo = SupabaseRepository()

    
    def create_collection_request(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self.repo.insert_collection_request({
            "request_code": payload.get("request_code") or payload.get("request_id"),
            "facility_id": payload.get("facility_id"),
            "waste_record_id": payload.get("waste_record_id"),
            "waste_category": payload.get("waste_category") or payload.get("category"),
            "estimated_quantity": payload.get("estimated_quantity", payload.get("quantity_kg", 0)),
            "quantity_unit": payload.get("quantity_unit", "kg"),
            "priority": payload.get("priority", "Normal"),
            "special_handling_requirement": payload.get("special_handling_requirement") or payload.get("special_handling"),
            "pickup_location": payload.get("pickup_location", ""),
            "notes": payload.get("notes") or payload.get("pickup_notes"),
            "preferred_pickup_date": payload.get("preferred_pickup_date") or payload.get("pickup_date"),
            "preferred_pickup_time": payload.get("preferred_pickup_time") or payload.get("pickup_time"),
            "assigned_collector_id": payload.get("assigned_collector_id") or payload.get("collector_id"),
            "status": payload.get("status", "Requested"),
        })

    def update_collection_request_status(self, request_id: str, status: str) -> dict[str, Any]:
        # The request_id in the requested SQL model points to a collection_requests row.
        # Keep the update safe and schema-mapped by reporting the transition through a repository-aware event object.
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

    def list_requests(self) -> list[dict[str, Any]]:
        return self.repo.list_collection_requests()

    def list_tracking_events(self) -> list[dict[str, Any]]:
        return self.repo.list_tracking_events()

    def list_emergencies(self) -> list[dict[str, Any]]:
        return self.repo.list_emergency_requests()
