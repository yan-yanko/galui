"""
Push ingest — receives structured page data from the galui.js snippet.
Replaces crawl-on-demand for sites with the snippet installed.

POST /api/v1/ingest/push   ← called by snippet on every page load
GET  /api/v1/score/{domain}         ← AI Readiness Score
GET  /api/v1/score/{domain}/badge   ← embeddable SVG badge
GET  /api/v1/score/{domain}/suggestions ← improvement suggestions
"""
import hashlib
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from app.services.storage import StorageService
from app.services.score import calculate_score, generate_suggestions

logger = logging.getLogger(__name__)
router = APIRouter()
storage = StorageService()


# ── Push payload schema ───────────────────────────────────────────────────

class PageData(BaseModel):
    url: str
    title: Optional[str] = None
    description: Optional[str] = None
    page_type: Optional[str] = None     # homepage|pricing|docs|blog|product|contact|other
    headings: Optional[List[str]] = []
    ctas: Optional[List[str]] = []
    forms: Optional[List[Dict]] = []
    schema_org: Optional[List[Dict]] = []
    text_preview: Optional[str] = None  # first 2000 chars of clean text
    webmcp_tools: Optional[List[Dict]] = []  # tools registered via WebMCP
    webmcp_supported: Optional[bool] = False


class PushPayload(BaseModel):
    domain: str
    tenant_key: str                      # the customer's API key
    page: PageData
    content_hash: Optional[str] = None  # SHA256 of text — skip if unchanged
    snippet_version: str = "1.0.0"


class PushResponse(BaseModel):
    status: str                          # "accepted" | "skipped" | "queued"
    domain: str
    message: str
    score: Optional[Dict] = None


# ── Push endpoint ─────────────────────────────────────────────────────────

@router.post("/push", response_model=PushResponse)
async def push_page(payload: PushPayload, background_tasks: BackgroundTasks):
    """
    Called by galui.js on every page load.
    Receives page structure + content, updates registry asynchronously.
    Returns current AI Readiness Score.
    """
    from app.config import settings
    from app.services.tenant import TenantService

    domain = payload.domain.replace("www.", "").lower().strip()

    # Verify tenant key
    tenant_svc = TenantService()
    tenant = tenant_svc.get_tenant(payload.tenant_key)
    if not tenant:
        raise HTTPException(status_code=401, detail="Invalid tenant key")

    # Check if content changed (hash comparison)
    page_hash = payload.content_hash or _hash_page(payload.page)
    last_hash = storage.get_page_hash(domain, payload.page.url)

    if last_hash == page_hash:
        # Content unchanged — return current score without re-processing
        registry = storage.get_registry(domain)
        score = calculate_score(registry.model_dump() if registry else {}) if registry else None
        return PushResponse(
            status="skipped",
            domain=domain,
            message="Content unchanged — no re-processing needed",
            score=score,
        )

    # Store hash + queue background pipeline
    storage.save_page_hash(domain, payload.page.url, page_hash)

    background_tasks.add_task(
        _run_push_pipeline,
        domain=domain,
        payload=payload,
        base_api_url=settings.base_api_url,
    )

    # Return current score while pipeline runs in background
    registry = storage.get_registry(domain)
    score = calculate_score(registry.model_dump() if registry else {}) if registry else None

    return PushResponse(
        status="accepted",
        domain=domain,
        message="Page accepted. Registry updating in background.",
        score=score,
    )


async def _run_push_pipeline(domain: str, payload: PushPayload, base_api_url: str):
    """
    Background: takes pushed page data, merges with existing registry,
    re-runs LLM comprehension if enough new data accumulated.
    """
    from app.services.comprehension import ComprehensionService
    from app.services.registry_builder import RegistryBuilder, calculate_confidence
    from app.models.crawl import CrawlResult, PageContent

    logger.info(f"[push] Processing {payload.page.url} for {domain}")

    try:
        # Build a minimal CrawlResult from the pushed page data
        page_text = _build_page_text(payload.page)
        page = PageContent(
            url=payload.page.url,
            title=payload.page.title or "",
            text=page_text,
            html="",
            status_code=200,
        )

        # Check if we have an existing registry to merge with
        existing = storage.get_registry(domain)

        # Build a CrawlResult with this page + any stored context
        crawl_result = CrawlResult(
            domain=domain,
            seed_url=f"https://{domain}",
            pages=[page],
            total_pages=1,
            duration=0.0,
            used_playwright=False,
        )

        # Run LLM comprehension
        comp = ComprehensionService()
        raw = await comp.extract(crawl_result)

        # Inject WebMCP data into ai_metadata
        raw["webmcp_tools_count"] = len(payload.page.webmcp_tools or [])
        raw["webmcp_enabled"] = payload.page.webmcp_supported or False
        raw["forms_exposed"] = len(payload.page.forms or [])

        # Build registry
        builder = RegistryBuilder()
        confidence = calculate_confidence(raw)
        registry = builder.build(
            domain=domain,
            raw=raw,
            confidence_score=confidence,
            base_api_url=base_api_url,
            webmcp_meta={
                "tools_count": len(payload.page.webmcp_tools or []),
                "enabled": payload.page.webmcp_supported or False,
                "forms_exposed": len(payload.page.forms or []),
                "tools": payload.page.webmcp_tools or [],
            }
        )

        # If we have an existing registry, merge — don't overwrite good data
        if existing:
            registry = _merge_registries(existing, registry)

        storage.save_registry(registry)
        logger.info(f"[push] Registry updated for {domain} | confidence={confidence:.2f}")

    except Exception as e:
        logger.error(f"[push] Pipeline failed for {domain}: {e}", exc_info=True)


def _build_page_text(page: PageData) -> str:
    """Reconstruct clean text from structured page data for LLM input."""
    parts = []
    if page.title:
        parts.append(f"# {page.title}")
    if page.description:
        parts.append(f"{page.description}")
    if page.headings:
        parts.append("## Headings\n" + "\n".join(f"- {h}" for h in page.headings))
    if page.ctas:
        parts.append("## Calls to Action\n" + "\n".join(f"- {c}" for c in page.ctas))
    if page.forms:
        form_desc = []
        for f in page.forms:
            form_desc.append(f"- Form: {f.get('name','unnamed')} ({f.get('action','no action')})")
        parts.append("## Forms\n" + "\n".join(form_desc))
    if page.schema_org:
        import json
        parts.append("## Schema.org\n" + json.dumps(page.schema_org, indent=2)[:2000])
    if page.text_preview:
        parts.append("## Content\n" + page.text_preview)
    return "\n\n".join(parts)


def _hash_page(page: PageData) -> str:
    """SHA256 of page content for change detection."""
    content = (page.text_preview or "") + (page.title or "") + str(page.headings)
    return hashlib.sha256(content.encode()).hexdigest()


def _merge_registries(existing, new):
    """
    Merge new registry data into existing, preserving good existing data.
    New data wins on most fields, but we keep existing capabilities if new has fewer.
    """
    # Keep existing capabilities if new extraction found fewer
    if (existing.capabilities and new.capabilities and
            len(existing.capabilities) > len(new.capabilities)):
        new.capabilities = existing.capabilities

    # Keep existing pricing if new has no tiers
    if (existing.pricing and new.pricing and
            not new.pricing.tiers and existing.pricing.tiers):
        new.pricing = existing.pricing

    # Keep best confidence score
    if existing.ai_metadata.confidence_score > new.ai_metadata.confidence_score:
        new.ai_metadata.confidence_score = existing.ai_metadata.confidence_score

    return new


# ── Score endpoints ───────────────────────────────────────────────────────

@router.get("/score/{domain}", summary="AI Readiness Score")
async def get_score(domain: str):
    """Full AI Readiness Score breakdown for a domain."""
    domain = domain.replace("www.", "").lower().strip()
    registry = storage.get_registry(domain)
    if not registry:
        raise HTTPException(
            status_code=404,
            detail=f"No registry for '{domain}'. Install the galui snippet first."
        )
    score = calculate_score(registry.model_dump())
    suggestions = generate_suggestions(score)
    return {**score, "suggestions": suggestions}


@router.get("/score/{domain}/badge", summary="Embeddable SVG badge")
async def get_badge(domain: str):
    """SVG badge for embedding on the website. Shows AI Readiness Score."""
    domain = domain.replace("www.", "").lower().strip()
    registry = storage.get_registry(domain)

    if not registry:
        score_data = {"total": 0, "grade": "?", "label": "Not Indexed", "color": "#6b7280"}
    else:
        score_data = calculate_score(registry.model_dump())

    total = score_data["total"]
    grade = score_data["grade"]
    label = score_data["label"]
    color = score_data["color"]

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="160" height="28" role="img" aria-label="AI Readiness: {total}/100">
  <title>AI Readiness: {total}/100</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="160" height="28" rx="4" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="88" height="28" fill="#1e293b"/>
    <rect x="88" width="72" height="28" fill="{color}"/>
    <rect width="160" height="28" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif" font-size="11">
    <text x="44" y="18" font-weight="600">⬡ AI-Ready</text>
    <text x="124" y="18" font-weight="700">{grade} · {total}/100</text>
  </g>
</svg>"""

    return Response(content=svg, media_type="image/svg+xml", headers={
        "Cache-Control": "max-age=3600",
        "Access-Control-Allow-Origin": "*",
    })


@router.get("/score/{domain}/suggestions", summary="Improvement suggestions")
async def get_suggestions(domain: str):
    """Prioritized list of actions to improve AI Readiness Score."""
    domain = domain.replace("www.", "").lower().strip()
    registry = storage.get_registry(domain)
    if not registry:
        raise HTTPException(status_code=404, detail=f"No registry for '{domain}'")
    score = calculate_score(registry.model_dump())
    return {
        "domain": domain,
        "score": score["total"],
        "grade": score["grade"],
        "suggestions": generate_suggestions(score),
    }
