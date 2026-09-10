from dataclasses import dataclass


@dataclass
class RoutePlan:
    ordered_stops: list[str]
    total_distance_km: float
    estimated_duration_minutes: int
    traffic_condition: str
    route_efficiency: float


class RoutingService:
    async def optimize(self, request_ids: list[str]) -> RoutePlan:
        count = len(request_ids)
        return RoutePlan(request_ids, round(count * 4.2, 2), count * 12, "MODERATE", 86.0 if count else 0.0)
