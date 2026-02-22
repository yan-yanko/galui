# Galui — MASTER PLAN
_Last updated: 2026-02-22_

---

## WHAT THIS PRODUCT IS

**Galui** = "Accessibe for AI readability"

A JS snippet (later a plugin) that website owners drop onto any site. It automatically makes that site readable, navigable, and actionable by LLMs and AI agents — with zero configuration required.

The website owner installs one script tag. We handle everything else.

---

## THE PROBLEM WE SOLVE

LLMs (ChatGPT, Claude, Perplexity, AI agents) can't efficiently read websites. They get blocked, get raw HTML noise, or get nothing. As AI replaces Google, websites lose traffic and visibility unless they're "AI-readable."

Website owners don't know how to fix this. We fix it for them automatically.

---

## BUSINESS MODEL

- Charge based on **number of pages × traffic volume** (combination of the two)
- Plans: Free / Pro / Enterprise (already modeled in codebase)
- Target: Every website owner (not just ecom — Shopify etc. will handle that natively)

---

## THE 6 MOATS (all built)

1. **Learning network effect** — LLM pipeline trained on thousands of sites → industry-specific templates improve over time.
2. **Real usage signal** — JS snippet logs every AI agent request (which agent, which page). AI traffic analytics dashboard live.
3. **AI Readiness Score + Badge** — 0-100 score, grade A+→F, embeddable SVG badge, public profile.
4. **Two-sided network** — Agent builders query our registry. Site owners install us to be visible to agents.
5. **Vertical depth** — Industry-specific tool schemas (next: SaaS, legal, healthcare).
6. **WebMCP auto-implementation** — Google shipped WebMCP Feb 2026. We auto-implement it for any site via snippet. First mover.

---

## WHAT WebMCP IS (critical context)

Google's new browser protocol (Feb 2026, early preview, W3C incubation) that lets websites expose structured tools to AI agents directly — no scraping.

- **Declarative API:** HTML attributes on forms (`toolname="buyTicket"`)
- **Imperative API:** `navigator.modelContext.registerTool()` in JS

Our snippet auto-implements WebMCP for any site. Drop one tag → instantly WebMCP compliant.

References:
- https://searchengineland.com/google-releases-preview-of-webmcp-how-ai-agents-interact-with-websites-469024
- https://www.infoworld.com/article/4133366/webmcp-api-extends-web-apps-to-ai-agents.html

---

## ARCHITECTURE

```
[Customer site]
    └── <script src="https://api.galui.com/galui.js?key=cr_live_..." async>
            ├── Detects page type (homepage/pricing/docs/blog/contact/product)
            ├── Extracts headings, CTAs, forms, schema.org, clean text
            ├── Registers WebMCP tools via navigator.modelContext.registerTool()
            ├── Detects AI agent User-Agents → sends analytics event via sendBeacon
            ├── Injects <link rel="llms"> and <link rel="ai-plugin"> in <head>
            └── POSTs structured page data to /api/v1/ingest/push (hash-gated)

[Backend — FastAPI on Railway]
    ├── GET  /galui.js                       ← serves the snippet
    ├── POST /api/v1/ingest/push             ← receives snippet data → LLM pipeline
    ├── POST /api/v1/analytics/event         ← logs AI agent hits
    ├── GET  /api/v1/analytics/{domain}      ← customer analytics summary
    ├── GET  /api/v1/analytics/{domain}/agents ← agent breakdown
    ├── GET  /api/v1/analytics/{domain}/pages  ← page breakdown
    ├── GET  /api/v1/score/{domain}          ← AI Readiness Score (0-100)
    ├── GET  /api/v1/score/{domain}/badge    ← embeddable SVG badge
    ├── GET  /api/v1/score/{domain}/suggestions ← improvement suggestions
    ├── GET  /registry/{domain}              ← full JSON registry
    ├── GET  /registry/{domain}/llms.txt     ← llms.txt standard
    ├── GET  /registry/{domain}/ai-plugin.json ← OpenAI plugin manifest
    ├── GET  /registry/{domain}/status       ← live status check
    ├── POST /api/v1/ingest                  ← manual crawl (also works)
    └── Full tenant + admin endpoints

[Customer dashboard — React/Vite]
    ├── Overview    — stats, quick start, snippet tag
    ├── Analytics   — AI agent traffic, agent breakdown, page hits, daily trend
    ├── AI Score    — score ring, dimension breakdown, suggestions, badge embed
    ├── Snippet     — install guide, debug mode, verify checklist
    ├── Registries  — domain list + detail (capabilities, pricing, integration, llms.txt, json)
    ├── Ingest      — manual crawl with live progress
    ├── Tenants     — create/manage tenant API keys
    └── Settings    — API URL + key config
```

---

## CODEBASE MAP

**Path:** `C:\Users\yanko\OneDrive\שולחן העבודה\galui\`

| File | Status | What it does |
|------|--------|-------------|
| `static/galui.js` | ✅ NEW | The JS snippet — full pipeline |
| `app/api/main.py` | ✅ UPDATED | Rewired v2.0, serves /galui.js |
| `app/api/routes/push.py` | ✅ NEW | Push ingest + score + badge endpoints |
| `app/api/routes/analytics.py` | ✅ NEW | Analytics routes |
| `app/api/routes/ingest.py` | ✅ EXISTING | Manual crawl (unchanged) |
| `app/api/routes/registry.py` | ✅ EXISTING | Registry output formats (unchanged) |
| `app/api/routes/admin.py` | ✅ EXISTING | Admin ops (unchanged) |
| `app/api/routes/tenants.py` | ✅ EXISTING | Tenant management (unchanged) |
| `app/services/analytics.py` | ✅ NEW | Analytics DB, 20 AI agent patterns |
| `app/services/score.py` | ✅ NEW | AI Readiness Score (5 dimensions) |
| `app/services/comprehension.py` | ✅ EXISTING | 4-pass LLM pipeline (unchanged) |
| `app/services/crawler.py` | ✅ EXISTING | Firecrawl + httpx fallback |
| `app/services/registry_builder.py` | ✅ UPDATED | Added webmcp_meta param |
| `app/services/storage.py` | ✅ UPDATED | Added page_hashes table |
| `app/services/tenant.py` | ✅ EXISTING | Multi-tenancy (unchanged) |
| `app/services/scheduler.py` | ✅ EXISTING | Auto-refresh (unchanged) |
| `app/models/registry.py` | ✅ UPDATED | AIMetadata has WebMCP fields |
| `app/models/crawl.py` | ✅ EXISTING | CrawlResult model (unchanged) |
| `app/models/jobs.py` | ✅ EXISTING | Job tracking (unchanged) |
| `app/config.py` | ✅ EXISTING | Settings (unchanged) |
| `app/api/auth.py` | ✅ EXISTING | Auth middleware (unchanged) |
| `dashboard/src/App.jsx` | ✅ REBUILT | 8-page customer dashboard |
| `dashboard/src/api.js` | ✅ UPDATED | All new endpoints wired |

---

## WHAT'S NEXT (next session starts here)

### Priority 1 — Test end-to-end
1. Start server: `python run.py`
2. Create a tenant key via POST /api/v1/tenants
3. Install snippet on a test HTML page (or use curl to simulate push)
4. Verify /api/v1/score/{domain} returns data
5. Verify /api/v1/score/{domain}/badge returns SVG
6. Verify /registry/{domain}/llms.txt returns text

### Priority 2 — Deploy to Railway
1. Set env vars: `ANTHROPIC_API_KEY`, `REGISTRY_API_KEY`, `BASE_API_URL`, optionally `FIRECRAWL_API_KEY`
2. Push to GitHub → Railway auto-deploys
3. Test /health on live URL

### Priority 3 — Rate limiting enforcement
- Tenant plan limits are defined (free=10/min, pro=60/min, enterprise=300/min) but NOT enforced in middleware
- Add rate limit check in auth.py using a simple in-memory counter (or Redis for scale)

### Priority 4 — Public domain profile page
- `GET /profile/{domain}` — public-facing HTML page with score, badge, and registry summary
- Used for the two-sided network moat: agent builders land here

### Priority 5 — Vertical templates
- Industry-specific extraction prompts and WebMCP tool schemas
- Start with SaaS, then legal, then healthcare

---

## KEY TECHNICAL NOTES

- Windows path has Hebrew chars — use pathlib not os.path
- Starlette BaseHTTPMiddleware swallows HTTPException — use JSONResponse for auth errors (already done)
- Railway uses dynamic $PORT — Dockerfile must use `CMD uvicorn ... --port ${PORT}`
- SQLite db at `data/registry.db`
- Fast model: `claude-haiku-4-5-20251001`, Deep model: `claude-sonnet-4-5-20250929`
- All new routes use `api.base()` from localStorage — no hardcoded localhost in dashboard

---

## TO RESUME A SESSION

1. Read this file top to bottom
2. Find "WHAT'S NEXT" section — first uncompleted item is where to start
3. Check the relevant source files
4. Continue from there
