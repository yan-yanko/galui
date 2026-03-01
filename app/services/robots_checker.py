"""
Robots.txt AI Crawler Checker.

Fetches and parses robots.txt to detect if major AI crawlers are blocked.
Used by the ingest pipeline to add robots audit to the registry.

AI crawlers checked: GPTBot, ClaudeBot, PerplexityBot, anthropic-ai, cohere-ai, Bytespider
"""
import logging
from typing import Dict, List, Optional
import httpx

logger = logging.getLogger(__name__)

AI_CRAWLERS = [
    "gptbot",
    "claudebot",
    "perplexitybot",
    "anthropic-ai",
    "cohere-ai",
    "bytespider",
    "googlebot",
    "bingbot",
    "ccbot",
    "omgilibot",
]

HIGH_IMPACT_CRAWLERS = {"gptbot", "claudebot", "perplexitybot", "anthropic-ai"}


class RobotsChecker:
    """Lightweight robots.txt parser that checks for AI crawler restrictions."""

    async def check(self, domain: str) -> Dict:
        """
        Fetch and parse robots.txt for the given domain.

        Returns dict with:
          blocks_ai_crawlers: bool   -- True if high-impact crawlers are blocked
          blocked_crawlers: list     -- Which crawlers are Disallowed: /
          allowed_crawlers: list     -- Crawlers not blocked
          has_robots_txt: bool
          robots_txt_url: str
          crawl_delay: int or None
          details: str               -- Human-readable summary
        """
        url = f"https://{domain}/robots.txt"
        try:
            async with httpx.AsyncClient(
                timeout=8.0,
                follow_redirects=True,
                headers={"User-Agent": "Galuli-Checker/1.0 (+https://galuli.io/bot)"},
            ) as client:
                resp = await client.get(url)

            if resp.status_code != 200:
                return self._no_robots(domain, url)

            return self._parse(domain, url, resp.text)

        except Exception as e:
            logger.warning(f"[robots.txt] Failed to fetch {url}: {e}")
            return self._no_robots(domain, url)

    def _parse(self, domain: str, url: str, content: str) -> Dict:
        lines = content.splitlines()
        current_agents: List[str] = []
        blocked: set = set()
        crawl_delay: Optional[int] = None
        global_block = False

        for line in lines:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if ":" not in line:
                continue
            key, _, value = line.partition(":")
            key = key.strip().lower()
            value = value.strip()

            if key == "user-agent":
                agent = value.lower()
                if agent == "*":
                    current_agents = ["*"]
                else:
                    if current_agents == ["*"]:
                        current_agents = []
                    current_agents.append(agent)
            elif key == "disallow":
                if value == "/" or value.startswith("/*"):
                    for agent in current_agents:
                        if agent == "*":
                            global_block = True
                        else:
                            blocked.add(agent)
            elif key == "crawl-delay":
                try:
                    crawl_delay = crawl_delay or int(float(value))
                except ValueError:
                    pass

        blocked_ai = [c for c in AI_CRAWLERS if c in blocked or global_block]
        high_impact_blocked = [c for c in blocked_ai if c in HIGH_IMPACT_CRAWLERS]
        blocks_ai_crawlers = len(high_impact_blocked) > 0

        if not blocked_ai:
            details = "All AI crawlers are permitted"
        elif blocks_ai_crawlers:
            details = f"Blocking high-impact AI crawlers: {', '.join(high_impact_blocked)}"
        else:
            details = f"Blocking minor AI crawlers: {', '.join(blocked_ai)}"

        return {
            "blocks_ai_crawlers": blocks_ai_crawlers,
            "blocked_crawlers": blocked_ai,
            "allowed_crawlers": [c for c in AI_CRAWLERS if c not in blocked_ai],
            "has_robots_txt": True,
            "robots_txt_url": url,
            "crawl_delay": crawl_delay,
            "details": details,
        }

    def _no_robots(self, domain: str, url: str) -> Dict:
        return {
            "blocks_ai_crawlers": False,
            "blocked_crawlers": [],
            "allowed_crawlers": list(AI_CRAWLERS),
            "has_robots_txt": False,
            "robots_txt_url": url,
            "crawl_delay": None,
            "details": "No robots.txt found -- all crawlers permitted by default",
        }
