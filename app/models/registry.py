from __future__ import annotations
from typing import Optional, List, Any
from pydantic import BaseModel, Field
from datetime import datetime
import uuid


class CapabilityInput(BaseModel):
    required: List[str] = Field(default_factory=list)
    optional: List[str] = Field(default_factory=list)


class CapabilityOutput(BaseModel):
    success: List[str] = Field(default_factory=list)
    failure: List[str] = Field(default_factory=list)


class Capability(BaseModel):
    id: str = Field(default_factory=lambda: f"cap_{uuid.uuid4().hex[:8]}")
    name: str
    description: str
    category: str = "core"
    problems_solved: List[str] = Field(default_factory=list)
    inputs: CapabilityInput = Field(default_factory=CapabilityInput)
    outputs: CapabilityOutput = Field(default_factory=CapabilityOutput)
    constraints: List[str] = Field(default_factory=list)
    use_cases: List[str] = Field(default_factory=list)


class PricingTier(BaseModel):
    name: str
    price_per_unit: Optional[float] = None
    unit: Optional[str] = None
    plus_fixed: Optional[float] = None
    currency: str = "USD"
    contact_sales: bool = False
    description: Optional[str] = None


class Pricing(BaseModel):
    model: str = "unknown"
    # model options: per_transaction | subscription | usage_based | freemium | free | contact_sales
    has_free_tier: bool = False
    contact_sales_required: bool = False
    tiers: List[PricingTier] = Field(default_factory=list)
    free_tier_details: Optional[str] = None
    pricing_page_url: Optional[str] = None
    pricing_notes: Optional[str] = None


class RateLimit(BaseModel):
    scope: str
    limit: Optional[int] = None
    window: Optional[str] = None
    notes: Optional[str] = None


class GeographicRestriction(BaseModel):
    type: str = "availability"
    regions_available: List[str] = Field(default_factory=list)
    regions_restricted: List[str] = Field(default_factory=list)
    notes: Optional[str] = None


class DataFormats(BaseModel):
    input: List[str] = Field(default_factory=list)
    output: List[str] = Field(default_factory=list)
    encoding: str = "UTF-8"


class Limitations(BaseModel):
    rate_limits: List[RateLimit] = Field(default_factory=list)
    geographic_restrictions: List[GeographicRestriction] = Field(default_factory=list)
    data_formats: DataFormats = Field(default_factory=DataFormats)
    sla_uptime_percent: Optional[float] = None
    known_constraints: List[str] = Field(default_factory=list)


class SDK(BaseModel):
    language: str
    package_name: Optional[str] = None
    install_command: Optional[str] = None
    docs_url: Optional[str] = None


class Integration(BaseModel):
    api_base_url: Optional[str] = None
    api_version: Optional[str] = None
    auth_methods: List[str] = Field(default_factory=list)
    auth_notes: Optional[str] = None
    sdks: List[SDK] = Field(default_factory=list)
    webhooks_supported: bool = False
    webhook_docs_url: Optional[str] = None
    openapi_url: Optional[str] = None
    postman_collection_url: Optional[str] = None


class Reliability(BaseModel):
    status_page_url: Optional[str] = None
    current_status: str = "unknown"
    # status options: operational | degraded | outage | unreachable | unknown
    current_status_checked_at: Optional[datetime] = None
    sla_url: Optional[str] = None
    incident_history_url: Optional[str] = None
    uptime_30d_percent: Optional[float] = None


class ServiceMetadata(BaseModel):
    name: str
    domain: str
    description: str
    category: str = "unknown"
    sub_categories: List[str] = Field(default_factory=list)
    headquarters: Optional[str] = None
    founded_year: Optional[int] = None
    company_size: Optional[str] = None
    website_url: Optional[str] = None
    logo_url: Optional[str] = None
    support_url: Optional[str] = None
    docs_url: Optional[str] = None


class AIMetadata(BaseModel):
    llms_txt_url: Optional[str] = None
    ai_plugin_url: Optional[str] = None
    registry_url: Optional[str] = None
    confidence_score: float = 0.0
    extraction_model: str = "claude-sonnet-4-5"
    pages_crawled: int = 0
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    # WebMCP
    webmcp_enabled: bool = False
    webmcp_tools_count: int = 0
    forms_exposed: int = 0
    webmcp_tools: List[Any] = Field(default_factory=list)
    # Source
    source: str = "crawl"   # "crawl" | "push" (snippet-driven)
    # Robots.txt audit
    robots_blocks_ai_crawlers: bool = False
    robots_blocked_crawlers: List[str] = Field(default_factory=list)
    robots_has_robots_txt: bool = False
    robots_crawl_delay: Optional[int] = None
    # Schema.org audit
    schema_org_types: List[str] = Field(default_factory=list)
    schema_org_has_faq: bool = False
    schema_org_has_organization: bool = False
    schema_org_has_howto: bool = False


class CapabilityRegistry(BaseModel):
    schema_version: str = "1.0"
    domain: str
    crawl_id: str = Field(default_factory=lambda: f"c_{uuid.uuid4().hex}")
    last_updated: datetime = Field(default_factory=datetime.utcnow)

    metadata: ServiceMetadata
    capabilities: List[Capability] = Field(default_factory=list)
    pricing: Pricing = Field(default_factory=Pricing)
    limitations: Limitations = Field(default_factory=Limitations)
    integration: Integration = Field(default_factory=Integration)
    reliability: Reliability = Field(default_factory=Reliability)
    ai_metadata: AIMetadata = Field(default_factory=AIMetadata)

    model_config = {"json_encoders": {datetime: lambda v: v.isoformat()}}
