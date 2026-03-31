"""
Pydantic schemas for AI analysis module.
"""

import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class AIAnalyzeRequest(BaseModel):
    deployment_id: uuid.UUID
    additional_context: Optional[str] = None


class AISuggestionResponse(BaseModel):
    id: uuid.UUID
    deployment_id: uuid.UUID
    root_cause: str
    fix_suggestion: str
    commands: Optional[str]
    confidence: str
    is_applied: bool
    applied_result: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class AIAnalyzeResponse(BaseModel):
    suggestion: AISuggestionResponse
    logs_analyzed: int

class AIArchitectRecommendation(BaseModel):
    category: str
    suggestion: str
    impact: str


class AIArchitectResponse(BaseModel):
    score: int
    archetype: str
    recommendations: list[AIArchitectRecommendation]
    blueprint_summary: str
