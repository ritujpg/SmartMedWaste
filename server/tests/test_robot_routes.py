import asyncio

import pytest
from fastapi import HTTPException

from app.api import robot_routes
from app.services.robot_integration import RobotIntegration


def setup_function():
    robot_routes.robot_integration = RobotIntegration()


def test_robot_cannot_heartbeat_before_authorization():
    with pytest.raises(HTTPException) as error:
        asyncio.run(robot_routes.robot_heartbeat({"robot_id": "robot-1", "scanning": True}, None))

    assert error.value.status_code == 409


def test_authorize_heartbeat_and_emergency_stop():
    result = asyncio.run(robot_routes.authorize_robot({"robot_id": "robot-1"}, {"role": "administrator"}))
    assert result["armed"] is True
    assert result["status"] == "Idle"

    heartbeat = asyncio.run(robot_routes.robot_heartbeat({"robot_id": "robot-1", "scanning": True}, None))
    assert heartbeat["status"] == "Scanning"

    mission = asyncio.run(robot_routes.robot_mission_start({"robot_id": "robot-1", "mission_id": "REQ-1"}, None))
    assert mission["status"] == "On Mission"
    assert mission["mission_id"] == "REQ-1"

    stopped = asyncio.run(robot_routes.emergency_stop_robot({"role": "administrator"}))
    assert stopped["status"] == "Error"
    assert stopped["armed"] is False
    assert stopped["emergency_stop"] is True


def test_robot_device_key_is_required(monkeypatch):
    monkeypatch.setattr(robot_routes.settings, "ROBOT_API_KEY", "test-device-key")

    with pytest.raises(HTTPException) as error:
        robot_routes.require_robot_device("wrong-key")

    assert error.value.status_code == 401