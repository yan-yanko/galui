"""
Tenant management routes.

POST /api/v1/tenants           → create tenant (admin only)
GET  /api/v1/tenants           → list all tenants (admin only)
GET  /api/v1/tenants/me        → get own tenant info (tenant key)
GET  /api/v1/tenants/me/usage  → own usage log
DELETE /api/v1/tenants/{key}   → deactivate (admin only)
PATCH  /api/v1/tenants/{key}/plan → upgrade plan (admin only)
"""
import logging
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.services.tenant import TenantService, TenantCreateRequest

logger = logging.getLogger(__name__)
router = APIRouter()
tenant_service = TenantService()


def _require_admin(request: Request):
    """Admin = master key only. Tenant keys can only access /me endpoints."""
    from app.config import settings
    api_key = getattr(request.state, "api_key", "")
    if settings.registry_api_key and api_key != settings.registry_api_key:
        raise HTTPException(status_code=403, detail="Admin key required for this operation")


@router.post("", status_code=201, summary="Create tenant (admin)")
async def create_tenant(req: TenantCreateRequest, request: Request):
    """Create a new tenant and issue their API key."""
    _require_admin(request)

    existing = tenant_service.get_tenant_by_email(req.email)
    if existing:
        raise HTTPException(status_code=409, detail=f"Email {req.email} already registered")

    if req.plan not in ("free", "pro", "enterprise"):
        raise HTTPException(status_code=400, detail="plan must be free|pro|enterprise")

    tenant = tenant_service.create_tenant(req.name, req.email, req.plan)
    return {
        "api_key": tenant.api_key,
        "name": tenant.name,
        "email": tenant.email,
        "plan": tenant.plan,
        "domains_limit": tenant.domains_limit,
        "rate_limit_per_min": tenant.rate_limit_per_min,
        "message": "Store this key securely — it won't be shown again.",
    }


@router.get("", summary="List all tenants (admin)")
async def list_tenants(request: Request):
    _require_admin(request)
    tenants = tenant_service.list_tenants()
    return {"count": len(tenants), "tenants": tenants}


@router.get("/me", summary="Get own tenant info")
async def get_me(request: Request):
    """Returns the tenant associated with the provided API key."""
    tenant = getattr(request.state, "tenant", None)
    if not tenant:
        raise HTTPException(status_code=401, detail="Tenant key required (cr_live_...)")
    return tenant


@router.get("/me/usage", summary="Get own usage log")
async def get_my_usage(request: Request, limit: int = 50):
    tenant = getattr(request.state, "tenant", None)
    if not tenant:
        raise HTTPException(status_code=401, detail="Tenant key required")
    usage = tenant_service.get_usage(tenant.api_key, limit=limit)
    return {"api_key_prefix": tenant.api_key[:20] + "...", "usage": usage}


@router.patch("/{api_key}/plan", summary="Update tenant plan (admin)")
async def update_plan(api_key: str, plan: str, request: Request):
    _require_admin(request)
    if plan not in ("free", "pro", "enterprise"):
        raise HTTPException(status_code=400, detail="plan must be free|pro|enterprise")
    tenant = tenant_service.get_tenant(api_key)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    tenant_service.update_plan(api_key, plan)
    return {"updated": True, "api_key": api_key, "plan": plan}


@router.delete("/{api_key}", summary="Deactivate tenant (admin)")
async def deactivate_tenant(api_key: str, request: Request):
    _require_admin(request)
    tenant = tenant_service.get_tenant(api_key)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    tenant_service.deactivate(api_key)
    return {"deactivated": True, "api_key": api_key}
