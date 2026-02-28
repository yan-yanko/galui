"""
Billing & Auth routes.

POST /api/v1/auth/signup          → create account (email + password)
POST /api/v1/auth/login           → email + password → returns api_key
POST /api/v1/auth/magic-link      → send magic link email
GET  /api/v1/auth/magic-verify    → verify token → returns api_key
POST /api/v1/billing/checkout     → create Stripe Checkout session
GET  /api/v1/billing/portal       → Stripe Customer Portal (manage subscription)
POST /api/v1/billing/webhook      → Stripe webhook (checkout.session.completed, etc.)
GET  /api/v1/billing/plans        → list available plans + prices
"""
import logging
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.services.tenant import TenantService

logger = logging.getLogger(__name__)
router = APIRouter()
tenant_service = TenantService()


# ── Pydantic models ──────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    name: str
    email: str
    password: Optional[str] = None   # optional — magic link flow skips password


class LoginRequest(BaseModel):
    email: str
    password: str


class MagicLinkRequest(BaseModel):
    email: str


class CheckoutRequest(BaseModel):
    plan: str          # starter_monthly | starter_yearly | pro_monthly | pro_yearly
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


# ── Plans catalogue ──────────────────────────────────────────────────────────

PLANS = [
    {
        "id": "starter_monthly",
        "plan": "starter",
        "name": "Starter",
        "billing": "monthly",
        "price_usd": 9,
        "price_display": "$9/mo",
        "sites": 1,
        "js_enabled": True,
        "rescan": "weekly",
        "highlight": False,
        "features": [
            "1 site with JS activation",
            "Unlimited scans",
            "AI agent analytics",
            "Auto llms.txt serving",
            "WebMCP registration",
            "Weekly auto-rescan",
        ]
    },
    {
        "id": "starter_yearly",
        "plan": "starter",
        "name": "Starter",
        "billing": "yearly",
        "price_usd": 79,
        "price_display": "$79/yr",
        "sites": 1,
        "js_enabled": True,
        "rescan": "weekly",
        "highlight": False,
        "features": [
            "1 site with JS activation",
            "Unlimited scans",
            "AI agent analytics",
            "Auto llms.txt serving",
            "WebMCP registration",
            "Weekly auto-rescan",
            "Save 27% vs monthly",
        ]
    },
    {
        "id": "pro_monthly",
        "plan": "pro",
        "name": "Pro",
        "billing": "monthly",
        "price_usd": 29,
        "price_display": "$29/mo",
        "sites": 10,
        "js_enabled": True,
        "rescan": "daily",
        "highlight": True,
        "features": [
            "10 sites with JS activation",
            "Unlimited scans",
            "AI agent analytics",
            "Auto llms.txt serving",
            "WebMCP registration",
            "Daily auto-rescan",
            "Score badge embed",
            "Priority crawl",
        ]
    },
    {
        "id": "pro_yearly",
        "plan": "pro",
        "name": "Pro",
        "billing": "yearly",
        "price_usd": 249,
        "price_display": "$249/yr",
        "sites": 10,
        "js_enabled": True,
        "rescan": "daily",
        "highlight": True,
        "features": [
            "10 sites with JS activation",
            "Unlimited scans",
            "AI agent analytics",
            "Auto llms.txt serving",
            "WebMCP registration",
            "Daily auto-rescan",
            "Score badge embed",
            "Priority crawl",
            "Save 28% vs monthly",
        ]
    },
    {
        "id": "agency_yearly",
        "plan": "agency",
        "name": "Agency",
        "billing": "yearly",
        "price_usd": 799,
        "price_display": "$799/yr",
        "sites": 999,
        "js_enabled": True,
        "rescan": "daily",
        "highlight": False,
        "features": [
            "Unlimited sites",
            "All Pro features",
            "White-label badge",
            "API access",
            "Priority support",
            "Custom SLA",
        ]
    },
]

PLAN_ID_TO_STRIPE_PRICE = {}  # populated from settings at first request


def _get_stripe_price_id(plan_id: str) -> Optional[str]:
    from app.config import settings
    mapping = {
        "starter_monthly": settings.stripe_price_starter_monthly,
        "starter_yearly":  settings.stripe_price_starter_yearly,
        "pro_monthly":     settings.stripe_price_pro_monthly,
        "pro_yearly":      settings.stripe_price_pro_yearly,
    }
    return mapping.get(plan_id) or None


# ── Auth routes ──────────────────────────────────────────────────────────────

@router.post("/auth/signup", summary="Create account")
async def signup(req: SignupRequest):
    """
    Create a free account. Returns api_key immediately.
    Password is optional — users can also sign in via magic link.
    """
    existing = tenant_service.get_tenant_by_email(req.email)
    if existing and existing.is_active:
        # If they already have an account, return key (idempotent)
        return {
            "api_key": existing.api_key,
            "name": existing.name,
            "email": existing.email,
            "plan": existing.plan,
            "js_enabled": existing.js_enabled,
            "existing": True,
            "message": "Account already exists.",
        }

    tenant = tenant_service.create_tenant(
        name=req.name,
        email=req.email,
        plan="free",
        password=req.password,
    )
    return {
        "api_key": tenant.api_key,
        "name": tenant.name,
        "email": tenant.email,
        "plan": tenant.plan,
        "js_enabled": tenant.js_enabled,
        "existing": False,
        "message": "Account created. Store your API key — it grants dashboard access.",
    }


@router.post("/auth/login", summary="Login with email + password")
async def login(req: LoginRequest):
    tenant = tenant_service.authenticate(req.email, req.password)
    if not tenant:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {
        "api_key": tenant.api_key,
        "name": tenant.name,
        "email": tenant.email,
        "plan": tenant.plan,
        "js_enabled": tenant.js_enabled,
    }


@router.post("/auth/magic-link", summary="Send magic link email")
async def send_magic_link(req: MagicLinkRequest):
    """
    Always returns 200 (don't reveal whether email exists).
    Sends a magic link email if the account exists.
    """
    from app.config import settings

    tenant = tenant_service.get_tenant_by_email(req.email)
    if not tenant:
        # Silently succeed — don't reveal account existence
        return {"message": "If that email has an account, a login link is on its way."}

    token = tenant_service.create_magic_token(req.email)
    magic_url = f"{settings.app_url}/auth/verify?token={token}"

    # Send email if Resend is configured
    if settings.resend_api_key:
        try:
            _send_magic_email(req.email, tenant.name, magic_url, settings)
        except Exception as e:
            logger.error(f"Magic link email failed: {e}")

    logger.info(f"Magic link for {req.email}: {magic_url}")
    return {"message": "If that email has an account, a login link is on its way."}


@router.get("/auth/magic-verify", summary="Verify magic link token")
async def verify_magic_link(token: str):
    email = tenant_service.verify_magic_token(token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    tenant = tenant_service.get_tenant_by_email(email)
    if not tenant:
        raise HTTPException(status_code=404, detail="Account not found")

    return {
        "api_key": tenant.api_key,
        "name": tenant.name,
        "email": tenant.email,
        "plan": tenant.plan,
        "js_enabled": tenant.js_enabled,
    }


# ── Billing routes ───────────────────────────────────────────────────────────

@router.get("/billing/plans", summary="List available plans")
async def list_plans():
    return {"plans": PLANS}


@router.post("/billing/checkout", summary="Create Stripe Checkout session")
async def create_checkout(req: CheckoutRequest, request: Request):
    """
    Creates a Stripe Checkout session for the requested plan.
    Requires a tenant API key so we can attach the Stripe customer to the account.
    """
    from app.config import settings

    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Stripe not configured")

    tenant = getattr(request.state, "tenant", None)
    if not tenant:
        raise HTTPException(status_code=401, detail="Login required to upgrade")

    price_id = _get_stripe_price_id(req.plan)
    if not price_id:
        raise HTTPException(
            status_code=400,
            detail=f"Plan '{req.plan}' not available. Valid: starter_monthly, starter_yearly, pro_monthly, pro_yearly"
        )

    plan_meta = next((p for p in PLANS if p["id"] == req.plan), {})
    plan_name = plan_meta.get("plan", "pro")

    try:
        import stripe
        stripe.api_key = settings.stripe_secret_key

        app_url = settings.app_url
        success_url = req.success_url or f"{app_url}/dashboard/?upgraded=1"
        cancel_url = req.cancel_url or f"{app_url}/pricing"

        # Create or retrieve Stripe customer
        customer_id = tenant.stripe_customer_id
        if not customer_id:
            customer = stripe.Customer.create(
                email=tenant.email,
                name=tenant.name,
                metadata={"galuli_api_key": tenant.api_key, "plan": plan_name},
            )
            customer_id = customer.id
            tenant_service.set_stripe_customer(tenant.api_key, customer_id)

        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=success_url + "&session_id={CHECKOUT_SESSION_ID}",
            cancel_url=cancel_url,
            metadata={
                "galuli_api_key": tenant.api_key,
                "plan": plan_name,
            },
            subscription_data={
                "metadata": {
                    "galuli_api_key": tenant.api_key,
                    "plan": plan_name,
                }
            },
            allow_promotion_codes=True,
        )

        return {"checkout_url": session.url, "session_id": session.id}

    except Exception as e:
        logger.error(f"Stripe checkout error: {e}")
        raise HTTPException(status_code=500, detail=f"Checkout failed: {str(e)}")


@router.get("/billing/portal", summary="Stripe Customer Portal")
async def billing_portal(request: Request):
    """Redirects user to Stripe's self-serve portal to manage their subscription."""
    from app.config import settings

    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Stripe not configured")

    tenant = getattr(request.state, "tenant", None)
    if not tenant:
        raise HTTPException(status_code=401, detail="Login required")
    if not tenant.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No subscription found")

    try:
        import stripe
        stripe.api_key = settings.stripe_secret_key
        session = stripe.billing_portal.Session.create(
            customer=tenant.stripe_customer_id,
            return_url=f"{settings.app_url}/dashboard/",
        )
        return {"portal_url": session.url}
    except Exception as e:
        logger.error(f"Stripe portal error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/billing/webhook", summary="Stripe webhook handler", include_in_schema=False)
async def stripe_webhook(request: Request):
    """
    Handles Stripe events:
    - checkout.session.completed → activate subscription
    - customer.subscription.deleted → downgrade to free
    - invoice.payment_failed → log warning
    """
    from app.config import settings

    if not settings.stripe_secret_key:
        return JSONResponse({"received": True})

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        import stripe
        stripe.api_key = settings.stripe_secret_key

        if settings.stripe_webhook_secret:
            event = stripe.Webhook.construct_event(payload, sig_header, settings.stripe_webhook_secret)
        else:
            import json
            event = json.loads(payload)

    except Exception as e:
        logger.error(f"Stripe webhook signature error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

    event_type = event.get("type", "")
    data = event.get("data", {}).get("object", {})

    if event_type == "checkout.session.completed":
        customer_id = data.get("customer")
        subscription_id = data.get("subscription")
        plan = data.get("metadata", {}).get("plan", "pro")
        if customer_id and subscription_id:
            tenant_service.activate_subscription(customer_id, plan, subscription_id)
            logger.info(f"✅ Activated {plan} for customer {customer_id}")

    elif event_type in ("customer.subscription.deleted", "customer.subscription.paused"):
        customer_id = data.get("customer")
        if customer_id:
            tenant_service.deactivate_subscription(customer_id)
            logger.info(f"⬇️ Deactivated subscription for customer {customer_id}")

    elif event_type == "invoice.payment_failed":
        customer_id = data.get("customer")
        logger.warning(f"💳 Payment failed for customer {customer_id}")

    return JSONResponse({"received": True})


# ── Lemon Squeezy variant → plan mapping ─────────────────────────────────────

def _ls_variant_to_plan(variant_id: str) -> Optional[str]:
    """Map a LS variant ID to a Galuli plan name."""
    from app.config import settings
    mapping = {
        settings.ls_variant_starter: "starter",
        settings.ls_variant_pro:     "pro",
    }
    return mapping.get(str(variant_id))


@router.post("/billing/ls-webhook", summary="Lemon Squeezy webhook handler", include_in_schema=False)
async def ls_webhook(request: Request):
    """
    Handles Lemon Squeezy events:
    - order_created             → activate subscription (one-time purchase)
    - subscription_created      → activate subscription
    - subscription_updated      → re-apply plan limits (plan change / renewal)
    - subscription_cancelled    → downgrade to free at period end
    - subscription_expired      → downgrade to free immediately
    - subscription_payment_failed → log warning
    """
    import hashlib
    import hmac
    from app.config import settings

    payload = await request.body()

    # Verify HMAC-SHA256 signature if secret is configured
    if settings.ls_webhook_secret:
        sig = request.headers.get("X-Signature", "")
        expected = hmac.new(
            settings.ls_webhook_secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(sig, expected):
            logger.warning("LS webhook: invalid signature")
            raise HTTPException(status_code=400, detail="Invalid signature")

    import json
    try:
        body = json.loads(payload)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event_name = body.get("meta", {}).get("event_name", "")
    data       = body.get("data", {})
    attrs      = data.get("attributes", {})

    logger.info(f"LS webhook received: {event_name}")

    # ── Helpers to extract email + variant ──────────────────────────────────
    def get_email():
        # order_created puts customer email at attributes.user_email
        # subscription_* events have it at attributes.user_email too
        return attrs.get("user_email") or attrs.get("customer", {}).get("email", "")

    def get_variant_id():
        # For subscriptions: first_subscription_item.price_id is variant
        # Simpler: variant_id is at the top of attributes for orders
        return str(attrs.get("variant_id") or attrs.get("first_subscription_item", {}).get("variant_id", ""))

    def get_subscription_id():
        return str(data.get("id", ""))

    # ── Event handlers ───────────────────────────────────────────────────────
    if event_name in ("order_created", "subscription_created", "subscription_updated"):
        email      = get_email()
        variant_id = get_variant_id()
        sub_id     = get_subscription_id()
        plan       = _ls_variant_to_plan(variant_id)

        if not email:
            logger.warning(f"LS webhook {event_name}: no email in payload")
            return JSONResponse({"received": True})

        if not plan:
            logger.warning(f"LS webhook {event_name}: unknown variant {variant_id!r}")
            return JSONResponse({"received": True})

        # Auto-create tenant if they don't have an account yet
        tenant = tenant_service.get_tenant_by_email(email)
        if not tenant:
            name = attrs.get("user_name") or email.split("@")[0]
            tenant_service.create_tenant(name=name, email=email, plan="free")
            logger.info(f"LS webhook: auto-created tenant for {email}")

        tenant_service.activate_ls_subscription(email, plan, sub_id)
        logger.info(f"✅ LS: {event_name} → {plan} for {email}")

    elif event_name in ("subscription_cancelled", "subscription_expired"):
        email = get_email()
        if email:
            tenant_service.deactivate_ls_subscription(email)
            logger.info(f"⬇️ LS: {event_name} → downgraded {email} to free")

    elif event_name == "subscription_payment_failed":
        email = get_email()
        logger.warning(f"💳 LS: payment failed for {email}")

    return JSONResponse({"received": True})


# ── Email helper ─────────────────────────────────────────────────────────────

def _send_magic_email(to_email: str, name: str, magic_url: str, settings):
    """Send magic link via Resend API."""
    import httpx
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <div style="font-size:24px;font-weight:900;color:#6366f1;margin-bottom:24px">⬡ galuli</div>
      <h2 style="margin:0 0 12px;color:#0a0a18">Your login link</h2>
      <p style="color:#6868a0;margin:0 0 28px">Hi {name}, click below to sign in to Galuli.
         This link expires in 15 minutes.</p>
      <a href="{magic_url}"
         style="display:inline-block;background:#6366f1;color:white;text-decoration:none;
                padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px">
        Sign in to Galuli →
      </a>
      <p style="color:#9898b8;font-size:12px;margin-top:32px">
        If you didn't request this, ignore it. Link: {magic_url}
      </p>
    </div>
    """
    resp = httpx.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {settings.resend_api_key}", "Content-Type": "application/json"},
        json={
            "from": settings.email_from,
            "to": [to_email],
            "subject": "Your Galuli login link",
            "html": html,
        },
        timeout=10,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"Resend error {resp.status_code}: {resp.text}")
