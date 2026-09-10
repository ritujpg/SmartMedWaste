from fastapi.testclient import TestClient

from app.main import app


def test_facility_collector_tracking_and_emergency_flow():
    with TestClient(app) as client:
        def login(email):
            response = client.post("/api/auth/login", json={"email": email, "password": "demo123"})
            assert response.status_code == 200
            return response.json()["data"]["access_token"]

        facility_token = login("facility@smartmedwaste.demo")
        admin_token = login("admin@smartmedwaste.demo")
        collector_token = login("collector@smartmedwaste.demo")
        facility_headers = {"Authorization": f"Bearer {facility_token}"}
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        collector_headers = {"Authorization": f"Bearer {collector_token}"}

        waste = client.post("/api/waste", headers=facility_headers, json={"category": "YELLOW", "quantity_kg": 1}).json()["data"]
        request = client.post("/api/collection-requests", headers=facility_headers, json={"waste_id": waste["id"]}).json()["data"]
        collector_id = next(item["id"] for item in client.get("/api/collectors", headers=admin_headers).json()["data"]
                            if item["user_id"] == client.get("/api/auth/me", headers=collector_headers).json()["data"]["id"])
        assert client.post(f"/api/collection-requests/{request['id']}/assign", headers=admin_headers,
                           json={"collector_id": collector_id}).status_code == 200
        assert client.get(f"/api/collection-requests/{request['id']}", headers=collector_headers).status_code == 200
        assert client.post(f"/api/collection-requests/{request['id']}/scan?waste_id={waste['id']}", headers=collector_headers).status_code == 200
        for next_status in ("IN_TRANSIT", "DELIVERED", "PROCESSED"):
            assert client.patch(f"/api/collection-requests/{request['id']}", headers=collector_headers,
                                json={"status": next_status}).status_code == 200
        timeline = client.get(f"/api/tracking/waste/{waste['id']}", headers=collector_headers)
        assert timeline.status_code == 200
        assert len(timeline.json()["data"]) >= 5

        emergency = client.post("/api/emergencies", headers=facility_headers,
                                json={"waste_id": waste["id"], "message": "Emergency test"})
        assert emergency.status_code == 201
        assert client.get("/api/alerts", headers=collector_headers).status_code == 200


def test_collector_cannot_post_unassigned_tracking_event():
    with TestClient(app) as client:
        token = client.post("/api/auth/login", json={"email": "collector@smartmedwaste.demo", "password": "demo123"}).json()["data"]["access_token"]
        response = client.post("/api/tracking/events", headers={"Authorization": f"Bearer {token}"}, json={
            "waste_id": "00000000-0000-0000-0000-000000000000",
            "request_id": "00000000-0000-0000-0000-000000000000",
            "event_type": "tamper",
            "status": "PICKED_UP",
        })
    assert response.status_code in (403, 404)