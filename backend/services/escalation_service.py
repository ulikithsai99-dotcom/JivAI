"""Emergency escalation recommendations."""

from services.interfaces.maps import MapsClient
from services.knowledge_service import KnowledgeService
from utils.logging import get_logger

logger = get_logger(__name__)

FACILITY_TYPE_MAP = {
    "medical": "hospital",
    "women": "police",
    "public_safety": "police",
    "disaster": "shelter",
    "mental_health": "hospital",
    "cybercrime": "police",
    "documents": "police",
}

PRIORITY_MAP = {
    "critical": "P1 — Immediate Response Required",
    "high": "P2 — Urgent Response",
    "medium": "P3 — Standard Response",
    "low": "P4 — Advisory Response",
}


class EscalationService:
    def __init__(self, knowledge: KnowledgeService, maps: MapsClient) -> None:
        self._knowledge = knowledge
        self._maps = maps

    async def escalate(
        self,
        category: str,
        urgency: str = "high",
        transcript: str | None = None,
        latitude: float | None = None,
        longitude: float | None = None,
    ) -> dict:
        cat_id = self._knowledge.normalize_category(category)
        cat = self._knowledge.get_category(cat_id)
        cache = self._knowledge.get_offline_cache()

        if not cat:
            cat = self._knowledge.get_category("public_safety")
            cat_id = "public_safety"

        assert cat is not None
        urgency = urgency.lower()
        priority = PRIORITY_MAP.get(urgency, PRIORITY_MAP["high"])

        emergency_contacts = [
            {
                "name": h["name"],
                "number": h["number"],
                "type": "helpline",
                "description": h.get("description"),
            }
            for h in cat.get("helplines", [])
        ]

        priority_numbers = self._knowledge.get_priority_helplines(urgency)
        helpline_recommendations = [
            {
                "name": item["name"],
                "number": item["number"],
                "type": item.get("type", "emergency"),
                "description": f"Priority helpline for {urgency} urgency",
            }
            for item in cache.get("universal_helplines", [])
            if item["number"] in priority_numbers
        ]

        facility_type = FACILITY_TYPE_MAP.get(cat_id, "hospital")
        nearest = await self._maps.find_nearby_facilities(facility_type, latitude, longitude)

        quick_action = cache.get("quick_actions", {}).get(cat_id, "Call 112 immediately.")

        logger.info("Escalation generated for category=%s urgency=%s", cat_id, urgency)

        return {
            "priority_level": priority,
            "emergency_contacts": emergency_contacts,
            "helpline_recommendations": helpline_recommendations,
            "nearest_facilities": nearest,
            "message": quick_action,
        }
