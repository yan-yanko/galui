"""
Schema.org / JSON-LD Checker.

Fetches a page's HTML and detects structured data (JSON-LD / microdata).
Checks for high-value schema types: Organization, FAQPage, HowTo, Product.

These schema types are proven to increase AI citation probability (GEO research).
"""
import logging
import json
import re
from typing import Dict, List
import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# Schema types that matter for AI citations (per GEO research)
HIGH_VALUE_SCHEMAS = {
    "organization",
    "faqpage",
    "howto",
    "product",
    "service",
    "article",
    "blogposting",
    "webpage",
    "website",
    "breadcrumblist",
    "sitelinksearchbox",
}

PRIORITY_SCHEMAS = {"faqpage", "howto", "organization", "product"}


class SchemaChecker:
    """Detects JSON-LD / microdata schema on a domain's homepage."""

    async def check(self, domain: str) -> Dict:
        """
        Fetch homepage and extract all schema.org types.

        Returns:
            {
              "schema_org_types": List[str],    # e.g. ["Organization", "FAQPage"]
              "has_faq": bool,
              "has_organization": bool,
              "has_howto": bool,
              "has_product": bool,
              "has_article": bool,
              "schema_count": int,
              "missing_priority": List[str],    # High-value schemas not found
              "details": str,
            }
        """
        url = f"https://{domain}/"
        try:
            async with httpx.AsyncClient(
                timeout=10.0,
                follow_redirects=True,
                headers={
                    "User-Agent": "Galuli-Checker/1.0 (+https://galuli.io/bot)",
                    "Accept": "text/html,application/xhtml+xml",
                },
            ) as client:
                resp = await client.get(url)

            if resp.status_code >= 400:
                return self._empty(domain, f"HTTP {resp.status_code}")

            return self._parse(resp.text)

        except Exception as e:
            logger.warning(f"[schema] Failed to check {url}: {e}")
            return self._empty(domain, str(e))

    def _parse(self, html: str) -> Dict:
        soup = BeautifulSoup(html, "lxml")
        found_types: List[str] = []

        # 1. JSON-LD (most common, highest signal)
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string or "")
                types = self._extract_types(data)
                found_types.extend(types)
            except (json.JSONDecodeError, AttributeError):
                pass

        # 2. Microdata (itemtype attribute)
        for el in soup.find_all(attrs={"itemtype": True}):
            itemtype = el.get("itemtype", "")
            if "schema.org/" in itemtype:
                schema_type = itemtype.split("schema.org/")[-1].strip("/")
                if schema_type:
                    found_types.append(schema_type)

        # Deduplicate, preserve order
        seen = set()
        unique_types = []
        for t in found_types:
            key = t.lower()
            if key not in seen:
                seen.add(key)
                unique_types.append(t)

        lower_types = {t.lower() for t in unique_types}

        has_faq = "faqpage" in lower_types
        has_org = "organization" in lower_types or "localbusiness" in lower_types
        has_howto = "howto" in lower_types
        has_product = "product" in lower_types or "service" in lower_types
        has_article = "article" in lower_types or "blogposting" in lower_types

        missing_priority = []
        if not has_faq:
            missing_priority.append("FAQPage")
        if not has_org:
            missing_priority.append("Organization")
        if not has_howto:
            missing_priority.append("HowTo")

        if not unique_types:
            details = "No schema.org markup found — AI engines lack structured entity context"
        elif missing_priority:
            details = f"Found: {', '.join(unique_types[:4])} | Missing: {', '.join(missing_priority)}"
        else:
            details = f"Good schema coverage: {', '.join(unique_types[:4])}"

        return {
            "schema_org_types": unique_types,
            "has_faq": has_faq,
            "has_organization": has_org,
            "has_howto": has_howto,
            "has_product": has_product,
            "has_article": has_article,
            "schema_count": len(unique_types),
            "missing_priority": missing_priority,
            "details": details,
        }

    def _extract_types(self, data) -> List[str]:
        """Recursively extract @type values from JSON-LD."""
        types = []
        if isinstance(data, dict):
            t = data.get("@type")
            if isinstance(t, str):
                types.append(t)
            elif isinstance(t, list):
                types.extend([x for x in t if isinstance(x, str)])
            # Recurse into @graph and nested objects
            for key, val in data.items():
                if key in ("@graph", "mainEntity", "hasPart", "publisher", "author"):
                    types.extend(self._extract_types(val))
        elif isinstance(data, list):
            for item in data:
                types.extend(self._extract_types(item))
        return types

    def _empty(self, domain: str, reason: str) -> Dict:
        return {
            "schema_org_types": [],
            "has_faq": False,
            "has_organization": False,
            "has_howto": False,
            "has_product": False,
            "has_article": False,
            "schema_count": 0,
            "missing_priority": ["FAQPage", "Organization", "HowTo"],
            "details": f"Could not check schema: {reason}",
        }
