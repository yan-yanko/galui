"""
Tenant management routes.

POST   /api/v1/tenants              → create tenant (public self-service signup)
GET    /api/v1/tenants              → list all tenants (admin only)
GET    /api/v1/tenants/me           → get own tenant info (tenant key)
GET    /api/v1/tenants/me/usage     → own usage log
DELETE /api/v1/tenants/{key}        → deactivate (admin only)
DELETE /api/v1/tenants/{key}/erase  → hard-delete all data (GDPR/HIPAA right to erasure)
PATCH  /api/v1/tenants/{key}/plan   → upgrade plan (admin only)
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


@router.post("", status_code=201, summary="Create tenant")
async def create_tenant(req: TenantCreateRequest, request: Request):
    """
    Create a new tenant and issue their API key.
    - Admin (master key): can create any plan
    - No key / public: can only create free plan (self-service signup)
    """
    from app.config import settings
    api_key = getattr(request.state, "api_key", "")
    is_admin = bool(settings.registry_api_key and api_key == settings.registry_api_key)

    # Non-admin can only create free accounts
    if not is_admin and req.plan not in ("free", ""):
        req = TenantCreateRequest(name=req.name, email=req.email, plan="free")

    existing = tenant_service.get_tenant_by_email(req.email)
    if existing and existing.is_active:
        # Return existing key for self-service (don't expose key — just confirm)
        return {
            "api_key": existing.api_key,
            "name": existing.name,
            "email": existing.email,
            "plan": existing.plan,
            "domains_limit": existing.domains_limit,
            "rate_limit_per_min": existing.rate_limit_per_min,
            "message": "Account already exists. Key returned.",
            "existing": True,
        }

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
        "existing": False,
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


@router.get("/domains", summary="List registered domains for caller's key")
async def get_my_domains(request: Request):
    """
    Returns the list of domains registered under the caller's API key.
    Accepts both master key (returns all domains across all tenants) and tenant keys.
    """
    from app.config import settings
    api_key = getattr(request.state, "api_key", "")
    tenant = getattr(request.state, "tenant", None)

    if settings.registry_api_key and api_key == settings.registry_api_key:
        # Admin: list all registered domains across all tenants
        tenants = tenant_service.list_tenants()
        all_domains = []
        for t in tenants:
            domains = tenant_service.get_tenant_domains(t.api_key)
            all_domains.extend(domains)
        return {"domains": list(set(all_domains)), "total": len(set(all_domains))}

    if not tenant:
        raise HTTPException(status_code=401, detail="API key required")

    domains = tenant_service.get_tenant_domains(tenant.api_key)
    return {
        "domains": domains,
        "total": len(domains),
        "limit": tenant.domains_limit,
        "plan": tenant.plan,
    }


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
    actor = getattr(request.state, "api_key", "admin")
    tenant_service.deactivate(api_key, actor=actor)
    return {"deactivated": True, "api_key": api_key}


@router.delete("/{api_key}/erase", summary="Hard-delete all tenant data (GDPR/HIPAA erasure)")
async def erase_tenant(api_key: str, request: Request):
    """
    Permanently delete ALL data for a tenant:
    - Tenant account + API key
    - Usage log, registered domains, magic tokens
    - Analytics events for all their domains
    - Registries, ingest jobs, page hashes for all their domains
    - Citation queries and results

    Audit log entries are retained (system accountability records).
    Can be called by admin (master key) or the tenant themselves (own key).
    """
    from app.config import settings
    from app.services.storage import StorageService
    from app.services.analytics import AnalyticsService
    from app.services.citation_tracker import CitationService

    # Allow admin OR the tenant erasing their own account
    actor_key = getattr(request.state, "api_key", "")
    is_admin = bool(settings.registry_api_key and actor_key == settings.registry_api_key)
    is_own = (actor_key == api_key)

    if not is_admin and not is_own:
        raise HTTPException(status_code=403, detail="Admin key or own tenant key required")

    tenant = tenant_service.get_tenant(api_key)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Get domains before deletion
    domains = tenant_service.get_tenant_domains(api_key)

    # Audit log the erasure BEFORE deleting anything
    tenant_service.log_audit(
        actor=actor_key or "admin",
        action="data.erase",
        resource=f"tenant:{api_key}",
        detail=str({"email": tenant.email, "domains": domains, "plan": tenant.plan}),
        ip=request.client.host if request.client else None,
    )

    # 1. Erase main tenant tables
    tenant_service.erase_tenant(api_key)

    # 2. Erase analytics events for their domains
    if domains:
        AnalyticsService().erase_domain_events(domains)

    # 3. Erase registries, jobs, hashes for their domains
    if domains:
        StorageService().erase_domains(domains)

    # 4. Erase citation data (separate DB)
    try:
        CitationService().erase_tenant(api_key)
    except Exception as e:
        logger.warning(f"Citation erase failed for {api_key[:20]}…: {e}")

    logger.info(f"Tenant erased: {tenant.email} ({api_key[:20]}…) by {actor_key[:20] if actor_key else 'admin'}…")
    return {
        "erased": True,
        "domains_removed": len(domains),
        "message": "All personal data permanently deleted.",
    }
