"""API route modules."""

from routes.speech import router as speech_router
from routes.guidance import router as guidance_router
from routes.escalate import router as escalate_router
from routes.emergency import router as emergency_router

__all__ = ["speech_router", "guidance_router", "escalate_router", "emergency_router"]
