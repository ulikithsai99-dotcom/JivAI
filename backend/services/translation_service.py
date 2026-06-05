"""Multilingual translation service abstraction."""

from services.interfaces.bhashini import BhashiniClient
from utils.logging import get_logger

logger = get_logger(__name__)


class TranslationService:
    def __init__(self, bhashini: BhashiniClient) -> None:
        self._client = bhashini

    async def translate(self, text: str, source_language: str, target_language: str) -> dict:
        translated = await self._client.translate(text, source_language, target_language)
        provider = type(self._client).__name__
        logger.debug("Translated text via %s", provider)
        return {
            "translated_text": translated,
            "source_language": source_language,
            "target_language": target_language,
            "provider": provider,
        }
