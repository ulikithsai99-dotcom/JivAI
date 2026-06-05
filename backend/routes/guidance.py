"""Guidance endpoint."""

from fastapi import APIRouter, Depends, HTTPException

from models.requests import GuidanceRequest
from models.responses import GuidanceResponse
from services.guidance_service import GuidanceService
from utils.dependencies import get_guidance_service
from utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(tags=["guidance"])


@router.post("/guidance", response_model=GuidanceResponse)
async def get_guidance(
    body: GuidanceRequest,
    guidance_service: GuidanceService = Depends(get_guidance_service),
) -> GuidanceResponse:
    try:
        result = guidance_service.get_guidance(body.category, body.transcript)
        logger.info("Guidance retrieved for category=%s", body.category)
        return GuidanceResponse(**result)
    except Exception as exc:
        logger.exception("Guidance retrieval failed")
        raise HTTPException(status_code=500, detail="Guidance retrieval failed") from exc
