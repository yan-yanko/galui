"""
GEO (Generative Engine Optimization) Score — 0 to 100.

Measures how likely each major LLM is to cite your site in its answers.
Computed entirely from existing registry data — no new data collection needed.

Six dimensions, one per LLM family, each worth 0-20 pts:
  1. chatgpt      (ChatGPT / GPT-4o)    — content density + encyclopedic structure
  2. perplexity   (Perplexity AI)        — freshness + authority signals
  3. claude       (Anthropic Claude)     — clarity + concrete descriptions
  4. gemini       (Google Gemini)        — structured data + schema markup
  5. grok         (xAI Grok)            — recency + topical breadth
  6. llama        (Meta Llama)           — open-web presence + completeness
"""
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# LLM display config
LLM_META = {
    "chatgpt":    {"name": "ChatGPT",    "company": "OpenAI",     "emoji": "🟢", "color": "#10b981"},
    "perplexity": {"name": "Perplexity", "company": "Perplexity", "emoji": "🔵", "color": "#3b82f6"},
    "claude":     {"name": "Claude",     "company": "Anthropic",  "emoji": "🟠", "color": "#f59e0b"},
    "gemini":     {"name": "Gemini",     "company": "Google",     "emoji": "🟣", "color": "#8b5cf6"},
    "grok":       {"name": "Grok",       "company": "xAI",        "emoji": "🩵", "color": "#06b6d4"},
    "llama":      {"name": "Llama",      "company": "Meta",       "emoji": "🔴", "color": "#ef4444"},
}


def calculate_geo_score(registry: Dict[str, Any]) -> Dict[str, Any]:
    """
    Takes a registry dict (same format as calculate_score).
    Returns full GEO breakdown per LLM + total normalized to 0-100.
    """
    dims = {}
    dims["chatgpt"]    = _score_chatgpt(registry)
    dims["perplexity"] = _score_perplexity(registry)
    dims["claude"]     = _score_claude(registry)
    dims["gemini"]     = _score_gemini(registry)
    dims["grok"]       = _score_grok(registry)
    dims["llama"]      = _score_llama(registry)

    # Raw total out of 120, normalize to 0-100
    raw = sum(d["score"] for d in dims.values())
    total = round((raw / 120) * 100)

    grade = _geo_grade(total)

    # Collect all recommendations, pick top 3 by priority
    all_recs = []
    for key, dim in dims.items():
        for rec in dim.get("recommendations", []):
            all_recs.append({"llm": dim["llm"], "rec": rec, "score": dim["score"]})
    # Sort by lowest-scoring LLMs first (most impactful)
    all_recs.sort(key=lambda x: x["score"])
    top_recommendations = [
        {"llm": r["llm"], "action": r["rec"]}
        for r in all_recs[:3]
    ]

    return {
        "domain": registry.get("domain", ""),
        "geo_total": total,
        "geo_grade": grade,
        "geo_label": _geo_label(grade),
        "llms": dims,
        "top_recommendations": top_recommendations,
        "calculated_at": datetime.utcnow().isoformat(),
    }


# ── Per-LLM scorers ────────────────────────────────────────────────────────

def _score_chatgpt(registry: Dict) -> Dict:
    """
    ChatGPT favours: encyclopedic content, deep use cases, clear pricing,
    structured descriptions, documentation links.
    """
    caps = registry.get("capabilities") or []
    meta = registry.get("metadata") or {}
    pricing = registry.get("pricing") or {}
    intg = registry.get("integration") or {}
    ai_meta = registry.get("ai_metadata") or {}

    pts = 0
    recs = []

    # Content depth: capabilities with rich use_cases
    rich_caps = [c for c in caps if isinstance(c, dict) and len(c.get("use_cases", [])) >= 2]
    if len(rich_caps) >= 3:
        pts += 5
    elif len(rich_caps) >= 1:
        pts += 2
    else:
        recs.append("Add 2+ concrete use cases to each capability — ChatGPT cites specific examples")

    # Descriptions are long enough to be informative (>60 chars)
    detailed_caps = [c for c in caps if isinstance(c, dict) and len(c.get("description", "")) > 60]
    if len(detailed_caps) >= 3:
        pts += 4
    elif len(detailed_caps) >= 1:
        pts += 2
    else:
        recs.append("Write longer capability descriptions (1-2 sentences each) — vague descriptions get skipped")

    # Clear pricing numbers (not just 'contact sales')
    tiers = pricing.get("tiers") or []
    priced_tiers = [t for t in tiers if isinstance(t, dict) and t.get("price_per_unit") is not None]
    if len(priced_tiers) >= 1:
        pts += 4
    else:
        recs.append("Add explicit pricing numbers to /pricing — ChatGPT cites sites with clear, factual price data")

    # Docs URL present (LLMs love linking to docs)
    if meta.get("docs_url"):
        pts += 4
    else:
        recs.append("Add a /docs URL — ChatGPT frequently cites documentation pages as authoritative sources")

    # API info (technical content = high citation rate for dev tools)
    if intg.get("api_base_url"):
        pts += 3
    else:
        recs.append("Document your API base URL — technical structure improves ChatGPT citation rate for dev audiences")

    return _dim("chatgpt", min(pts, 20), recs)


def _score_perplexity(registry: Dict) -> Dict:
    """
    Perplexity favours: freshness, outbound authority links, pages crawled,
    specific factual claims with dates.
    """
    ai_meta = registry.get("ai_metadata") or {}
    meta = registry.get("metadata") or {}
    pricing = registry.get("pricing") or {}

    pts = 0
    recs = []

    # Freshness is the #1 factor for Perplexity
    last_updated = ai_meta.get("last_updated") or registry.get("last_updated")
    age_days = _age_days(last_updated)
    if age_days is not None:
        if age_days <= 7:
            pts += 7
        elif age_days <= 30:
            pts += 4
        elif age_days <= 90:
            pts += 2
        else:
            pts += 0
            recs.append("Refresh your registry — Perplexity strongly prioritises recently updated content")
    else:
        recs.append("Index your site to establish a freshness baseline for Perplexity")

    # Authority signals: multiple outbound reference URLs
    authority_urls = [
        meta.get("docs_url"), meta.get("support_url"),
        pricing.get("pricing_page_url"), meta.get("website_url"),
    ]
    authority_count = sum(1 for u in authority_urls if u)
    if authority_count >= 3:
        pts += 5
    elif authority_count >= 1:
        pts += 2
    else:
        recs.append("Add docs, support, and pricing page URLs — Perplexity traces authority through linked references")

    # Page coverage (more pages = broader signal)
    pages = ai_meta.get("pages_crawled", 0)
    if pages >= 10:
        pts += 5
    elif pages >= 5:
        pts += 3
    elif pages >= 2:
        pts += 1
    else:
        recs.append("Ensure more pages are crawlable — Perplexity needs broad page coverage for citation confidence")

    # Pricing page specifically (Perplexity users ask comparison questions)
    if pricing.get("pricing_page_url"):
        pts += 3
    else:
        recs.append("Add a /pricing page URL — Perplexity is heavily used for product comparisons")

    return _dim("perplexity", min(pts, 20), recs)


def _score_claude(registry: Dict) -> Dict:
    """
    Claude favours: clarity, explicit problem statements, concrete constraints,
    well-defined category, honest limitation documentation.
    """
    caps = registry.get("capabilities") or []
    meta = registry.get("metadata") or {}
    limitations = registry.get("limitations") or {}

    pts = 0
    recs = []

    # Capabilities with problems_solved (Claude reasons about problems → solutions)
    caps_with_problems = [
        c for c in caps
        if isinstance(c, dict) and len(c.get("problems_solved", [])) >= 1
    ]
    if len(caps_with_problems) >= 3:
        pts += 6
    elif len(caps_with_problems) >= 1:
        pts += 3
    else:
        recs.append("Add 'problems solved' to each capability — Claude maps user problems to solutions")

    # Clear category (not 'unknown' or 'other')
    category = meta.get("category", "unknown")
    if category and category not in ("unknown", "other", ""):
        pts += 4
    else:
        recs.append("Set a specific category (fintech, devtools, ai, etc.) — Claude uses category for intent matching")

    # Known constraints documented (Claude values honesty and completeness)
    known_constraints = limitations.get("known_constraints") or []
    if len(known_constraints) >= 1:
        pts += 4
    else:
        recs.append("Document known limitations and constraints — Claude cites sources that are honest about their limits")

    # Subcategories / tags (topical specificity)
    sub_cats = meta.get("sub_categories") or []
    if len(sub_cats) >= 2:
        pts += 3
    elif len(sub_cats) >= 1:
        pts += 1
    else:
        recs.append("Add sub-category tags — helps Claude match your site to specific user queries")

    # Confidence score (quality signal)
    conf = (registry.get("ai_metadata") or {}).get("confidence_score", 0)
    if conf >= 0.8:
        pts += 3
    elif conf >= 0.5:
        pts += 1
    else:
        recs.append("Improve content clarity — our AI pipeline gave this a low confidence score")

    return _dim("claude", min(pts, 20), recs)


def _score_gemini(registry: Dict) -> Dict:
    """
    Gemini favours: Schema.org structured data, Google-indexable signals,
    API documentation, SDK availability, pricing tiers.
    """
    intg = registry.get("integration") or {}
    pricing = registry.get("pricing") or {}
    ai_meta = registry.get("ai_metadata") or {}
    meta = registry.get("metadata") or {}

    pts = 0
    recs = []

    # WebMCP / forms detected = schema.org signals present
    if ai_meta.get("webmcp_enabled"):
        pts += 5
    elif ai_meta.get("forms_exposed", 0) > 0:
        pts += 2
    else:
        recs.append("Install the Galuli snippet to enable Schema.org auto-injection — Gemini heavily weights structured data")

    # API base URL (Gemini indexes API docs well)
    if intg.get("api_base_url"):
        pts += 4
    else:
        recs.append("Document your API base URL — Gemini prioritises sites with structured API information")

    # SDKs (Google ecosystem = Gemini familiarity)
    sdks = intg.get("sdks") or []
    if len(sdks) >= 2:
        pts += 4
    elif len(sdks) >= 1:
        pts += 2
    else:
        recs.append("List your SDKs and client libraries — Gemini cites sites with developer ecosystem documentation")

    # Pricing tiers with actual numbers
    tiers = pricing.get("tiers") or []
    if len(tiers) >= 2:
        pts += 4
    elif len(tiers) >= 1:
        pts += 2
    else:
        recs.append("Add structured pricing tiers — Gemini uses these for product comparison queries")

    # OpenAPI spec (maximum structured signal)
    if intg.get("openapi_url"):
        pts += 3
    else:
        recs.append("Add an OpenAPI/Swagger spec URL — the strongest structured signal for Gemini")

    return _dim("gemini", min(pts, 20), recs)


def _score_grok(registry: Dict) -> Dict:
    """
    Grok favours: recency, topical breadth (many sub-categories),
    pages crawled, and up-to-date registry.
    """
    ai_meta = registry.get("ai_metadata") or {}
    meta = registry.get("metadata") or {}
    caps = registry.get("capabilities") or []

    pts = 0
    recs = []

    # Recency (Grok is trained on recent web data)
    last_updated = ai_meta.get("last_updated") or registry.get("last_updated")
    age_days = _age_days(last_updated)
    if age_days is not None:
        if age_days <= 3:
            pts += 7
        elif age_days <= 14:
            pts += 5
        elif age_days <= 60:
            pts += 2
        else:
            recs.append("Update your content regularly — Grok weights recent web presence heavily")

    # Topical breadth via sub_categories
    sub_cats = meta.get("sub_categories") or []
    if len(sub_cats) >= 4:
        pts += 5
    elif len(sub_cats) >= 2:
        pts += 3
    elif len(sub_cats) >= 1:
        pts += 1
    else:
        recs.append("Add more topic tags/sub-categories — Grok matches by topical breadth")

    # Page coverage
    pages = ai_meta.get("pages_crawled", 0)
    if pages >= 15:
        pts += 5
    elif pages >= 8:
        pts += 3
    elif pages >= 3:
        pts += 1
    else:
        recs.append("Index more pages — Grok needs broad site coverage to build citation confidence")

    # Capability count (breadth of what you offer)
    if len(caps) >= 5:
        pts += 3
    elif len(caps) >= 3:
        pts += 2
    elif len(caps) >= 1:
        pts += 1
    else:
        recs.append("Document more capabilities — Grok cites sites that clearly articulate what they offer")

    return _dim("grok", min(pts, 20), recs)


def _score_llama(registry: Dict) -> Dict:
    """
    Llama (Meta) favours: open-web presence, registry completeness,
    confidence score, and broad page indexing.
    """
    ai_meta = registry.get("ai_metadata") or {}
    meta = registry.get("metadata") or {}
    caps = registry.get("capabilities") or []
    intg = registry.get("integration") or {}

    pts = 0
    recs = []

    # Registry completeness: count non-null/non-empty top-level fields
    completeness_checks = [
        meta.get("name"), meta.get("description"), meta.get("category"),
        meta.get("docs_url"), meta.get("website_url"),
        intg.get("api_base_url"), intg.get("auth_methods"),
        len(caps) > 0,
    ]
    complete = sum(1 for c in completeness_checks if c)
    if complete >= 7:
        pts += 6
    elif complete >= 5:
        pts += 4
    elif complete >= 3:
        pts += 2
    else:
        recs.append("Complete more of your site's profile — Llama uses registry completeness as a quality signal")

    # Confidence score from AI pipeline
    conf = ai_meta.get("confidence_score", 0)
    if conf >= 0.85:
        pts += 5
    elif conf >= 0.6:
        pts += 3
    elif conf >= 0.4:
        pts += 1
    else:
        recs.append("Improve content clarity — low AI comprehension confidence hurts Llama citation rate")

    # Pages crawled (open-web breadth)
    pages = ai_meta.get("pages_crawled", 0)
    if pages >= 10:
        pts += 5
    elif pages >= 5:
        pts += 3
    elif pages >= 2:
        pts += 1
    else:
        recs.append("Make more pages crawlable — Llama models are trained on broad web data")

    # Output formats available (Llama-powered tools fetch structured files)
    format_count = sum([
        bool(ai_meta.get("llms_txt_url")),
        bool(ai_meta.get("ai_plugin_url")),
        bool(ai_meta.get("registry_url")),
    ])
    if format_count >= 3:
        pts += 4
    elif format_count >= 1:
        pts += 2
    else:
        recs.append("Ensure llms.txt and JSON registry are accessible — Llama tools fetch these directly")

    return _dim("llama", min(pts, 20), recs)


# ── Helpers ────────────────────────────────────────────────────────────────

def _dim(key: str, score: int, recs: List[str]) -> Dict:
    meta = LLM_META[key]
    status = "good" if score >= 15 else "needs_work" if score >= 8 else "missing"
    return {
        "llm": meta["name"],
        "company": meta["company"],
        "emoji": meta["emoji"],
        "color": meta["color"],
        "score": score,
        "max": 20,
        "status": status,
        "recommendations": recs[:3],  # max 3 per LLM
    }


def _age_days(last_updated) -> Optional[int]:
    if not last_updated:
        return None
    try:
        if isinstance(last_updated, str):
            lu = datetime.fromisoformat(last_updated.replace("Z", "+00:00").replace("+00:00", ""))
        else:
            lu = last_updated
        return (datetime.utcnow() - lu).days
    except Exception:
        return None


def _geo_grade(total: int) -> str:
    if total >= 85: return "A+"
    if total >= 70: return "A"
    if total >= 55: return "B"
    if total >= 40: return "C"
    if total >= 25: return "D"
    return "F"


def _geo_label(grade: str) -> str:
    return {
        "A+": "Highly Citable",
        "A":  "Frequently Cited",
        "B":  "Occasionally Cited",
        "C":  "Rarely Cited",
        "D":  "Unlikely to be Cited",
        "F":  "Not Being Cited",
    }.get(grade, "Unknown")
