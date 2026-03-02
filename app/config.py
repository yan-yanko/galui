import pathlib
from pydantic_settings import BaseSettings

# Resolve the project root using __file__ — works even in non-ASCII directories on Windows
_PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent
_ENV_FILE = _PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    # --- API Auth ---
    registry_api_key: str = ""           # X-API-Key required if set; disabled if empty

    # --- Anthropic ---
    anthropic_api_key: str = ""          # Required for comprehension pipeline

    # --- Firecrawl ---
    firecrawl_api_key: str = ""          # Optional but recommended — handles JS-heavy sites

    # --- Storage ---
    database_url: str = "data/registry.db"

    # --- Service Identity ---
    base_api_url: str = "http://localhost:8000"

    # --- Crawl Settings ---
    max_pages_per_crawl: int = 8
    crawl_timeout_seconds: int = 10
    playwright_enabled: bool = False

    # --- LLM Models ---
    fast_model: str = "claude-haiku-4-5-20251001"
    deep_model: str = "claude-sonnet-4-5-20250929"

    # --- Stripe (legacy — not used for new signups) ---
    stripe_secret_key: str = ""            # sk_live_... or sk_test_...
    stripe_webhook_secret: str = ""        # whsec_...
    stripe_price_starter_monthly: str = "" # price_... Starter $9/mo
    stripe_price_starter_yearly: str = ""  # price_... Starter $79/yr
    stripe_price_pro_monthly: str = ""     # price_... Pro $29/mo
    stripe_price_pro_yearly: str = ""      # price_... Pro $249/yr

    # --- Lemon Squeezy ---
    ls_webhook_secret: str = ""              # from LS dashboard → Webhooks → secret
    ls_variant_starter: str = ""             # variant ID for Starter $9/mo
    ls_variant_starter_annual: str = ""      # variant ID for Starter $90/yr
    ls_variant_pro: str = ""                 # variant ID for Pro $29/mo
    ls_variant_pro_annual: str = ""          # variant ID for Pro $290/yr

    # --- Email (Resend) ---
    resend_api_key: str = ""               # re_...
    email_from: str = "hello@galuli.io"

    # --- App ---
    app_url: str = "https://galuli.io"     # used in email links + Stripe redirect

    # --- Refresh ---
    auto_refresh_interval_hours: int = 168  # 7 days

    # --- Citation Tracker ---
    perplexity_api_key: str = ""           # Required for Perplexity citation checks (sonar model)
    openai_api_key: str = ""               # Optional — enables ChatGPT (gpt-4o-search-preview) checks
    citation_max_queries: int = 5          # Max tracked queries per domain (cost control)

    model_config = {
        "env_file": str(_ENV_FILE),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
        "env_ignore_empty": True,  # Fall through to .env file if env var is empty string
    }


settings = Settings()
