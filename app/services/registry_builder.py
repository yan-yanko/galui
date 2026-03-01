import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.models.registry import (
    AIMetadata,
    Capability,
    CapabilityInput,
    CapabilityOutput,
    CapabilityRegistry,
    DataFormats,
    GeographicRestriction,
    Integration,
    Limitations,
    Pricing,
    PricingTier,
    RateLimit,
    Reliability,
    SDK,
    ServiceMetadata,
)

logger = logging.getLogger(__name__)


# ── Type coercion helpers — never raise ──────────────────────────────────────

def _str(val: Any, default: str = "") -> str:
    if val is None:
        return default
    s = str(val).strip()
    return s if s else default


def _int(val: Any, default: Optional[int] = None) -> Optional[int]:
    try:
        return int(val)
    except (TypeError, ValueError):
        return default


def _float(val: Any, default: Optional[float] = None) -> Optional[float]:
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


def _bool(val: Any, default: bool = False) -> bool:
    if isinstance(val, bool):
        return val
    if isinstance(val, str):
        return val.lower() in ("true", "yes", "1")
    if isinstance(val, int):
        return val != 0
    return default


def _list(val: Any) -> List[str]:
    if isinstance(val, list):
        return [str(x).strip() for x in val if x is not None and str(x).strip()]
    if isinstance(val, str) and val.strip():
        return [val.strip()]
    return []


def _dict(val: Any) -> Dict:
    if isinstance(val, dict):
        return val
    return {}


class RegistryBuilder:
    """
    Maps raw LLM extraction output → validated CapabilityRegistry schema.

    This is a pure normalization layer. It never raises. Unknown/bad LLM output
    becomes sensible defaults. Modeled on _normalize_persona() from Pygmalion.
    """

    def build(
        self,
        domain: str,
        raw: Dict[str, Any],
        confidence_score: float = 0.0,
        base_api_url: str = "",
        webmcp_meta: Optional[Dict] = None,
        robots_result: Optional[Dict] = None,
        schema_result: Optional[Dict] = None,
    ) -> CapabilityRegistry:
        meta_raw = _dict(raw.get("metadata"))
        caps_raw = raw.get("capabilities") or []
        pricing_raw = _dict(raw.get("pricing"))
        limits_raw = _dict(raw.get("limitations"))
        pages_crawled = _int(raw.get("pages_crawled"), 0) or 0
        webmcp_meta = webmcp_meta or {}

        metadata = self._build_metadata(domain, meta_raw)
        capabilities = self._build_capabilities(caps_raw)
        pricing = self._build_pricing(pricing_raw)
        limitations = self._build_limitations(limits_raw)
        integration = self._build_integration(meta_raw)
        reliability = self._build_reliability(meta_raw)
        robots = robots_result or {}
        schema = schema_result or {}
        ai_metadata = AIMetadata(
            llms_txt_url=f"{base_api_url}/registry/{domain}/llms.txt",
            ai_plugin_url=f"{base_api_url}/registry/{domain}/ai-plugin.json",
            registry_url=f"{base_api_url}/registry/{domain}",
            confidence_score=round(confidence_score, 3),
            extraction_model="claude-sonnet-4-5",
            pages_crawled=pages_crawled,
            last_updated=datetime.utcnow(),
            webmcp_enabled=webmcp_meta.get("enabled", False),
            webmcp_tools_count=webmcp_meta.get("tools_count", 0),
            forms_exposed=webmcp_meta.get("forms_exposed", 0),
            webmcp_tools=webmcp_meta.get("tools", []),
            # Robots.txt audit
            robots_blocks_ai_crawlers=bool(robots.get("blocks_ai_crawlers", False)),
            robots_blocked_crawlers=list(robots.get("blocked_crawlers", [])),
            robots_has_robots_txt=bool(robots.get("has_robots_txt", False)),
            robots_crawl_delay=robots.get("crawl_delay"),
            # Schema.org audit
            schema_org_types=list(schema.get("schema_org_types", [])),
            schema_org_has_faq=bool(schema.get("has_faq", False)),
            schema_org_has_organization=bool(schema.get("has_organization", False)),
            schema_org_has_howto=bool(schema.get("has_howto", False)),
        )

        return CapabilityRegistry(
            domain=domain,
            crawl_id=f"c_{uuid.uuid4().hex[:12]}",
            last_updated=datetime.utcnow(),
            metadata=metadata,
            capabilities=capabilities,
            pricing=pricing,
            limitations=limitations,
            integration=integration,
            reliability=reliability,
            ai_metadata=ai_metadata,
        )

    def _build_metadata(self, domain: str, raw: Dict) -> ServiceMetadata:
        return ServiceMetadata(
            name=_str(raw.get("name"), domain),
            domain=domain,
            description=_str(raw.get("description"), "No description available"),
            category=_str(raw.get("category"), "unknown"),
            sub_categories=_list(raw.get("sub_categories")),
            headquarters=_str(raw.get("headquarters")) or None,
            founded_year=_int(raw.get("founded_year")),
            company_size=_str(raw.get("company_size")) or None,
            website_url=_str(raw.get("website_url")) or None,
            logo_url=_str(raw.get("logo_url")) or None,
            support_url=_str(raw.get("support_url")) or None,
            docs_url=_str(raw.get("docs_url")) or None,
        )

    def _build_capabilities(self, raw: Any) -> List[Capability]:
        if not isinstance(raw, list):
            return []

        caps = []
        for item in raw[:8]:  # Cap at 8
            if not isinstance(item, dict):
                continue
            try:
                inputs_raw = _dict(item.get("inputs"))
                outputs_raw = _dict(item.get("outputs"))
                caps.append(Capability(
                    name=_str(item.get("name"), "Unnamed Capability"),
                    description=_str(item.get("description")),
                    category=_str(item.get("category"), "core"),
                    problems_solved=_list(item.get("problems_solved")),
                    inputs=CapabilityInput(
                        required=_list(inputs_raw.get("required")),
                        optional=_list(inputs_raw.get("optional")),
                    ),
                    outputs=CapabilityOutput(
                        success=_list(outputs_raw.get("success")),
                        failure=_list(outputs_raw.get("failure")),
                    ),
                    constraints=_list(item.get("constraints")),
                    use_cases=_list(item.get("use_cases")),
                ))
            except Exception as e:
                logger.warning(f"Skipping malformed capability: {e}")

        return caps

    def _build_pricing(self, raw: Dict) -> Pricing:
        tiers = []
        for t in (raw.get("tiers") or []):
            if not isinstance(t, dict):
                continue
            tiers.append(PricingTier(
                name=_str(t.get("name"), "Unknown Tier"),
                price_per_unit=_float(t.get("price_per_unit")),
                unit=_str(t.get("unit")) or None,
                plus_fixed=_float(t.get("plus_fixed")),
                currency=_str(t.get("currency"), "USD"),
                contact_sales=_bool(t.get("contact_sales")),
                description=_str(t.get("description")) or None,
            ))

        return Pricing(
            model=_str(raw.get("model"), "unknown"),
            has_free_tier=_bool(raw.get("has_free_tier")),
            contact_sales_required=_bool(raw.get("contact_sales_required")),
            tiers=tiers,
            free_tier_details=_str(raw.get("free_tier_details")) or None,
            pricing_page_url=_str(raw.get("pricing_page_url")) or None,
            pricing_notes=_str(raw.get("pricing_notes")) or None,
        )

    def _build_limitations(self, raw: Dict) -> Limitations:
        rate_limits = []
        for r in (raw.get("rate_limits") or []):
            if not isinstance(r, dict):
                continue
            rate_limits.append(RateLimit(
                scope=_str(r.get("scope"), "API"),
                limit=_int(r.get("limit")),
                window=_str(r.get("window")) or None,
                notes=_str(r.get("notes")) or None,
            ))

        geo_restrictions = []
        for g in (raw.get("geographic_restrictions") or []):
            if not isinstance(g, dict):
                continue
            geo_restrictions.append(GeographicRestriction(
                type=_str(g.get("type"), "availability"),
                regions_available=_list(g.get("regions_available")),
                regions_restricted=_list(g.get("regions_restricted")),
                notes=_str(g.get("notes")) or None,
            ))

        df_raw = _dict(raw.get("data_formats"))
        return Limitations(
            rate_limits=rate_limits,
            geographic_restrictions=geo_restrictions,
            data_formats=DataFormats(
                input=_list(df_raw.get("input")),
                output=_list(df_raw.get("output")),
                encoding=_str(df_raw.get("encoding"), "UTF-8"),
            ),
            sla_uptime_percent=_float(raw.get("sla_uptime_percent")),
            known_constraints=_list(raw.get("known_constraints")),
        )

    def _build_integration(self, raw: Dict) -> Integration:
        sdks = []
        for s in (raw.get("sdks") or []):
            if not isinstance(s, dict):
                continue
            sdks.append(SDK(
                language=_str(s.get("language"), "Unknown"),
                package_name=_str(s.get("package_name")) or None,
                install_command=_str(s.get("install_command")) or None,
                docs_url=_str(s.get("docs_url")) or None,
            ))

        return Integration(
            api_base_url=_str(raw.get("api_base_url")) or None,
            api_version=_str(raw.get("api_version")) or None,
            auth_methods=_list(raw.get("auth_methods")),
            auth_notes=_str(raw.get("auth_notes")) or None,
            sdks=sdks,
            webhooks_supported=_bool(raw.get("webhooks_supported")),
            webhook_docs_url=_str(raw.get("webhook_docs_url")) or None,
            openapi_url=_str(raw.get("openapi_url")) or None,
        )

    def _build_reliability(self, raw: Dict) -> Reliability:
        return Reliability(
            status_page_url=_str(raw.get("status_page_url")) or None,
            current_status="unknown",  # Populated by live status check at query time
            current_status_checked_at=None,
        )


def calculate_confidence(raw: Dict) -> float:
    """
    Score extraction completeness (0.0–1.0).
    Exposed as module-level function for use in ingest pipeline.
    """
    meta = _dict(raw.get("metadata"))
    caps = raw.get("capabilities") or []
    pricing = _dict(raw.get("pricing"))

    scores = [
        1.0 if meta.get("name") else 0.0,
        1.0 if meta.get("description") else 0.0,
        min(len(caps) / 3.0, 1.0),                    # Full credit at 3+ capabilities
        1.0 if pricing.get("model", "unknown") != "unknown" else 0.2,
        0.8 if meta.get("api_base_url") else 0.4,     # Partial — many SaaS don't expose
        1.0 if caps else 0.0,                          # Must have at least one capability
    ]
    return round(sum(scores) / len(scores), 3)
