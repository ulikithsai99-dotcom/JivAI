"""Gemini API abstraction with mock implementation."""

from abc import ABC, abstractmethod

from utils.logging import get_logger

logger = get_logger(__name__)


class GeminiClient(ABC):
    @abstractmethod
    async def classify_emergency(self, transcript: str) -> dict | None:
        """Return optional AI-enhanced classification override."""


class MockGeminiClient(GeminiClient):
    async def classify_emergency(self, transcript: str) -> dict | None:
        logger.debug("MockGeminiClient: skipping AI classification for '%s...'", transcript[:40])
        return None


class LiveGeminiClient(GeminiClient):
    def __init__(self, api_key: str, model: str = "gemini-2.0-flash") -> None:
        self._api_key = api_key
        self._model = model

    async def classify_emergency(self, transcript: str) -> dict | None:
        try:
            import google.generativeai as genai
            import json
            import re

            genai.configure(api_key=self._api_key)
            model = genai.GenerativeModel(self._model)
            prompt = (
                "Classify this emergency transcript into one category "
                "(Medical Emergency, Cybercrime, Women Safety, Lost Documents, Disaster, "
                "Public Safety, Mental Health) and urgency (critical, high, medium, low). "
                f"Transcript: {transcript}\n"
                'Respond as JSON: {"category": "...", "urgency": "..."}'
            )
            response = await model.generate_content_async(prompt)
            text = response.text or ""
            logger.info("Gemini classification received")
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                return json.loads(match.group())
        except Exception as exc:
            logger.warning("Gemini classification failed: %s", exc)
        return None
