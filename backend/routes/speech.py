"""Speech processing endpoint."""

from fastapi import APIRouter, Depends, HTTPException

from models.requests import SpeechRequest
from models.responses import SpeechResponse
from services.classification_service import ClassificationService
from utils.dependencies import get_classification_service
from utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(tags=["speech"])


@router.post("/speech", response_model=SpeechResponse)
async def process_speech(
    body: SpeechRequest,
    classifier: ClassificationService = Depends(get_classification_service),
) -> SpeechResponse:
    try:
        result = await classifier.classify(body.transcript)
        logger.info(
            "Speech classified: category=%s urgency=%s",
            result.category_label,
            result.urgency_label,
        )
        return SpeechResponse(
            category=result.category_label,
            urgency=result.urgency_label,
        )
    except Exception as exc:
        logger.exception("Speech processing failed")
        raise HTTPException(status_code=500, detail="Speech processing failed") from exc
