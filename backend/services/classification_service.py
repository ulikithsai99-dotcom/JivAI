"""Emergency classification and urgency detection."""

import re
from dataclasses import dataclass
from typing import Any

from services.interfaces.gemini import GeminiClient
from services.knowledge_service import KnowledgeService
from rag.retriever import RAGRetriever
from utils.logging import get_logger

logger = get_logger(__name__)

URGENCY_LABELS = {
    "critical": "Critical",
    "high": "High",
    "medium": "Medium",
    "low": "Low",
}


@dataclass
class ClassificationResult:
    category_id: str
    category_label: str
    urgency: str
    urgency_label: str
    title: str
    summary: str
    actions: list[dict[str, Any]]
    subject_context: dict[str, Any] | None


RELATIONSHIP_MAP: list[dict[str, Any]] = [
    {"patterns": [r"\b(grandfather|grandpa|grandad|nana|dada|thatha|dadu)\b"], "gender": "male", "age": "65–85 years", "confidence": "high"},
    {"patterns": [r"\b(grandmother|grandma|granny|nani|dadi|ammamma|aajji)\b"], "gender": "female", "age": "65–85 years", "confidence": "high"},
    {"patterns": [r"\b(father|dad|papa|appa|baba|pitaji)\b"], "gender": "male", "age": "50–70 years", "confidence": "high"},
    {"patterns": [r"\b(mother|mom|mum|mama|amma|mummy|mataji)\b"], "gender": "female", "age": "45–65 years", "confidence": "high"},
    {"patterns": [r"\b(husband|spouse)\b"], "gender": "male", "age": "30–55 years", "confidence": "high"},
    {"patterns": [r"\b(wife)\b"], "gender": "female", "age": "28–55 years", "confidence": "high"},
    {"patterns": [r"\b(brother|bhai)\b"], "gender": "male", "age": "15–40 years", "confidence": "high"},
    {"patterns": [r"\b(sister|didi|akka)\b"], "gender": "female", "age": "15–40 years", "confidence": "high"},
    {"patterns": [r"\b(son|beta)\b"], "gender": "male", "age": "10–25 years", "confidence": "high"},
    {"patterns": [r"\b(daughter|beti)\b"], "gender": "female", "age": "10–25 years", "confidence": "high"},
]


class ClassificationService:
    def __init__(
        self,
        knowledge: KnowledgeService,
        rag: RAGRetriever,
        gemini: GeminiClient,
    ) -> None:
        self._knowledge = knowledge
        self._rag = rag
        self._gemini = gemini

    def _extract_subject_context(self, transcript: str) -> dict[str, Any] | None:
        lower = transcript.lower()
        possessive = re.search(
            r"\bmy\s+(grandfather|grandpa|father|dad|mother|mom|husband|wife|brother|sister|son|daughter|child|baby)\b",
            lower,
        )
        word = possessive.group(1) if possessive else None

        for entry in RELATIONSHIP_MAP:
            for pattern in entry["patterns"]:
                target = word or lower
                match = re.search(pattern, target, re.IGNORECASE)
                if match:
                    return {
                        "relationship": match.group(1),
                        "estimatedGender": entry["gender"],
                        "estimatedAgeRange": entry["age"],
                        "confidence": entry["confidence"],
                    }
        return None

    def _keyword_classify(self, transcript: str) -> tuple[str, str]:
        lower = transcript.lower()
        best_id = "public_safety"
        best_score = 0

        for cat_id, cat in self._knowledge.categories.items():
            keywords = cat.get("keywords", [])
            score = sum(1 for kw in keywords if kw in lower)
            if score > best_score:
                best_score = score
                best_id = cat_id

        if best_score == 0:
            rag_hits = self._rag.retrieve(transcript, top_k=1)
            if rag_hits:
                for cat_id, cat in self._knowledge.categories.items():
                    if any(hit in cat.get("steps", []) + cat.get("guidance", []) for hit in rag_hits):
                        best_id = cat_id
                        break

        cat = self._knowledge.get_category(best_id)
        urgency = cat.get("urgency_default", "medium") if cat else "medium"

        critical_signals = ["collapsed", "unconscious", "not breathing", "heart attack", "suicide", "rape", "fire"]
        if any(signal in lower for signal in critical_signals):
            urgency = "critical"

        return best_id, urgency

    async def classify(self, transcript: str) -> ClassificationResult:
        category_id, urgency = self._keyword_classify(transcript)

        ai_result = await self._gemini.classify_emergency(transcript)
        if ai_result:
            if ai_result.get("category"):
                category_id = self._knowledge.normalize_category(ai_result["category"])
            if ai_result.get("urgency"):
                urgency = ai_result["urgency"].lower()

        cat = self._knowledge.get_category(category_id)
        if not cat:
            category_id = "public_safety"
            cat = self._knowledge.get_category(category_id)

        assert cat is not None
        subject_context = self._extract_subject_context(transcript)

        return ClassificationResult(
            category_id=category_id,
            category_label=cat["label"],
            urgency=urgency,
            urgency_label=URGENCY_LABELS.get(urgency, "High"),
            title=f"{cat['label']} Detected",
            summary=f"JivAI has detected a {cat['label'].lower()} situation. Immediate guidance is available.",
            actions=cat.get("actions", []),
            subject_context=subject_context,
        )
