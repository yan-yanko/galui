import os
import pathlib
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# pathlib resolves path correctly on Windows even with non-ASCII parent dirs
_root = pathlib.Path(__file__).parent.parent.parent
load_dotenv(dotenv_path=_root / ".env", override=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.config import settings
    from app.services.storage import StorageService
    from app.services.tenant import TenantService
    from app.services.analytics import AnalyticsService
    from app.services.scheduler import start_scheduler, stop_scheduler

    logger.info("=" * 55)
    logger.info("  Galui — AI Readability Engine")
    logger.info("=" * 55)
    logger.info(f"  Anthropic:    {'OK' if settings.anthropic_api_key else 'MISSING'}")
    logger.info(f"  Auth:         {'master key' if settings.registry_api_key else 'open (dev)'}")
    logger.info(f"  Database:     {settings.database_url}")
    logger.info(f"  Base URL:     {settings.base_api_url}")
    logger.info(f"  Fast model:   {settings.fast_model}")
    logger.info(f"  Deep model:   {settings.deep_model}")
    logger.info("=" * 55)

    # Init all storage tables
    StorageService()
    TenantService()
    AnalyticsService()

    # Start auto-refresh scheduler
    start_scheduler()

    yield

    stop_scheduler()
    logger.info("Galui shut down")


app = FastAPI(
    title="Galui — AI Readability Engine",
    description=(
        "Drop one script tag. Your site becomes AI-readable.\n\n"
        "Galui automatically translates any website into structured, "
        "machine-readable formats for LLMs and AI agents — with WebMCP "
        "auto-registration, llms.txt generation, AI traffic analytics, "
        "and an AI Readiness Score.\n\n"
        "### Output formats\n"
        "- `GET /registry/{domain}` — Full JSON capability registry\n"
        "- `GET /registry/{domain}/llms.txt` — llms.txt standard\n"
        "- `GET /registry/{domain}/ai-plugin.json` — OpenAI plugin manifest\n"
        "- `GET /registry/{domain}/status` — Live liveness check\n\n"
        "### Snippet endpoints\n"
        "- `POST /api/v1/ingest/push` — Receive page data from galui.js\n"
        "- `GET  /api/v1/score/{domain}` — AI Readiness Score\n"
        "- `GET  /api/v1/score/{domain}/badge` — Embeddable SVG badge\n\n"
        "### Analytics\n"
        "- `GET /api/v1/analytics/{domain}` — AI agent traffic summary\n"
        "- `GET /api/v1/analytics/{domain}/agents` — Agent breakdown\n"
        "- `GET /api/v1/analytics/{domain}/pages` — Per-page breakdown\n"
    ),
    version="2.0.0",
    lifespan=lifespan,
)

from app.api.auth import APIKeyMiddleware
app.add_middleware(APIKeyMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://galui.lovable.app",
        "https://*.lovable.app",
    ],
    allow_origin_regex=r"https://.*\.lovable\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.routes import ingest, registry, admin, tenants, push, analytics

app.include_router(ingest.router,    prefix="/api/v1",             tags=["Ingestion"])
app.include_router(push.router,      prefix="/api/v1",             tags=["Snippet / Push"])
app.include_router(registry.router,  prefix="/registry",           tags=["Registry"])
app.include_router(admin.router,     prefix="/api/v1/admin",       tags=["Admin"])
app.include_router(tenants.router,   prefix="/api/v1/tenants",     tags=["Tenants"])
app.include_router(analytics.router, prefix="/api/v1/analytics",   tags=["Analytics"])


@app.get("/health", tags=["System"])
async def health():
    from app.config import settings
    from app.services.storage import StorageService
    from app.services.analytics import AnalyticsService

    registries = StorageService().list_registries()
    analytics_summary = AnalyticsService().get_all_domains_summary()
    anthropic_ok = bool(os.environ.get("ANTHROPIC_API_KEY") or settings.anthropic_api_key)

    return {
        "status": "ok",
        "service": "galui",
        "version": "2.0.0",
        "anthropic_configured": anthropic_ok,
        "auth_enabled": bool(settings.registry_api_key),
        "registries_indexed": len(registries),
        "domains_with_ai_traffic": len(analytics_summary),
        "database": settings.database_url,
    }


# ── Snippet delivery ───────────────────────────────────────────────────────
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
import pathlib as _pathlib

@app.get("/galui.js", tags=["Snippet"], include_in_schema=False)
async def serve_snippet():
    """Serve the galui.js snippet file."""
    snippet_path = _pathlib.Path(__file__).parent.parent.parent / "static" / "galui.js"
    if not snippet_path.exists():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Snippet not built yet")
    return FileResponse(str(snippet_path), media_type="application/javascript", headers={
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
    })

# ── Dashboard (React SPA) ──────────────────────────────────────────────────
# Served from /dashboard — built by Docker frontend stage
_dashboard_path = _pathlib.Path(__file__).parent.parent.parent / "static" / "dashboard"

if _dashboard_path.exists():
    # Serve the React SPA at both / and /dashboard/
    # The React app itself handles routing between landing and dashboard
    app.mount("/dashboard", StaticFiles(directory=str(_dashboard_path), html=True), name="dashboard")
    logger.info(f"  Dashboard:    /dashboard (React SPA)")
    logger.info(f"  Landing:      / (served from same SPA)")

    @app.get("/", include_in_schema=False)
    async def serve_landing():
        """Serve the React SPA at root — landing page."""
        index_path = _dashboard_path / "index.html"
        return FileResponse(str(index_path), media_type="text/html")
else:
    logger.info("  Dashboard:    not built (run Docker to build)")

    @app.get("/", include_in_schema=False)
    async def serve_landing():
        return {"service": "galui", "version": "2.0.0", "docs": "/docs", "dashboard": "not built"}
