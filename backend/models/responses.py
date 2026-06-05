"""Pydantic response models."""

from pydantic import BaseModel, Field


class SpeechResponse(BaseModel):
    category: str
    urgency: str


class GuidanceResponse(BaseModel):
    helpline: str
    steps: list[str]
    title: str | None = None
    guidance: str | None = None


class EscalationContact(BaseModel):
    name: str
    number: str
    type: str
    description: str | None = None


class EscalateResponse(BaseModel):
    priority_level: str
    emergency_contacts: list[EscalationContact]
    helpline_recommendations: list[EscalationContact]
    nearest_facilities: list[dict] = Field(default_factory=list)
    message: str


class ActionItem(BaseModel):
    id: str
    label: str
    icon: str
    type: str
    phoneNumber: str | None = None


class SubjectContext(BaseModel):
    relationship: str
    estimatedGender: str
    estimatedAgeRange: str
    confidence: str


class GuidanceStep(BaseModel):
    order: int
    instruction: str
    icon: str
    completed: bool | None = False


class Helpline(BaseModel):
    id: str
    name: str
    number: str
    category: str
    description: str | None = None
    available247: bool | None = True


class EmergencyAnalysisResponse(BaseModel):
    category: str
    urgency: str
    title: str
    summary: str
    subjectContext: SubjectContext | None = None
    actions: list[ActionItem]
    guidanceSteps: list[GuidanceStep] | None = None
    helplines: list[Helpline] | None = None


class GuidanceDetailResponse(BaseModel):
    category: str
    title: str
    steps: list[GuidanceStep]


class EmergencyCategory(BaseModel):
    id: str
    label: str
    icon: str
    description: str
    color: str | None = None


class HealthStatus(BaseModel):
    status: str


class TranslateResponse(BaseModel):
    translated_text: str
    source_language: str
    target_language: str
    provider: str
