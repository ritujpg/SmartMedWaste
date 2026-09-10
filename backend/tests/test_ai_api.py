from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app


def test_classification_persists_and_requires_confirmation_when_confidence_is_low(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "mock")
    monkeypatch.setenv("AI_CONFIDENCE_THRESHOLD", "95")
    get_settings.cache_clear()
    with TestClient(app) as client:
        email = f"ai-{uuid4()}@example.com"
        signup = client.post("/api/auth/signup", json={
            "email": email,
            "password": "ChangeMe123!",
            "full_name": "AI Test User",
            "role": "FACILITY_ADMIN",
        })
        token = signup.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        classification = client.post(
            "/api/waste/classify",
            headers=headers,
            files={"image": ("waste.png", b"image-bytes", "image/png")},
        )
        assert classification.status_code == 200
        assessment = classification.json()["data"]
        assert assessment["classification_id"]
        assert assessment["assessment_confidence"] == 0.92
        assert assessment["requires_human_verification"] is True

        rejected = client.post("/api/waste", headers=headers, json={
            "classification_id": assessment["classification_id"],
            "category": "YELLOW",
            "quantity_kg": 1.2,
        })
        assert rejected.status_code == 409

        confirmed = client.post(
            f"/api/waste/classifications/{assessment['classification_id']}/confirm",
            headers=headers,
            json={"confirmed_category": "YELLOW"},
        )
        assert confirmed.status_code == 200
        created = client.post("/api/waste", headers=headers, json={
            "classification_id": assessment["classification_id"],
            "category": "YELLOW",
            "quantity_kg": 1.2,
        })
        assert created.status_code == 201

        report = client.post(
            f"/api/waste/classifications/{assessment['classification_id']}/report",
            headers=headers,
            json={"corrected_category": "RED", "reason": "Human review found a different category"},
        )
        assert report.status_code == 200
    monkeypatch.delenv("AI_PROVIDER", raising=False)
    monkeypatch.delenv("AI_CONFIDENCE_THRESHOLD", raising=False)
    get_settings.cache_clear()