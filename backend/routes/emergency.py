"""Compatibility routes matching existing JivAI OpenAPI contract."""

from fastapi import APIRouter, Depends, HTTPException

from models.requests import EmergencyAnalyzeRequest, TranslateRequest
from models.responses import (
    EmergencyAnalysisResponse,
    EmergencyCategory,
    GuidanceDetailResponse,
    HealthStatus,
    Helpline,
    TranslateResponse,
)
from services.classification_service import ClassificationService
from services.guidance_service import GuidanceService
from services.knowledge_service import KnowledgeService
from services.translation_service import TranslationService
from utils.dependencies import (
    get_classification_service,
    get_guidance_service,
    get_knowledge_service,
    get_translation_service,
)
from utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api", tags=["emergency-compat"])


@router.get("/healthz", response_model=HealthStatus)
async def health_check() -> HealthStatus:
    return HealthStatus(status="ok")


@router.post("/emergency/analyze", response_model=EmergencyAnalysisResponse)
async def analyze_emergency(
    body: EmergencyAnalyzeRequest,
    classifier: ClassificationService = Depends(get_classification_service),
    guidance_service: GuidanceService = Depends(get_guidance_service),
) -> EmergencyAnalysisResponse:
    try:
        result = await classifier.classify(body.transcript)
        guidance = guidance_service.get_detailed_guidance(result.category_id)
        helplines = guidance_service.list_helplines(result.category_id)

        return EmergencyAnalysisResponse(
            category=result.category_id,
            urgency=result.urgency,
            title=result.title,
            summary=result.summary,
            subjectContext=result.subject_context,
            actions=result.actions,
            guidanceSteps=guidance.get("steps"),
            helplines=helplines,
        )
    except Exception as exc:
        logger.exception("Emergency analysis failed")
        raise HTTPException(status_code=500, detail="Emergency analysis failed") from exc


@router.get("/emergency/guidance/{category}", response_model=GuidanceDetailResponse)
async def get_guidance_by_category(
    category: str,
    guidance_service: GuidanceService = Depends(get_guidance_service),
) -> GuidanceDetailResponse:
    result = guidance_service.get_detailed_guidance(category)
    if not result.get("steps"):
        raise HTTPException(status_code=404, detail="No guidance found for this category")
    return GuidanceDetailResponse(**result)


@router.get("/emergency/helplines", response_model=list[Helpline])
async def list_helplines(
    category: str | None = None,
    guidance_service: GuidanceService = Depends(get_guidance_service),
) -> list[Helpline]:
    return guidance_service.list_helplines(category)


@router.get("/emergency/categories", response_model=list[EmergencyCategory])
async def list_categories(
    knowledge: KnowledgeService = Depends(get_knowledge_service),
) -> list[EmergencyCategory]:
    return knowledge.list_categories()


@router.post("/translate", response_model=TranslateResponse)
async def translate_response(
    body: TranslateRequest,
    translation: TranslationService = Depends(get_translation_service),
) -> TranslateResponse:
    result = await translation.translate(body.text, body.source_language, body.target_language)
    return TranslateResponse(**result)
