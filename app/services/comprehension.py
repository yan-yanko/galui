import json
import logging
from typing import Any, Dict

import anthropic

from app.models.crawl import CrawlResult

logger = logging.getLogger(__name__)

# ── Prompts ──────────────────────────────────────────────────────────────────
# Each targets one section of the schema. Haiku for structured extraction,
# Sonnet for sections requiring genuine product comprehension.

METADATA_PROMPT = """
You are extracting structured business information from website content.
Extract ONLY what is explicitly stated. Use null for unknown fields.
Return valid JSON only — no explanation, no markdown fences.

Website content (multiple pages):
{content}

Return this exact JSON structure:
{{
  "name": "Company/product name",
  "description": "One sentence value proposition (what it does and for whom)",
  "category": "One of: fintech|devtools|ai|analytics|infrastructure|ecommerce|hr|crm|security|communication|productivity|other",
  "sub_categories": ["tag1", "tag2"],
  "headquarters": "City, Country or null",
  "founded_year": 2015,
  "company_size": "startup|smb|enterprise or null",
  "website_url": "https://...",
  "logo_url": "https://... or null",
  "support_url": "https://support.example.com or null",
  "docs_url": "https://docs.example.com or null",
  "api_base_url": "https://api.example.com or null (infer from docs URLs, code examples, or SDK documentation even if not explicitly stated as 'API base URL')",
  "api_version": "v2 or null",
  "auth_methods": ["api_key", "oauth2", "basic_auth"],
  "auth_notes": "How auth works in one sentence or null",
  "sdks": [
    {{"language": "Python", "package_name": "stripe", "install_command": "pip install stripe", "docs_url": null}}
  ],
  "webhooks_supported": false,
  "webhook_docs_url": null,
  "status_page_url": "https://status.example.com or null",
  "pricing_page_url": "https://example.com/pricing or null",
  "openapi_url": null
}}
"""

CAPABILITIES_PROMPT = """
You are a technical analyst identifying what problems this product solves for developers and businesses.
An AI agent will read your output to decide whether to use this service.
Be concrete. Focus on what the service DOES, not marketing language.
Return valid JSON array only — no explanation, no markdown fences.

Website content:
{content}

Return a JSON array of capabilities. Max 8. Each item:
{{
  "name": "Short capability name (2-5 words)",
  "description": "What it does in one concrete sentence",
  "category": "core|addon|enterprise",
  "problems_solved": ["Problem 1 (specific)", "Problem 2"],
  "inputs": {{
    "required": ["param1", "param2"],
    "optional": ["param3"]
  }},
  "outputs": {{
    "success": ["result1", "result2"],
    "failure": ["error_code", "error_message"]
  }},
  "constraints": ["Any hard limitations specific to this capability"],
  "use_cases": ["Concrete use case 1", "Concrete use case 2"]
}}
"""

PRICING_PROMPT = """
Extract pricing information from this content. Be precise about numbers.
Use null for truly unknown values. Do NOT hallucinate prices.
Return valid JSON only — no explanation, no markdown fences.

Content:
{content}

Return:
{{
  "model": "per_transaction|subscription|usage_based|freemium|free|contact_sales|unknown",
  "has_free_tier": true,
  "contact_sales_required": false,
  "tiers": [
    {{
      "name": "Starter",
      "price_per_unit": 29.00,
      "unit": "per_month|per_seat|per_transaction|per_call|per_1k_tokens|other",
      "plus_fixed": null,
      "currency": "USD",
      "contact_sales": false,
      "description": "Human-readable summary of what this tier includes"
    }}
  ],
  "free_tier_details": "What the free tier includes, or null",
  "pricing_page_url": "https://... or null",
  "pricing_notes": "Important caveats (e.g. annual billing required, regional pricing) or null"
}}
"""

LIMITATIONS_PROMPT = """
Extract operational constraints, limitations, and restrictions from this content.
An AI agent needs this to know what it cannot do with this service.
Be precise. Use empty arrays for unknown fields. Do NOT make up limits.
Return valid JSON only — no explanation, no markdown fences.

Content:
{content}

Return:
{{
  "rate_limits": [
    {{"scope": "API requests", "limit": 100, "window": "per_second", "notes": "..."}}
  ],
  "geographic_restrictions": [
    {{
      "type": "availability",
      "regions_available": ["US", "EU", "UK"],
      "regions_restricted": ["CN", "RU"],
      "notes": "Additional notes or null"
    }}
  ],
  "data_formats": {{
    "input": ["JSON", "XML", "CSV"],
    "output": ["JSON"],
    "encoding": "UTF-8"
  }},
  "sla_uptime_percent": 99.9,
  "known_constraints": [
    "Maximum file size 100MB",
    "Webhooks require HTTPS endpoints"
  ]
}}
"""


class ComprehensionService:
    """
    Four-pass LLM pipeline to extract CapabilityRegistry fields from crawled content.

    Pass 1 (Haiku):  Metadata + integration fields — structured extraction
    Pass 2 (Sonnet): Capabilities — requires genuine product comprehension
    Pass 3 (Haiku):  Pricing — structured extraction from pricing page
    Pass 4 (Sonnet): Limitations — requires inferencing from scattered content

    Estimated cost: ~$0.01-0.05 per domain crawl.
    """

    def __init__(self):
        from app.config import settings
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.fast_model = settings.fast_model
        self.deep_model = settings.deep_model

    async def extract(self, crawl_result: CrawlResult) -> Dict[str, Any]:
        """
        Run full extraction pipeline.
        Returns raw dict; registry_builder.py normalizes to schema.
        """
        full_content = self._prepare_content(crawl_result)
        pricing_content = self._get_pricing_content(crawl_result)

        # Pass 1: Haiku — metadata + integration (fast structured fields)
        logger.info(f"[{crawl_result.domain}] Pass 1/4: metadata (haiku)")
        metadata_raw = self._call_llm(
            model=self.fast_model,
            prompt=METADATA_PROMPT.format(content=full_content[:30_000]),
            max_tokens=2000,
        )

        # Pass 2: Sonnet — capabilities (requires product comprehension)
        logger.info(f"[{crawl_result.domain}] Pass 2/4: capabilities (sonnet)")
        capabilities_raw = self._call_llm(
            model=self.deep_model,
            prompt=CAPABILITIES_PROMPT.format(content=full_content[:60_000]),
            max_tokens=3000,
        )

        # Pass 3: Haiku — pricing (structured extraction)
        logger.info(f"[{crawl_result.domain}] Pass 3/4: pricing (haiku)")
        pricing_raw = self._call_llm(
            model=self.fast_model,
            prompt=PRICING_PROMPT.format(content=pricing_content),
            max_tokens=1500,
        )

        # Pass 4: Sonnet — limitations (requires inferencing)
        logger.info(f"[{crawl_result.domain}] Pass 4/4: limitations (sonnet)")
        limitations_raw = self._call_llm(
            model=self.deep_model,
            prompt=LIMITATIONS_PROMPT.format(content=full_content[:40_000]),
            max_tokens=1500,
        )

        return {
            "metadata": metadata_raw,
            "capabilities": capabilities_raw,
            "pricing": pricing_raw,
            "limitations": limitations_raw,
            "pages_crawled": crawl_result.total_pages,
        }

    def _prepare_content(self, crawl_result: CrawlResult) -> str:
        """Concatenate all pages with URL headers for LLM context."""
        parts = []
        for page in crawl_result.pages:
            parts.append(f"=== PAGE: {page.url} ===\n{page.text[:5_000]}")
        return "\n\n".join(parts)

    def _get_pricing_content(self, crawl_result: CrawlResult) -> str:
        """Prefer pricing page; fall back to full content."""
        for page in crawl_result.pages:
            if any(kw in page.url.lower() for kw in ["/pricing", "/price", "/plans"]):
                full = f"=== PRICING PAGE: {page.url} ===\n{page.text}"
                # Include homepage too for context
                if crawl_result.pages:
                    full += f"\n\n=== HOMEPAGE ===\n{crawl_result.pages[0].text[:3_000]}"
                return full
        # Fallback: first 20k of full content
        return self._prepare_content(crawl_result)[:20_000]

    def _call_llm(self, model: str, prompt: str, max_tokens: int) -> Any:
        """
        Call Claude synchronously (Anthropic SDK is sync).
        Parse JSON response. Return empty fallback on failure — never raises.
        """
        try:
            message = self.client.messages.create(
                model=model,
                max_tokens=max_tokens,
                messages=[{"role": "user", "content": prompt}],
            )
            content = message.content[0].text.strip()

            # Strip markdown code fences if model wraps response
            if content.startswith("```"):
                parts = content.split("```")
                if len(parts) >= 2:
                    content = parts[1]
                    if content.startswith("json"):
                        content = content[4:]
                    content = content.strip()

            return json.loads(content)

        except json.JSONDecodeError as e:
            logger.warning(f"JSON parse error from {model}: {e}")
            return {} if "PROMPT" not in prompt or "array" not in prompt else []
        except anthropic.APIError as e:
            logger.error(f"Anthropic API error ({model}): {e}")
            return {}
        except Exception as e:
            logger.error(f"LLM call failed ({model}): {e}", exc_info=True)
            return {}
