"""Guidance retrieval service with RAG augmentation."""

from services.knowledge_service import KnowledgeService
from rag.retriever import RAGRetriever
from utils.logging import get_logger

logger = get_logger(__name__)

STEP_ICONS = ["heart", "shield", "check-circle", "activity"]


class GuidanceService:
    def __init__(self, knowledge: KnowledgeService, rag: RAGRetriever) -> None:
        self._knowledge = knowledge
        self._rag = rag

    def get_guidance(self, category: str, transcript: str | None = None) -> dict:
        cat_id = self._knowledge.normalize_category(category)
        cat = self._knowledge.get_category(cat_id)

        if not cat:
            logger.warning("No guidance for category: %s", category)
            return {
                "helpline": "112",
                "steps": ["Call 112 for emergency assistance", "Stay calm and describe your situation"],
                "title": "Emergency Guidance",
                "guidance": None,
            }

        steps = self._rag.retrieve_steps(cat_id, transcript)
        rag_guidance = self._rag.retrieve(transcript or cat["label"], category=cat_id, top_k=2)

        return {
            "helpline": cat.get("helpline", "112"),
            "steps": steps,
            "title": f"{cat['label']} — Step-by-Step Guidance",
            "guidance": " ".join(rag_guidance) if rag_guidance else None,
        }

    def get_detailed_guidance(self, category: str) -> dict:
        cat_id = self._knowledge.normalize_category(category)
        cat = self._knowledge.get_category(cat_id)

        if not cat:
            return {"category": category, "title": "Emergency Guidance", "steps": []}

        steps = [
            {
                "order": idx + 1,
                "instruction": step,
                "icon": STEP_ICONS[idx % len(STEP_ICONS)],
                "completed": False,
            }
            for idx, step in enumerate(cat.get("steps", []))
        ]

        return {
            "category": cat_id,
            "title": f"{cat['label']} — Follow These Steps",
            "steps": steps,
        }

    def list_helplines(self, category: str | None = None) -> list[dict]:
        if category:
            cat_id = self._knowledge.normalize_category(category)
            cat = self._knowledge.get_category(cat_id)
            if cat:
                return [
                    {
                        "id": h.get("id", f"{cat_id}-{idx}"),
                        "name": h["name"],
                        "number": h["number"],
                        "category": cat_id,
                        "description": h.get("description"),
                        "available247": True,
                    }
                    for idx, h in enumerate(cat.get("helplines", []))
                ]

        helplines: list[dict] = []
        for cat in self._knowledge.categories.values():
            for h in cat.get("helplines", []):
                helplines.append({
                    "id": h.get("id", f"{cat['id']}-helpline"),
                    "name": h["name"],
                    "number": h["number"],
                    "category": cat["id"],
                    "description": h.get("description"),
                    "available247": True,
                })
        return helplines
