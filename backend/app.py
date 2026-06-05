"""
JivAI – AI Crisis Response Companion
FastAPI backend entry point.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import escalate_router, emergency_router, guidance_router, speech_router
from utils.config import get_settings
from utils.dependencies import get_rag_retriever
from utils.logging import get_logger, setup_logging

setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info("Starting %s v%s", settings.app_name, settings.app_version)
    get_rag_retriever()
    logger.info("RAG index initialized")
    yield
    logger.info("Shutting down %s", settings.app_name)


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="JivAI Emergency Crisis Response API — classification, guidance, and escalation",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(speech_router)
    app.include_router(guidance_router)
    app.include_router(escalate_router)
    app.include_router(emergency_router)

    @app.get("/")
    async def root():
        return {
            "service": settings.app_name,
            "version": settings.app_version,
            "status": "running",
            "endpoints": {
                "speech": "POST /speech",
                "guidance": "POST /guidance",
                "escalate": "POST /escalate",
                "analyze": "POST /api/emergency/analyze",
                "health": "GET /api/healthz",
            },
        }

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "app:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )
