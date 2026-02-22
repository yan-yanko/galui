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
    max_pages_per_crawl: int = 20
    crawl_timeout_seconds: int = 10
    playwright_enabled: bool = False

    # --- LLM Models ---
    fast_model: str = "claude-haiku-4-5-20251001"
    deep_model: str = "claude-sonnet-4-5-20250929"

    # --- Refresh ---
    auto_refresh_interval_hours: int = 168  # 7 days

    model_config = {
        "env_file": str(_ENV_FILE),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
        "env_ignore_empty": True,  # Fall through to .env file if env var is empty string
    }


settings = Settings()
