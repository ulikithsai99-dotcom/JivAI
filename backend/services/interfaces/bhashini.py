"""Bhashini translation API abstraction with mock implementation."""

from abc import ABC, abstractmethod

from utils.logging import get_logger

logger = get_logger(__name__)


class BhashiniClient(ABC):
    @abstractmethod
    async def translate(self, text: str, source_language: str, target_language: str) -> str:
        """Translate text between languages."""


class MockBhashiniClient(BhashiniClient):
    _MOCK_TRANSLATIONS: dict[tuple[str, str], str] = {
        ("Call ambulance immediately", "hi"): "तुरंत एम्बुलेंस बुलाएं",
        ("Stay calm", "hi"): "शांत रहें",
        ("Check breathing", "hi"): "सांस की जांच करें",
    }

    async def translate(self, text: str, source_language: str, target_language: str) -> str:
        if source_language == target_language:
            return text
        key = (text, target_language)
        translated = self._MOCK_TRANSLATIONS.get(key)
        if translated:
            logger.debug("MockBhashini: returning cached translation")
            return translated
        logger.debug("MockBhashini: passthrough for %s -> %s", source_language, target_language)
        return f"[{target_language}] {text}"


class LiveBhashiniClient(BhashiniClient):
    def __init__(self, api_key: str, user_id: str) -> None:
        self._api_key = api_key
        self._user_id = user_id

    async def translate(self, text: str, source_language: str, target_language: str) -> str:
        import httpx

        url = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
        headers = {
            "Authorization": self._api_key,
            "Content-Type": "application/json",
            "userID": self._user_id,
        }
        payload = {
            "pipelineTasks": [
                {
                    "taskType": "translation",
                    "config": {
                        "language": {
                            "sourceLanguage": source_language,
                            "targetLanguage": target_language,
                        }
                    }
                }
            ],
            "inputData": {"input": [{"source": text}]},
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            return data["pipelineResponse"][0]["output"][0]["target"]
