"""Government knowledge base loader and offline cache."""

import json
from pathlib import Path
from typing import Any

from utils.config import get_settings
from utils.logging import get_logger

logger = get_logger(__name__)

CATEGORY_ALIASES: dict[str, str] = {
    "medical emergency": "medical",
    "medical": "medical",
    "cybercrime": "cybercrime",
    "financial": "cybercrime",
    "women safety": "women",
    "women": "women",
    "lost documents": "documents",
    "documents": "documents",
    "disaster": "disaster",
    "public safety": "public_safety",
    "crime": "public_safety",
    "public_safety": "public_safety",
    "mental health": "mental_health",
    "mental_health": "mental_health",
    "fire": "disaster",
    "general": "public_safety",
}

KNOWLEDGE_FILES = [
    "medical.json",
    "cybercrime.json",
    "documents.json",
    "women_safety.json",
    "disaster.json",
    "public_safety.json",
    "mental_health.json",
]


class KnowledgeService:
    def __init__(self) -> None:
        settings = get_settings()
        self._data_dir = settings.data_dir
        self._categories: dict[str, dict[str, Any]] = {}
        self._cache: dict[str, Any] = {}
        self._load()

    def _load(self) -> None:
        for filename in KNOWLEDGE_FILES:
            path = self._data_dir / filename
            if not path.exists():
                logger.warning("Knowledge file missing: %s", path)
                continue
            with path.open(encoding="utf-8") as f:
                data = json.load(f)
                self._categories[data["id"]] = data
                logger.info("Loaded knowledge base: %s", data["label"])

        cache_path = self._data_dir / "emergency_cache.json"
        if cache_path.exists():
            with cache_path.open(encoding="utf-8") as f:
                self._cache = json.load(f)

    def normalize_category(self, category: str) -> str:
        key = category.strip().lower()
        return CATEGORY_ALIASES.get(key, key)

    def get_category(self, category_id: str) -> dict[str, Any] | None:
        normalized = self.normalize_category(category_id)
        return self._categories.get(normalized)

    def list_categories(self) -> list[dict[str, Any]]:
        return [
            {
                "id": cat["id"],
                "label": cat["label"],
                "icon": cat.get("icon", "alert-triangle"),
                "description": cat.get("description", ""),
                "color": cat.get("color"),
            }
            for cat in self._categories.values()
        ]

    def get_all_documents_for_rag(self) -> list[dict[str, str]]:
        documents: list[dict[str, str]] = []
        for cat_id, cat in self._categories.items():
            for step in cat.get("steps", []):
                documents.append({
                    "category": cat_id,
                    "text": step,
                    "type": "step",
                })
            for guidance in cat.get("guidance", []):
                documents.append({
                    "category": cat_id,
                    "text": guidance,
                    "type": "guidance",
                })
            documents.append({
                "category": cat_id,
                "text": cat.get("description", ""),
                "type": "description",
            })
        return documents

    def get_offline_cache(self) -> dict[str, Any]:
        return self._cache

    @property
    def categories(self) -> dict[str, dict[str, Any]]:
        return self._categories

    def get_priority_helplines(self, urgency: str) -> list[str]:
        matrix = self._cache.get("priority_matrix", {})
        return matrix.get(urgency, matrix.get("high", ["112"]))
