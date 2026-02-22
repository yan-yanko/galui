import logging
from datetime import datetime

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

from app.models.registry import CapabilityRegistry
from app.services.storage import StorageService

logger = logging.getLogger(__name__)
router = APIRouter()
storage = StorageService()


@router.get("/", summary="List all indexed domains")
async def list_registries():
    """List all indexed domains with metadata."""
    registries = storage.list_registries()
    return {
        "count": len(registries),
        "registries": registries,
    }


@router.get("/{domain}", response_model=CapabilityRegistry, summary="Full JSON registry")
async def get_registry(domain: str):
    """
    Full machine-readable JSON registry for a domain.

    This is the primary endpoint for AI agents querying capability data.
    """
    domain = domain.replace("www.", "").lower().strip()
    registry = storage.get_registry(domain)
    if not registry:
        raise HTTPException(
            status_code=404,
            detail={
                "error": f"No registry found for '{domain}'",
                "hint": "POST /api/v1/ingest with the URL to create one",
            },
        )
    return registry


@router.get("/{domain}/llms.txt", response_class=PlainTextResponse, summary="LLM-readable text format")
async def get_llms_txt(domain: str):
    """
    LLM-readable plain text format for the capability registry.

    Follows the emerging llms.txt standard (analogous to robots.txt for AI).
    Designed to be fetched as context by AI agents evaluating whether to use this service.
    """
    domain = domain.replace("www.", "").lower().strip()
    registry = storage.get_registry(domain)
    if not registry:
        raise HTTPException(status_code=404, detail=f"No registry for '{domain}'")

    m = registry.metadata
    lines = [
        f"# {m.name}",
        "",
        f"> {m.description}",
        "",
        f"- Domain: {registry.domain}",
        f"- Category: {m.category}" + (f" / {', '.join(m.sub_categories)}" if m.sub_categories else ""),
        f"- Registry Updated: {registry.last_updated.strftime('%Y-%m-%d') if hasattr(registry.last_updated, 'strftime') else str(registry.last_updated)[:10]}",
        f"- Confidence Score: {registry.ai_metadata.confidence_score:.2f}",
    ]

    if m.website_url:
        lines.append(f"- Website: {m.website_url}")
    if m.docs_url:
        lines.append(f"- Docs: {m.docs_url}")

    lines += ["", "## Capabilities", ""]

    for cap in registry.capabilities:
        lines.append(f"### {cap.name}")
        lines.append(cap.description)
        if cap.problems_solved:
            lines.append(f"Solves: {'; '.join(cap.problems_solved)}")
        if cap.use_cases:
            lines.append(f"Use cases: {'; '.join(cap.use_cases[:3])}")
        if cap.constraints:
            lines.append(f"Constraints: {'; '.join(cap.constraints[:2])}")
        lines.append("")

    lines += ["## Pricing", ""]
    p = registry.pricing
    lines.append(f"Model: {p.model}")
    lines.append(f"Free tier: {'Yes' if p.has_free_tier else 'No'}")
    lines.append(f"Contact sales required: {'Yes' if p.contact_sales_required else 'No'}")

    if p.tiers:
        lines.append("")
        for tier in p.tiers:
            if tier.contact_sales:
                lines.append(f"- {tier.name}: Contact sales")
            elif tier.price_per_unit is not None:
                price_str = f"{tier.currency} {tier.price_per_unit}"
                if tier.unit:
                    price_str += f" {tier.unit}"
                if tier.plus_fixed:
                    price_str += f" + {tier.currency} {tier.plus_fixed}"
                lines.append(f"- {tier.name}: {price_str}")
                if tier.description:
                    lines.append(f"  {tier.description}")
            else:
                lines.append(f"- {tier.name}: {tier.description or 'See pricing page'}")

    if p.pricing_page_url:
        lines.append(f"\nPricing page: {p.pricing_page_url}")
    if p.pricing_notes:
        lines.append(f"Notes: {p.pricing_notes}")

    lines += ["", "## Integration", ""]
    i = registry.integration
    if i.api_base_url:
        lines.append(f"API base URL: {i.api_base_url}")
    if i.api_version:
        lines.append(f"API version: {i.api_version}")
    if i.auth_methods:
        lines.append(f"Auth methods: {', '.join(i.auth_methods)}")
    if i.auth_notes:
        lines.append(f"Auth notes: {i.auth_notes}")
    if i.sdks:
        lines.append(f"SDKs: {', '.join(s.language for s in i.sdks)}")
    lines.append(f"Webhooks: {'Supported' if i.webhooks_supported else 'Not documented'}")

    lines += ["", "## Reliability", ""]
    r = registry.reliability
    lines.append(f"Current status: {r.current_status}")
    if r.status_page_url:
        lines.append(f"Status page: {r.status_page_url}")
    if r.sla_uptime_percent:
        lines.append(f"SLA uptime: {r.sla_uptime_percent}%")

    lines += [
        "",
        "## Machine-Readable Endpoints",
        "",
        f"JSON Registry: {registry.ai_metadata.registry_url}",
        f"AI Plugin JSON: {registry.ai_metadata.ai_plugin_url}",
        f"This file: {registry.ai_metadata.llms_txt_url}",
    ]

    lines += ["", "---", f"Generated by Galui | Last crawled: {registry.last_updated.strftime('%Y-%m-%d') if hasattr(registry.last_updated, 'strftime') else str(registry.last_updated)[:10]}"]

    return "\n".join(lines)


@router.get("/{domain}/ai-plugin.json", summary="OpenAI-compatible plugin manifest")
async def get_ai_plugin(domain: str):
    """
    OpenAI-compatible ai-plugin.json manifest.
    Allows ChatGPT plugins and compatible agents to discover this service.
    """
    domain = domain.replace("www.", "").lower().strip()
    registry = storage.get_registry(domain)
    if not registry:
        raise HTTPException(status_code=404, detail=f"No registry for '{domain}'")

    m = registry.metadata
    cap_names = ", ".join(c.name for c in registry.capabilities[:3])
    description_for_model = (
        f"{m.description} Category: {m.category}."
        + (f" Capabilities: {cap_names}." if cap_names else "")
    )

    return {
        "schema_version": "v1",
        "name_for_human": m.name,
        "name_for_model": m.name.lower().replace(" ", "_"),
        "description_for_human": m.description,
        "description_for_model": description_for_model,
        "auth": {"type": "none"},
        "api": {
            "type": "openapi",
            "url": registry.integration.openapi_url or f"https://{domain}/openapi.json",
            "is_user_authenticated": False,
        },
        "logo_url": m.logo_url or f"https://{domain}/favicon.ico",
        "contact_email": f"support@{domain}",
        "legal_info_url": f"https://{domain}/legal",
    }


@router.get("/{domain}/status", summary="Live liveness check")
async def get_live_status(domain: str):
    """
    Real-time liveness check for a registered domain.

    Pings the service's status page (if known) or the domain directly.
    Returns current operational status without updating the stored registry.
    """
    domain = domain.replace("www.", "").lower().strip()
    registry = storage.get_registry(domain)
    if not registry:
        raise HTTPException(status_code=404, detail=f"No registry for '{domain}'")

    status = "unknown"
    checked_url = registry.reliability.status_page_url or f"https://{domain}"

    try:
        async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as client:
            resp = await client.get(checked_url)
            if resp.status_code < 300:
                status = "operational"
            elif resp.status_code < 500:
                status = "degraded"
            else:
                status = "outage"
    except httpx.TimeoutException:
        status = "unreachable"
    except Exception:
        status = "unreachable"

    return {
        "domain": domain,
        "status": status,
        "checked_url": checked_url,
        "checked_at": datetime.utcnow().isoformat(),
        "stored_status": registry.reliability.current_status,
    }
