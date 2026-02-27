"""
Analytics service — stores and queries AI agent hit events.

Schema:
  agent_events: domain, page_url, agent_name, agent_type, user_agent, referrer, ts

Feature additions (Sprint 1 — AI Analytics ROI Engine):
  - get_topic_map()       — map page URLs to topics + AI attention per topic
  - get_ai_attention_score() — 0-100 score per domain (frequency × depth × recency)
  - get_per_llm_depth()   — per-LLM crawl depth (unique pages per agent)
  - get_agent_trend()     — per-agent daily trend (for sparklines)
"""
import sqlite3
import logging
import re
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

CREATE_AGENT_EVENTS = """
CREATE TABLE IF NOT EXISTS agent_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    domain      TEXT NOT NULL,
    page_url    TEXT NOT NULL,
    agent_name  TEXT NOT NULL,
    agent_type  TEXT NOT NULL,
    user_agent  TEXT,
    referrer    TEXT,
    ts          TEXT NOT NULL
)
"""

CREATE_INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_ae_domain ON agent_events(domain)",
    "CREATE INDEX IF NOT EXISTS idx_ae_ts     ON agent_events(ts)",
    "CREATE INDEX IF NOT EXISTS idx_ae_agent  ON agent_events(agent_name)",
    "CREATE INDEX IF NOT EXISTS idx_ae_domain_ts ON agent_events(domain, ts)",
]

# Known AI agent user-agent patterns → (display_name, type)
# type: crawler | llm | agent
AI_AGENTS = {
    "gptbot":           ("GPTBot",          "crawler"),
    "chatgpt-user":     ("ChatGPT",         "llm"),
    "oai-searchbot":    ("OpenAI Search",   "crawler"),
    "claudebot":        ("ClaudeBot",       "crawler"),
    "claude-web":       ("Claude Web",      "llm"),
    "anthropic-ai":     ("Anthropic",       "crawler"),
    "perplexitybot":    ("PerplexityBot",   "crawler"),
    "perplexity":       ("Perplexity",      "llm"),
    "gemini":           ("Gemini",          "llm"),
    "google-extended":  ("Google Extended", "crawler"),
    "bingbot":          ("BingBot",         "crawler"),
    "bingpreview":      ("Bing Preview",    "crawler"),
    "cohere-ai":        ("Cohere",          "crawler"),
    "youbot":           ("YouBot",          "crawler"),
    "diffbot":          ("Diffbot",         "agent"),
    "ia_archiver":      ("Wayback",         "crawler"),
    "amazonbot":        ("AmazonBot",       "crawler"),
    "bytespider":       ("ByteSpider",      "crawler"),
    "applebot":         ("AppleBot",        "crawler"),
    "meta-externalagent": ("MetaAI",        "crawler"),
    "facebookbot":      ("FacebookBot",     "crawler"),
    "webmcp":           ("WebMCP Agent",    "agent"),
}

# ── Topic inference from URL path ──────────────────────────────────────────────
# Maps URL path keywords → human-readable topic labels
TOPIC_PATTERNS = [
    # Order matters — first match wins
    (r"blog|post|article|news|insights?|learn",         "Blog & Articles"),
    (r"product|feature|platform|solution|tool",         "Product & Features"),
    (r"pricing|plans?|billing|checkout|upgrade",        "Pricing & Plans"),
    (r"about|company|team|story|mission|values?",       "About & Company"),
    (r"docs?|documentation|guide|tutorial|howto|api",   "Docs & Guides"),
    (r"case.?stud|customer|success|testimonial|review", "Case Studies"),
    (r"contact|support|help|faq|feedback",              "Support & Contact"),
    (r"roadmap|changelog|release|update|version",       "Roadmap & Updates"),
    (r"careers?|jobs?|hiring|team",                     "Careers"),
    (r"legal|privacy|terms|policy|gdpr|cookie",         "Legal"),
    (r"login|signup|register|auth|verify",              "Auth Pages"),
]


def _infer_topic(page_url: str) -> str:
    """Infer a content topic from a page URL path."""
    try:
        # Strip scheme and domain, get path
        path = re.sub(r"^https?://[^/]+", "", page_url).lower()
        if not path or path == "/":
            return "Homepage"
        for pattern, label in TOPIC_PATTERNS:
            if re.search(pattern, path):
                return label
        # Fallback: use first path segment cleaned up
        segment = path.strip("/").split("/")[0]
        segment = re.sub(r"[-_]", " ", segment).title()
        return segment or "Other"
    except Exception:
        return "Other"


def detect_agent(user_agent: str) -> Optional[tuple]:
    """
    Returns (agent_name, agent_type) if UA matches a known AI agent.
    Returns None if it's a regular browser/bot.
    """
    ua = user_agent.lower()
    for pattern, (name, agent_type) in AI_AGENTS.items():
        if pattern in ua:
            return name, agent_type
    return None


class AnalyticsService:

    def __init__(self, db_path: str = None):
        if db_path is None:
            from app.config import settings
            db_path = settings.database_url
        self.db_path = db_path
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_conn() as conn:
            conn.execute(CREATE_AGENT_EVENTS)
            for idx in CREATE_INDEXES:
                conn.execute(idx)
            conn.commit()

    def record_event(
        self,
        domain: str,
        page_url: str,
        agent_name: str,
        agent_type: str,
        user_agent: str,
        referrer: Optional[str] = None,
        ts: Optional[str] = None,
    ):
        """Fire-and-forget. Never blocks the request."""
        try:
            with self._get_conn() as conn:
                conn.execute(
                    """
                    INSERT INTO agent_events
                        (domain, page_url, agent_name, agent_type, user_agent, referrer, ts)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        domain,
                        page_url,
                        agent_name,
                        agent_type,
                        user_agent,
                        referrer,
                        ts or datetime.utcnow().isoformat(),
                    ),
                )
                conn.commit()
        except Exception as e:
            logger.warning(f"Analytics record_event failed: {e}")

    def get_summary(self, domain: str, days: int = 30) -> Dict[str, Any]:
        """Full analytics summary for a domain."""
        since = (datetime.utcnow() - timedelta(days=days)).isoformat()
        with self._get_conn() as conn:
            # Total hits
            total = conn.execute(
                "SELECT COUNT(*) FROM agent_events WHERE domain=? AND ts>=?",
                (domain, since)
            ).fetchone()[0]

            if total == 0:
                return {
                    "domain": domain,
                    "days": days,
                    "total_ai_hits": 0,
                    "unique_agents": 0,
                    "top_agents": [],
                    "top_pages": [],
                    "daily_trend": [],
                }

            # Unique agents
            unique_agents = conn.execute(
                "SELECT COUNT(DISTINCT agent_name) FROM agent_events WHERE domain=? AND ts>=?",
                (domain, since)
            ).fetchone()[0]

            # Top agents
            top_agents = conn.execute(
                """
                SELECT agent_name, agent_type, COUNT(*) as hits
                FROM agent_events WHERE domain=? AND ts>=?
                GROUP BY agent_name ORDER BY hits DESC LIMIT 10
                """,
                (domain, since)
            ).fetchall()

            # Top pages
            top_pages = conn.execute(
                """
                SELECT page_url, COUNT(*) as hits
                FROM agent_events WHERE domain=? AND ts>=?
                GROUP BY page_url ORDER BY hits DESC LIMIT 10
                """,
                (domain, since)
            ).fetchall()

            # Daily trend (last N days)
            daily = conn.execute(
                """
                SELECT substr(ts, 1, 10) as day, COUNT(*) as hits
                FROM agent_events WHERE domain=? AND ts>=?
                GROUP BY day ORDER BY day ASC
                """,
                (domain, since)
            ).fetchall()

        return {
            "domain": domain,
            "days": days,
            "total_ai_hits": total,
            "unique_agents": unique_agents,
            "top_agents": [dict(r) for r in top_agents],
            "top_pages": [dict(r) for r in top_pages],
            "daily_trend": [dict(r) for r in daily],
        }

    def get_agent_breakdown(self, domain: str, days: int = 30) -> Dict[str, Any]:
        since = (datetime.utcnow() - timedelta(days=days)).isoformat()
        with self._get_conn() as conn:
            rows = conn.execute(
                """
                SELECT agent_name, agent_type, COUNT(*) as hits,
                       COUNT(DISTINCT page_url) as unique_pages
                FROM agent_events WHERE domain=? AND ts>=?
                GROUP BY agent_name ORDER BY hits DESC
                """,
                (domain, since)
            ).fetchall()
        return {"domain": domain, "days": days, "agents": [dict(r) for r in rows]}

    def get_page_breakdown(self, domain: str, days: int = 30) -> Dict[str, Any]:
        since = (datetime.utcnow() - timedelta(days=days)).isoformat()
        with self._get_conn() as conn:
            rows = conn.execute(
                """
                SELECT page_url,
                       COUNT(*) as total_hits,
                       COUNT(DISTINCT agent_name) as unique_agents
                FROM agent_events WHERE domain=? AND ts>=?
                GROUP BY page_url ORDER BY total_hits DESC LIMIT 50
                """,
                (domain, since)
            ).fetchall()
        return {"domain": domain, "days": days, "pages": [dict(r) for r in rows]}

    def get_all_domains_summary(self) -> List[Dict[str, Any]]:
        """Used by admin dashboard — all domains with hit counts."""
        since = (datetime.utcnow() - timedelta(days=30)).isoformat()
        with self._get_conn() as conn:
            rows = conn.execute(
                """
                SELECT domain, COUNT(*) as hits_30d,
                       COUNT(DISTINCT agent_name) as unique_agents,
                       MAX(ts) as last_hit
                FROM agent_events WHERE ts>=?
                GROUP BY domain ORDER BY hits_30d DESC
                """,
                (since,)
            ).fetchall()
        return [dict(r) for r in rows]

    # ── Sprint 1: AI Analytics ROI Engine ─────────────────────────────────────

    def get_topic_map(self, domain: str, days: int = 30) -> Dict[str, Any]:
        """
        Map page URLs to content topics, aggregate AI attention per topic.

        Returns topics ranked by total AI hits, with per-agent breakdown
        so customers see WHICH AI systems care about WHICH content areas.
        """
        since = (datetime.utcnow() - timedelta(days=days)).isoformat()
        with self._get_conn() as conn:
            rows = conn.execute(
                """
                SELECT page_url, agent_name, agent_type, COUNT(*) as hits
                FROM agent_events WHERE domain=? AND ts>=?
                GROUP BY page_url, agent_name
                ORDER BY hits DESC
                """,
                (domain, since)
            ).fetchall()

        if not rows:
            return {"domain": domain, "days": days, "topics": []}

        # Aggregate by topic
        topic_data: Dict[str, Dict] = {}
        for row in rows:
            topic = _infer_topic(row["page_url"])
            if topic not in topic_data:
                topic_data[topic] = {
                    "topic": topic,
                    "total_hits": 0,
                    "unique_pages": set(),
                    "agents": {},
                }
            topic_data[topic]["total_hits"] += row["hits"]
            topic_data[topic]["unique_pages"].add(row["page_url"])
            agent = row["agent_name"]
            topic_data[topic]["agents"][agent] = topic_data[topic]["agents"].get(agent, 0) + row["hits"]

        # Sort by total_hits desc, serialize
        sorted_topics = sorted(topic_data.values(), key=lambda x: x["total_hits"], reverse=True)
        max_hits = sorted_topics[0]["total_hits"] if sorted_topics else 1

        result = []
        for t in sorted_topics:
            top_agents = sorted(t["agents"].items(), key=lambda x: x[1], reverse=True)[:5]
            result.append({
                "topic": t["topic"],
                "total_hits": t["total_hits"],
                "unique_pages": len(t["unique_pages"]),
                "attention_pct": round(t["total_hits"] / max_hits * 100),
                "top_agents": [{"agent": a, "hits": h} for a, h in top_agents],
            })

        return {"domain": domain, "days": days, "topics": result}

    def get_ai_attention_score(self, domain: str, days: int = 30) -> Dict[str, Any]:
        """
        AI Attention Score (0-100) — composite metric measuring how much AI systems
        are paying attention to this site.

        Components:
          - Frequency score (40%): total hits vs benchmark
          - Depth score (35%):     unique pages crawled / total pages (breadth of interest)
          - Recency score (25%):   how recent was the last crawl (decays over time)
          - Diversity bonus:       number of distinct AI agents (up to +10 pts)

        Benchmark: 500 hits/30d = score of 100 for frequency
        """
        since = (datetime.utcnow() - timedelta(days=days)).isoformat()
        now = datetime.utcnow()

        with self._get_conn() as conn:
            total_hits = conn.execute(
                "SELECT COUNT(*) FROM agent_events WHERE domain=? AND ts>=?",
                (domain, since)
            ).fetchone()[0]

            if total_hits == 0:
                return {
                    "domain": domain,
                    "score": 0,
                    "grade": "F",
                    "components": {
                        "frequency": 0,
                        "depth": 0,
                        "recency": 0,
                        "diversity_bonus": 0,
                    },
                    "insight": "No AI traffic recorded yet. Install the Galuli snippet to start tracking.",
                }

            unique_pages = conn.execute(
                "SELECT COUNT(DISTINCT page_url) FROM agent_events WHERE domain=? AND ts>=?",
                (domain, since)
            ).fetchone()[0]

            unique_agents = conn.execute(
                "SELECT COUNT(DISTINCT agent_name) FROM agent_events WHERE domain=? AND ts>=?",
                (domain, since)
            ).fetchone()[0]

            last_hit_ts = conn.execute(
                "SELECT MAX(ts) FROM agent_events WHERE domain=?",
                (domain,)
            ).fetchone()[0]

        # Frequency score (0-40): benchmark 500 hits = full score
        freq_score = min(40, round(total_hits / 500 * 40))

        # Depth score (0-35): benchmark 20+ unique pages = full score
        depth_score = min(35, round(unique_pages / 20 * 35))

        # Recency score (0-25): last hit within 24h = 25, decays to 0 at 14d
        recency_score = 0
        if last_hit_ts:
            try:
                last_dt = datetime.fromisoformat(last_hit_ts)
                hours_ago = (now - last_dt).total_seconds() / 3600
                if hours_ago <= 24:
                    recency_score = 25
                elif hours_ago <= 336:  # 14 days
                    recency_score = max(0, round(25 * (1 - hours_ago / 336)))
            except Exception:
                pass

        # Diversity bonus (0-10): 5+ agents = full bonus
        diversity_bonus = min(10, unique_agents * 2)

        raw = freq_score + depth_score + recency_score + diversity_bonus
        score = min(100, raw)

        # Grade
        if score >= 90:
            grade = "A+"
        elif score >= 80:
            grade = "A"
        elif score >= 70:
            grade = "B"
        elif score >= 60:
            grade = "C"
        elif score >= 40:
            grade = "D"
        else:
            grade = "F"

        # Insight message
        if score >= 80:
            insight = "Excellent AI visibility. Multiple AI systems are actively indexing your content."
        elif score >= 60:
            insight = "Good AI coverage. A few more crawl visits would push this into the top tier."
        elif score >= 40:
            insight = "Moderate AI attention. Consider improving structured data and llms.txt to attract more crawlers."
        elif score >= 20:
            insight = "Low AI attention. AI agents are rarely visiting — check your robots.txt and structured data."
        else:
            insight = "Very low AI visibility. Install the snippet and add llms.txt to get discovered."

        return {
            "domain": domain,
            "score": score,
            "grade": grade,
            "components": {
                "frequency": freq_score,
                "depth": depth_score,
                "recency": recency_score,
                "diversity_bonus": diversity_bonus,
            },
            "raw_stats": {
                "total_hits": total_hits,
                "unique_pages": unique_pages,
                "unique_agents": unique_agents,
            },
            "insight": insight,
        }

    def get_per_llm_depth(self, domain: str, days: int = 30) -> Dict[str, Any]:
        """
        Per-LLM crawl depth analysis.

        Returns each AI agent's:
          - total hits
          - unique pages crawled
          - depth ratio (unique pages / total hits — low ratio = repeated re-crawls)
          - first seen / last seen timestamps
          - trend: 'growing' | 'stable' | 'declining'
        """
        since = (datetime.utcnow() - timedelta(days=days)).isoformat()
        half = (datetime.utcnow() - timedelta(days=days // 2)).isoformat()

        with self._get_conn() as conn:
            rows = conn.execute(
                """
                SELECT agent_name, agent_type,
                       COUNT(*) as total_hits,
                       COUNT(DISTINCT page_url) as unique_pages,
                       MIN(ts) as first_seen,
                       MAX(ts) as last_seen
                FROM agent_events WHERE domain=? AND ts>=?
                GROUP BY agent_name
                ORDER BY total_hits DESC
                """,
                (domain, since)
            ).fetchall()

            # Get hits in first half vs second half of the period (for trend)
            first_half = conn.execute(
                "SELECT agent_name, COUNT(*) as hits FROM agent_events WHERE domain=? AND ts>=? AND ts<? GROUP BY agent_name",
                (domain, since, half)
            ).fetchall()
            second_half = conn.execute(
                "SELECT agent_name, COUNT(*) as hits FROM agent_events WHERE domain=? AND ts>=? GROUP BY agent_name",
                (domain, half)
            ).fetchall()

        first_map = {r["agent_name"]: r["hits"] for r in first_half}
        second_map = {r["agent_name"]: r["hits"] for r in second_half}

        agents = []
        for row in rows:
            name = row["agent_name"]
            h1 = first_map.get(name, 0)
            h2 = second_map.get(name, 0)

            if h2 > h1 * 1.2:
                trend = "growing"
            elif h2 < h1 * 0.8:
                trend = "declining"
            else:
                trend = "stable"

            total = row["total_hits"]
            pages = row["unique_pages"]
            agents.append({
                "agent_name": name,
                "agent_type": row["agent_type"],
                "total_hits": total,
                "unique_pages": pages,
                "depth_ratio": round(pages / total, 2) if total > 0 else 0,
                "first_seen": row["first_seen"],
                "last_seen": row["last_seen"],
                "trend": trend,
                "hits_first_half": h1,
                "hits_second_half": h2,
            })

        return {"domain": domain, "days": days, "agents": agents}

    def get_agent_trend(self, domain: str, agent_name: str, days: int = 30) -> Dict[str, Any]:
        """Daily hit trend for a specific agent — for sparklines."""
        since = (datetime.utcnow() - timedelta(days=days)).isoformat()
        with self._get_conn() as conn:
            rows = conn.execute(
                """
                SELECT substr(ts, 1, 10) as day, COUNT(*) as hits
                FROM agent_events WHERE domain=? AND agent_name=? AND ts>=?
                GROUP BY day ORDER BY day ASC
                """,
                (domain, agent_name, since)
            ).fetchall()
        return {
            "domain": domain,
            "agent_name": agent_name,
            "days": days,
            "trend": [dict(r) for r in rows],
        }
