from fastapi.testclient import TestClient

from app.main import app


DEMO_EMAIL = "facility@smartmedwaste.demo"
DEMO_PASSWORD = "demo123"


def test_json_login_contract_remains_unchanged():
    with TestClient(app) as client:
        response = client.post("/api/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["token_type"] == "bearer"
    assert payload["data"]["user"]["email"] == DEMO_EMAIL


def test_oauth_token_form_authenticates_and_accesses_protected_endpoint():
    with TestClient(app) as client:
        response = client.post(
            "/api/auth/token",
            data={"username": DEMO_EMAIL, "password": DEMO_PASSWORD},
        )
        assert response.status_code == 200
        token = response.json()["access_token"]
        assert response.json()["token_type"] == "bearer"

        protected = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert protected.status_code == 200
    assert protected.json()["data"]["email"] == DEMO_EMAIL


def test_oauth_token_rejects_invalid_credentials():
    with TestClient(app) as client:
        response = client.post(
            "/api/auth/token",
            data={"username": DEMO_EMAIL, "password": "wrong-password"},
        )
    assert response.status_code == 401