"""Maps API abstraction with mock implementation."""

from abc import ABC, abstractmethod

from utils.logging import get_logger

logger = get_logger(__name__)


class MapsClient(ABC):
    @abstractmethod
    async def find_nearby_facilities(
        self,
        facility_type: str,
        latitude: float | None = None,
        longitude: float | None = None,
    ) -> list[dict]:
        """Find nearby emergency facilities."""


class MockMapsClient(MapsClient):
    _FACILITIES: dict[str, list[dict]] = {
        "hospital": [
            {"name": "City General Hospital", "distance_km": 1.2, "address": "Main Road"},
            {"name": "Apollo Emergency Centre", "distance_km": 2.8, "address": "Ring Road"},
        ],
        "police": [
            {"name": "Central Police Station", "distance_km": 0.8, "address": "Civil Lines"},
        ],
        "shelter": [
            {"name": "NDRF Relief Camp", "distance_km": 3.5, "address": "Community Hall"},
        ],
    }

    async def find_nearby_facilities(
        self,
        facility_type: str,
        latitude: float | None = None,
        longitude: float | None = None,
    ) -> list[dict]:
        logger.debug("MockMaps: returning facilities for type=%s", facility_type)
        return self._FACILITIES.get(facility_type, [])


class LiveMapsClient(MapsClient):
    def __init__(self, api_key: str) -> None:
        self._api_key = api_key

    async def find_nearby_facilities(
        self,
        facility_type: str,
        latitude: float | None = None,
        longitude: float | None = None,
    ) -> list[dict]:
        import httpx

        if latitude is None or longitude is None:
            return []

        type_map = {
            "hospital": "hospital",
            "police": "police",
            "shelter": "community_center",
        }
        place_type = type_map.get(facility_type, "hospital")
        url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
        params = {
            "key": self._api_key,
            "location": f"{latitude},{longitude}",
            "radius": 5000,
            "type": place_type,
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            return [
                {
                    "name": place.get("name"),
                    "address": place.get("vicinity"),
                    "distance_km": None,
                }
                for place in data.get("results", [])[:5]
            ]
