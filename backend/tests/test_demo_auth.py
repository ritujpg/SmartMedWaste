import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app


@pytest.mark.parametrize(
    ("email", "role"),
    [
        ("facility@smartmedwaste.demo", "FACILITY_ADMIN"),
        ("collector@smartmedwaste.demo", "COLLECTOR"),
        ("admin@smartmedwaste.demo", "ADMINISTRATOR"),
    ],
)
def test_required_demo_account_can_login(email, role):
    with TestClient(app) as client:
        response = client.post("/api/auth/login", json={"email": email, "password": "demo123"})
    assert response.status_code == 200
    assert response.json()["data"]["user"]["role"] == role


def test_protected_auth_rejects_missing_and_invalid_tokens():
    with TestClient(app) as client:
        assert client.get("/api/auth/me").status_code == 401
        assert client.get("/api/auth/me", headers={"Authorization": "Bearer invalid-token"}).status_code == 401
