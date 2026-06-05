"""Pydantic request models."""

from pydantic import BaseModel, Field


class SpeechRequest(BaseModel):
    transcript: str = Field(..., min_length=1, description="User's spoken emergency description")
    language: str | None = Field(default="en", description="ISO language code")


class GuidanceRequest(BaseModel):
    category: str = Field(..., min_length=1, description="Emergency category label or ID")
    transcript: str | None = Field(default=None, description="Optional transcript for RAG retrieval")
    language: str | None = Field(default="en")


class EscalateRequest(BaseModel):
    category: str = Field(..., min_length=1)
    urgency: str | None = Field(default="high")
    transcript: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class EmergencyAnalyzeRequest(BaseModel):
    transcript: str = Field(..., min_length=1)
    language: str | None = None


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1)
    source_language: str = Field(default="en")
    target_language: str = Field(default="hi")
