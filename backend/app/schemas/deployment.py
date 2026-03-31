"""
Pydantic schemas for deployments and logs.
"""

import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class DeploymentCreate(BaseModel):
    project_id: uuid.UUID


class LogEntry(BaseModel):
    id: uuid.UUID
    level: str
    source: str
    message: str
    timestamp: datetime

    model_config = {"from_attributes": True}


class DeploymentResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    status: str
    container_id: Optional[str]
    container_name: Optional[str]
    image_name: Optional[str]
    port: Optional[int]
    public_url: Optional[str]
    dockerfile_content: Optional[str]
    error_message: Optional[str]
    retry_count: int
    created_at: datetime
    finished_at: Optional[datetime]

    model_config = {"from_attributes": True}


class DeploymentLogsResponse(BaseModel):
    deployment_id: uuid.UUID
    status: str
    logs: list[LogEntry]
    total: int
