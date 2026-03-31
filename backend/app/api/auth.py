"""
Authentication API routes.
POST /auth/oauth  — seamless oauth bridging
GET  /auth/me       — get the current user's profile
"""

from fastapi import APIRouter, Depends, status, Response, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import User
from app.schemas.user import UserResponse, TokenResponse, OAuthLogin
from app.services.auth_service import oauth_login_user
from app.core.security import get_current_user, decode_token, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

def set_auth_cookies(response: Response, token_data: TokenResponse):
    """Utility to securely bind HTTPOnly cookies"""
    response.set_cookie(
        key="access_token",
        value=token_data.access_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=15 * 60, # 15 minutes
    )
    response.set_cookie(
        key="refresh_token",
        value=token_data.refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=7 * 24 * 60 * 60, # 7 days
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

@router.post(
    "/oauth",
    response_model=TokenResponse,
    summary="OAuth logic via NextAuth token handling"
)
async def oauth_login_endpoint(
    data: OAuthLogin, 
    response: Response, 
    db: AsyncSession = Depends(get_db)
):
    token_data = await oauth_login_user(db, data)
    set_auth_cookies(response, token_data)
    return token_data

@router.post(
    "/refresh",
    summary="Refresh access token securely via HttpOnly cookie",
)
async def refresh_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    refresh_token_cookie = request.cookies.get("refresh_token")
    if not refresh_token_cookie:
        raise HTTPException(status_code=401, detail="Missing refresh token")
        
    payload = decode_token(refresh_token_cookie)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Malformed payload")
        
    # verify user exists
    import uuid
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User inactive or missing")
        
    new_access = create_access_token(str(user.id))
    response.set_cookie(
        key="access_token",
        value=new_access,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=15 * 60,
    )
    return {"message": "ok"}

@router.post(
    "/logout",
    summary="Logout securely by wiping HttpOnly cookies",
)
async def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"message": "ok"}
