"""
Pydantic schemas for project management.
"""

import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    repo_url: Optional[str] = None
    source_type: str = Field(default="github", pattern=r"^(github|zip)$")


class ProjectResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    repo_url: Optional[str]
    source_type: str
    detected_stack: Optional[str]
    subdomain: Optional[str]
    status: str
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    projects: list[ProjectResponse]
    total: int
