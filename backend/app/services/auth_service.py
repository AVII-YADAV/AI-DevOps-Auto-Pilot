"""
Authentication service: user registration and login logic.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.db.models import User
from app.schemas.user import UserResponse, TokenResponse, OAuthLogin
from app.core.security import (
    create_access_token,
    create_refresh_token,
)
import urllib.parse

async def oauth_login_user(db: AsyncSession, data: OAuthLogin) -> TokenResponse:
    """Handle OAuth login/signup. Generate user seamlessly without password."""
    # Find active user by email directly
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user:
        # User doesn't exist, magically create them dynamically
        # Cleanse name into a valid username payload avoiding collision
        base_username = urllib.parse.quote(data.name.replace(" ", "_").lower(), safe="")
        
        # Check collision loop loosely (assume direct hit for simplicity, or append random)
        collision = await db.execute(select(User).where(User.username == base_username))
        if collision.scalar_one_or_none():
            import uuid
            base_username = f"{base_username}_{str(uuid.uuid4())[:6]}"
            
        user = User(
            email=data.email,
            username=base_username,
            provider=data.provider,
            oauth_id=data.email # Just mapping identifier roughly
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
    
    # Generate tokens organically
    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )
