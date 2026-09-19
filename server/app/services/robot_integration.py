from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from threading import Lock
from typing import Any


ROBOT_STATES = {"Offline", "Idle", "Scanning", "On Mission", "Error"}


@dataclass
class RobotSnapshot:
    robot_id: str = "robot-1"
    status: str = "Offline"
    armed: bool = False
    emergency_stop: bool = False
    mission_id: str | None = None
    last_seen: str | None = None
    last_result: dict[str, Any] | None = None
    error: str | None = None


class RobotIntegration:
    """Transport-neutral state bridge for a future onboard robot service.

    State is intentionally in-memory until a robot/device table and durable
    command channel are introduced. It represents device heartbeats/results,
    not a claim that robot hardware is connected.
    """

    def __init__(self) -> None:
        self._snapshot = RobotSnapshot()
        self._lock = Lock()

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            snapshot = asdict(self._snapshot)
            if self._is_offline(snapshot["last_seen"]):
                snapshot["status"] = "Offline"
            return snapshot

    def authorize(self, robot_id: str) -> dict[str, Any]:
        with self._lock:
            if robot_id != self._snapshot.robot_id:
                raise ValueError("Unknown robot")
            self._snapshot.armed = True
            self._snapshot.emergency_stop = False
            self._snapshot.error = None
            self._snapshot.status = "Idle"
            return asdict(self._snapshot)

    def disarm(self) -> dict[str, Any]:
        with self._lock:
            self._snapshot.armed = False
            self._snapshot.mission_id = None
            if self._snapshot.status != "Offline":
                self._snapshot.status = "Idle"
            return asdict(self._snapshot)

    def emergency_stop(self) -> dict[str, Any]:
        with self._lock:
            self._snapshot.armed = False
            self._snapshot.emergency_stop = True
            self._snapshot.mission_id = None
            self._snapshot.status = "Error"
            self._snapshot.error = "Emergency stop activated"
            return asdict(self._snapshot)

    def heartbeat(self, robot_id: str, scanning: bool, mission_id: str | None) -> dict[str, Any]:
        with self._lock:
            if robot_id != self._snapshot.robot_id:
                raise ValueError("Unknown robot")
            if not self._snapshot.armed or self._snapshot.emergency_stop:
                raise PermissionError("Robot is not authorized or is emergency-stopped")
            self._snapshot.last_seen = datetime.now(timezone.utc).isoformat()
            self._snapshot.mission_id = mission_id
            self._snapshot.status = "On Mission" if mission_id else ("Scanning" if scanning else "Idle")
            self._snapshot.error = None
            return asdict(self._snapshot)

    def record_result(self, robot_id: str, result: dict[str, Any], mission_id: str | None) -> dict[str, Any]:
        with self._lock:
            if robot_id != self._snapshot.robot_id:
                raise ValueError("Unknown robot")
            if not self._snapshot.armed or self._snapshot.emergency_stop:
                raise PermissionError("Robot is not authorized or is emergency-stopped")
            self._snapshot.last_seen = datetime.now(timezone.utc).isoformat()
            self._snapshot.mission_id = mission_id
            self._snapshot.status = "On Mission" if mission_id else "Scanning"
            self._snapshot.last_result = result
            self._snapshot.error = None
            return asdict(self._snapshot)

    def record_error(self, message: str) -> dict[str, Any]:
        with self._lock:
            self._snapshot.armed = False
            self._snapshot.status = "Error"
            self._snapshot.error = message
            return asdict(self._snapshot)

    @staticmethod
    def _is_offline(last_seen: str | None) -> bool:
        if not last_seen:
            return True
        try:
            seen_at = datetime.fromisoformat(last_seen)
        except ValueError:
            return True
        return (datetime.now(timezone.utc) - seen_at).total_seconds() > 15


robot_integration = RobotIntegration()