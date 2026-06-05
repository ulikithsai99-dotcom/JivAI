"""FastAPI dependency injection container."""

from functools import lru_cache

from services.classification_service import ClassificationService
from services.escalation_service import EscalationService
from services.guidance_service import GuidanceService
from services.interfaces.bhashini import BhashiniClient, LiveBhashiniClient, MockBhashiniClient
from services.interfaces.gemini import GeminiClient, LiveGeminiClient, MockGeminiClient
from services.interfaces.maps import LiveMapsClient, MapsClient, MockMapsClient
from services.knowledge_service import KnowledgeService
from services.translation_service import TranslationService
from rag.retriever import RAGRetriever
from utils.config import get_settings


@lru_cache
def get_knowledge_service() -> KnowledgeService:
    return KnowledgeService()


@lru_cache
def get_rag_retriever() -> RAGRetriever:
    return RAGRetriever(get_knowledge_service())


@lru_cache
def get_gemini_client() -> GeminiClient:
    settings = get_settings()
    if settings.use_mock_gemini or not settings.gemini_api_key:
        return MockGeminiClient()
    return LiveGeminiClient(api_key=settings.gemini_api_key, model=settings.gemini_model)


@lru_cache
def get_bhashini_client() -> BhashiniClient:
    settings = get_settings()
    if settings.use_mock_translation or not settings.bhashini_api_key:
        return MockBhashiniClient()
    return LiveBhashiniClient(
        api_key=settings.bhashini_api_key,
        user_id=settings.bhashini_user_id or "",
    )


@lru_cache
def get_maps_client() -> MapsClient:
    settings = get_settings()
    if settings.use_mock_maps or not settings.maps_api_key:
        return MockMapsClient()
    return LiveMapsClient(api_key=settings.maps_api_key)


@lru_cache
def get_translation_service() -> TranslationService:
    return TranslationService(get_bhashini_client())


@lru_cache
def get_classification_service() -> ClassificationService:
    return ClassificationService(get_knowledge_service(), get_rag_retriever(), get_gemini_client())


@lru_cache
def get_guidance_service() -> GuidanceService:
    return GuidanceService(get_knowledge_service(), get_rag_retriever())


@lru_cache
def get_escalation_service() -> EscalationService:
    return EscalationService(get_knowledge_service(), get_maps_client())
