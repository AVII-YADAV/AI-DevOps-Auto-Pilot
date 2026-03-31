"""
Stripe Billing Service.
Handles checkout sessions, customer tracking, and webhook execution.
"""

import stripe
import logging
from typing import Optional, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import get_settings
from app.db.models import User

settings = get_settings()
logger = logging.getLogger(__name__)

# Assign the API Key natively if available
if settings.STRIPE_SECRET_KEY:
    stripe.api_key = settings.STRIPE_SECRET_KEY

class BillingService:
    """Production-grade Stripe integration."""

    def create_checkout_session(self, user: User, success_url: str, cancel_url: str) -> str:
        """Create a Stripe checkout session for the PRO tier."""
        if not stripe.api_key:
            logger.warning("Stripe API key not configured, returning mock checkout URL.")
            return f"{success_url}?session_id=mock_session_complete"

        if not settings.STRIPE_PRO_PRICE_ID:
            logger.warning("No STRIPE_PRO_PRICE_ID set.")
            raise ValueError("Stripe Pro Price ID not configured")

        try:
            # 1. Provide deterministic customer ID if we have it
            customer_data = {}
            if user.stripe_customer_id:
                customer_data["customer"] = user.stripe_customer_id
            else:
                customer_data["customer_email"] = user.email

            # 2. Spawn the session
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price': settings.STRIPE_PRO_PRICE_ID,
                    'quantity': 1,
                }],
                mode='subscription',
                success_url=f"{success_url}?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=cancel_url,
                client_reference_id=str(user.id),
                **customer_data,
            )
            return session.url
        except Exception as e:
            logger.error(f"Failed to create Stripe Checkout Session: {e}")
            raise RuntimeError(f"Checkout generation failed: {str(e)}")

    async def handle_webhook(self, payload: bytes, sig_header: str, db: AsyncSession) -> Dict[str, str]:
        """Safely parse and apply Stripe webhooks (e.g., successful payment)."""
        if not stripe.api_key or not settings.STRIPE_WEBHOOK_SECRET:
            logger.warning("Ignoring webhook: Stripe keys unconfigured.")
            return {"status": "ignored"}

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError as e:
            logger.error("Invalid Webhook payload")
            raise ValueError("Invalid webhook payload") from e
        except stripe.error.SignatureVerificationError as e:
            logger.error("Invalid Webhook signature")
            raise ValueError("Invalid signature validation") from e

        # Handle valid checkout completions
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            await self._upgrade_user_tier(
                db=db,
                user_id=session.get('client_reference_id'),
                customer_id=session.get('customer'),
                subscription_id=session.get('subscription')
            )
        elif event['type'] == 'customer.subscription.deleted':
            sub = event['data']['object']
            await self._downgrade_user_tier(db, customer_id=sub.get('customer'))

        return {"status": "success"}

    async def _upgrade_user_tier(self, db: AsyncSession, user_id: str, customer_id: str, subscription_id: str):
        if not user_id:
            logger.warning("Cannot upgrade user missing client_reference_id mapping.")
            return

        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        if user:
            user.tier = "pro"
            user.stripe_customer_id = customer_id
            user.stripe_subscription_id = subscription_id
            await db.commit()
            logger.info(f"Successfully upgraded user {user.email} -> PRO.")

    async def _downgrade_user_tier(self, db: AsyncSession, customer_id: str):
        if not customer_id:
            return

        result = await db.execute(select(User).where(User.stripe_customer_id == customer_id))
        user = result.scalars().first()
        if user:
            user.tier = "free"
            user.stripe_subscription_id = None
            await db.commit()
            logger.info(f"Automatically downgraded user {user.email} -> FREE.")

billing_service = BillingService()
