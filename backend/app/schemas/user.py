"""
Pydantic schemas for user authentication and management.
"""

import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr


class OAuthLogin(BaseModel):
    email: EmailStr
    name: str
    provider: str


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    username: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse
