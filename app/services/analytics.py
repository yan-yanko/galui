"""
Analytics service — stores and queries AI agent hit events.

Schema:
  agent_events: domain, page_url, agent_name, agent_type, user_agent, referrer, ts
"""
import sqlite3
import logging
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

            # Daily trend (last 30 days)
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
