"""Escalation endpoint."""

from fastapi import APIRouter, Depends, HTTPException

from models.requests import EscalateRequest
from models.responses import EscalateResponse
from services.escalation_service import EscalationService
from utils.dependencies import get_escalation_service
from utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(tags=["escalation"])


@router.post("/escalate", response_model=EscalateResponse)
async def escalate_emergency(
    body: EscalateRequest,
    escalation_service: EscalationService = Depends(get_escalation_service),
) -> EscalateResponse:
    try:
        result = await escalation_service.escalate(
            category=body.category,
            urgency=body.urgency or "high",
            transcript=body.transcript,
            latitude=body.latitude,
            longitude=body.longitude,
        )
        logger.info("Escalation generated for category=%s", body.category)
        return EscalateResponse(**result)
    except Exception as exc:
        logger.exception("Escalation failed")
        raise HTTPException(status_code=500, detail="Escalation failed") from exc
