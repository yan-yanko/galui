"""
AI Readiness Score — 0 to 100.

Dimensions:
  1. Content coverage     (25pts) — how many pages are indexed, content quality
  2. Structure quality    (20pts) — schema.org, headings, semantic HTML detected
  3. Freshness            (20pts) — how recently the registry was updated
  4. WebMCP compliance    (20pts) — tools registered, forms exposed
  5. Output formats       (15pts) — llms.txt present, ai-plugin.json present

Score feeds the embeddable badge and customer dashboard.
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


def calculate_score(registry: Dict[str, Any], analytics_summary: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Takes a registry dict and optional analytics summary.
    Returns full score breakdown + total.
    """
    scores = {}
    details = {}

    # ── 1. Content Coverage (25 pts) ──────────────────────────────────────
    caps = registry.get("capabilities") or []
    pages = (registry.get("ai_metadata") or {}).get("pages_crawled") or 0
    conf  = (registry.get("ai_metadata") or {}).get("confidence_score") or 0.0

    cap_score   = min(len(caps) / 5, 1.0) * 10   # up to 10pts for 5+ capabilities
    page_score  = min(pages / 10, 1.0) * 8        # up to 8pts for 10+ pages
    conf_score  = conf * 7                          # up to 7pts for confidence

    scores["content_coverage"] = round(cap_score + page_score + conf_score)
    details["content_coverage"] = {
        "score": scores["content_coverage"],
        "max": 25,
        "capabilities_found": len(caps),
        "pages_crawled": pages,
        "confidence": round(conf, 2),
    }

    # ── 2. Structure Quality (20 pts) ─────────────────────────────────────
    meta = registry.get("metadata") or {}
    intg = registry.get("integration") or {}
    pricing = registry.get("pricing") or {}

    structure_pts = 0
    structure_checks = {}

    if meta.get("description"):
        structure_pts += 3; structure_checks["description"] = True
    if meta.get("category") and meta.get("category") != "other":
        structure_pts += 2; structure_checks["category"] = True
    if intg.get("api_base_url"):
        structure_pts += 4; structure_checks["api_base_url"] = True
    if intg.get("auth_methods"):
        structure_pts += 3; structure_checks["auth_methods"] = True
    if pricing.get("tiers") and len(pricing.get("tiers", [])) > 0:
        structure_pts += 4; structure_checks["pricing_tiers"] = True
    if intg.get("sdks"):
        structure_pts += 2; structure_checks["sdks"] = True
    if meta.get("docs_url"):
        structure_pts += 2; structure_checks["docs_url"] = True

    scores["structure_quality"] = min(structure_pts, 20)
    details["structure_quality"] = {
        "score": scores["structure_quality"],
        "max": 20,
        "checks": structure_checks,
    }

    # ── 3. Freshness (20 pts) ─────────────────────────────────────────────
    last_updated_str = (registry.get("ai_metadata") or {}).get("last_updated") or registry.get("last_updated")
    freshness_pts = 0
    age_days = None

    if last_updated_str:
        try:
            if isinstance(last_updated_str, str):
                lu = datetime.fromisoformat(last_updated_str.replace("Z", "+00:00").replace("+00:00", ""))
            else:
                lu = last_updated_str
            age_days = (datetime.utcnow() - lu).days
            if age_days <= 1:
                freshness_pts = 20
            elif age_days <= 7:
                freshness_pts = 16
            elif age_days <= 30:
                freshness_pts = 10
            elif age_days <= 90:
                freshness_pts = 5
            else:
                freshness_pts = 1
        except Exception:
            freshness_pts = 0

    scores["freshness"] = freshness_pts
    details["freshness"] = {
        "score": freshness_pts,
        "max": 20,
        "age_days": age_days,
        "last_updated": str(last_updated_str) if last_updated_str else None,
    }

    # ── 4. WebMCP Compliance (20 pts) ────────────────────────────────────
    ai_meta = registry.get("ai_metadata") or {}
    webmcp_tools   = ai_meta.get("webmcp_tools_count", 0)
    webmcp_enabled = ai_meta.get("webmcp_enabled", False)
    forms_exposed  = ai_meta.get("forms_exposed", 0)

    webmcp_pts = 0
    if webmcp_enabled:
        webmcp_pts += 8
    if webmcp_tools > 0:
        webmcp_pts += min(webmcp_tools * 3, 9)   # 3pts per tool, up to 9
    if forms_exposed > 0:
        webmcp_pts += min(forms_exposed * 1, 3)  # 1pt per form, up to 3

    scores["webmcp_compliance"] = min(webmcp_pts, 20)
    details["webmcp_compliance"] = {
        "score": scores["webmcp_compliance"],
        "max": 20,
        "webmcp_enabled": webmcp_enabled,
        "tools_registered": webmcp_tools,
        "forms_exposed": forms_exposed,
    }

    # ── 5. Output Formats (15 pts) ────────────────────────────────────────
    format_pts = 0
    format_checks = {}

    ai_urls = ai_meta
    if ai_urls.get("llms_txt_url"):
        format_pts += 5; format_checks["llms_txt"] = True
    if ai_urls.get("ai_plugin_url"):
        format_pts += 5; format_checks["ai_plugin_json"] = True
    if ai_urls.get("registry_url"):
        format_pts += 5; format_checks["json_registry"] = True

    scores["output_formats"] = min(format_pts, 15)
    details["output_formats"] = {
        "score": scores["output_formats"],
        "max": 15,
        "checks": format_checks,
    }

    # ── Total ─────────────────────────────────────────────────────────────
    total = sum(scores.values())
    grade = _grade(total)

    return {
        "domain": registry.get("domain", ""),
        "total": total,
        "max": 100,
        "grade": grade,
        "label": _label(grade),
        "color": _color(grade),
        "dimensions": details,
        "calculated_at": datetime.utcnow().isoformat(),
    }


def _grade(total: int) -> str:
    if total >= 90: return "A+"
    if total >= 80: return "A"
    if total >= 70: return "B"
    if total >= 55: return "C"
    if total >= 40: return "D"
    return "F"


def _label(grade: str) -> str:
    return {
        "A+": "AI-Ready",
        "A":  "AI-Ready",
        "B":  "Mostly Ready",
        "C":  "Partially Ready",
        "D":  "Needs Work",
        "F":  "Not AI-Ready",
    }.get(grade, "Unknown")


def _color(grade: str) -> str:
    return {
        "A+": "#10b981",
        "A":  "#10b981",
        "B":  "#3b82f6",
        "C":  "#f59e0b",
        "D":  "#f97316",
        "F":  "#ef4444",
    }.get(grade, "#6b7280")


def generate_suggestions(score_result: Dict[str, Any]) -> list:
    """Returns a prioritized list of improvement suggestions."""
    suggestions = []
    dims = score_result.get("dimensions", {})

    wm = dims.get("webmcp_compliance", {})
    if not wm.get("webmcp_enabled"):
        suggestions.append({
            "priority": "high",
            "dimension": "WebMCP",
            "issue": "WebMCP not detected",
            "fix": "Our snippet is installed but WebMCP isn't supported in this browser yet. It will activate automatically when Chrome ships WebMCP to stable.",
        })
    elif wm.get("tools_registered", 0) == 0:
        suggestions.append({
            "priority": "high",
            "dimension": "WebMCP",
            "issue": "No WebMCP tools registered",
            "fix": "We couldn't detect any interactive forms or CTAs to expose as tools. Add structured forms with clear labels.",
        })

    cc = dims.get("content_coverage", {})
    if cc.get("capabilities_found", 0) < 3:
        suggestions.append({
            "priority": "high",
            "dimension": "Content",
            "issue": "Few capabilities detected",
            "fix": "Add a dedicated Features or How It Works page with clear headings for each capability.",
        })
    if cc.get("pages_crawled", 0) < 5:
        suggestions.append({
            "priority": "medium",
            "dimension": "Content",
            "issue": "Low page count indexed",
            "fix": "Make sure your site isn't blocking crawlers. Check robots.txt allows GPTBot and ClaudeBot.",
        })

    sq = dims.get("structure_quality", {})
    checks = sq.get("checks", {})
    if not checks.get("pricing_tiers"):
        suggestions.append({
            "priority": "medium",
            "dimension": "Structure",
            "issue": "No pricing tiers detected",
            "fix": "Add a /pricing page with clearly labeled plan names and prices.",
        })
    if not checks.get("api_base_url"):
        suggestions.append({
            "priority": "low",
            "dimension": "Structure",
            "issue": "No API base URL found",
            "fix": "Add your API base URL to your docs page. AI agents use this to understand how to integrate.",
        })

    fr = dims.get("freshness", {})
    if (fr.get("age_days") or 999) > 30:
        suggestions.append({
            "priority": "medium",
            "dimension": "Freshness",
            "issue": "Registry is stale",
            "fix": "Trigger a manual refresh from your dashboard, or check that auto-refresh is running.",
        })

    return suggestions
