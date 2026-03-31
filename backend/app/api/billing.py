"""
Billing API routes.
"""

from fastapi import APIRouter, Depends, Header, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.db.session import get_db
from app.db.models import User
from app.core.security import get_current_user
from app.services.billing_service import billing_service
from pydantic import BaseModel

router = APIRouter(prefix="/billing", tags=["Billing"])

class CheckoutResponse(BaseModel):
    url: str

@router.post(
    "/checkout",
    response_model=CheckoutResponse,
    summary="Generate a Stripe Subscription Checkout URL",
)
async def create_checkout(
    current_user: User = Depends(get_current_user),
):
    """
    Spawns a secure Stripe Check-out form to convert FREE to PRO users.
    """
    # Use environment base domains dynamically (in mock scenarios)
    success_url = "http://localhost:3000/dashboard/billing?status=success"
    cancel_url  = "http://localhost:3000/dashboard/billing?status=canceled"

    try:
        url = billing_service.create_checkout_session(
            user=current_user,
            success_url=success_url,
            cancel_url=cancel_url
        )
        return CheckoutResponse(url=url)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )

@router.post(
    "/webhook",
    summary="Stripe Notification Callback",
)
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Catches raw byte-signature webhooks from Stripe core directly to map back against the DB.
    """
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing signature header")

    payload = await request.body()
    try:
        # Hand off asynchronous webhook processing locally seamlessly
        res = await billing_service.handle_webhook(payload, stripe_signature, db)
        return {"received": True, "action": res}
    except ValueError as e:
        # Invalid signature / invalid payload
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Unexpected errors
        raise HTTPException(status_code=500, detail=f"Webhook exception: {str(e)}")

@router.get(
    "/status",
    summary="Check User Subscription Status",
)
async def get_subscription_status(
    current_user: User = Depends(get_current_user),
):
    """
    Allows the frontend to dynamically query if the user is Free, Pro, and their valid customer ID bounds.
    """
    return {
        "tier": current_user.tier,
        "customer_id": current_user.stripe_customer_id,
        "subscription_active": bool(current_user.stripe_subscription_id)
    }
