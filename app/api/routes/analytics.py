"""
Analytics routes.

POST /api/v1/analytics/event  ← AI agent hit events from snippet
GET  /api/v1/analytics/{domain}        ← customer dashboard data
GET  /api/v1/analytics/{domain}/agents ← agent breakdown
GET  /api/v1/analytics/{domain}/pages  ← per-page breakdown
"""
import logging
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.services.analytics import AnalyticsService

logger = logging.getLogger(__name__)
router = APIRouter()
analytics = AnalyticsService()


class AgentEventPayload(BaseModel):
    domain: str
    page_url: str
    agent_name: str          # e.g. "GPTBot", "ClaudeBot", "PerplexityBot"
    agent_type: str          # e.g. "crawler", "llm", "agent", "unknown"
    user_agent: str
    referrer: Optional[str] = None
    ts: Optional[str] = None


@router.post("/event", summary="Log an AI agent hit event")
async def log_event(payload: AgentEventPayload, request: Request):
    """Called by the galui.js snippet when an AI agent is detected."""
    analytics.record_event(
        domain=payload.domain,
        page_url=payload.page_url,
        agent_name=payload.agent_name,
        agent_type=payload.agent_type,
        user_agent=payload.user_agent,
        referrer=payload.referrer,
        ts=payload.ts or datetime.utcnow().isoformat(),
    )
    return {"ok": True}


@router.get("/{domain}", summary="Analytics summary for a domain")
async def get_analytics(domain: str, days: int = 30):
    """Full analytics summary: agent hits, top pages, trends."""
    domain = domain.replace("www.", "").lower().strip()
    data = analytics.get_summary(domain, days=days)
    if not data:
        raise HTTPException(status_code=404, detail=f"No analytics for '{domain}'")
    return data


@router.get("/{domain}/agents", summary="Agent breakdown for a domain")
async def get_agents(domain: str, days: int = 30):
    """Which AI agents are hitting this domain and how often."""
    domain = domain.replace("www.", "").lower().strip()
    return analytics.get_agent_breakdown(domain, days=days)


@router.get("/{domain}/pages", summary="Per-page AI traffic breakdown")
async def get_pages(domain: str, days: int = 30):
    """Which pages get the most AI agent traffic."""
    domain = domain.replace("www.", "").lower().strip()
    return analytics.get_page_breakdown(domain, days=days)
