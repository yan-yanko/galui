# Galui — MASTER PLAN
_Last updated: 2026-02-23_

---

## WHAT THIS PRODUCT IS

**Galui** = "Accessible for AI readability"

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
- Free scan: no account required — gives full AI Readiness Score
- Paid from $49/year — snippet access, live analytics, continuous re-indexing
- Target: Every website owner (not just ecom — Shopify etc. will handle that natively)

---

## THE 6 MOATS (all built)

1. **Learning network effect** — LLM pipeline trained on thousands of sites → industry-specific templates improve over time.
2. **Real usage signal** — JS snippet logs every AI agent request (which agent, which page). AI traffic analytics dashboard live.
3. **AI Readiness Score + Badge** — 0-100 score, grade A+→F, embeddable SVG badge, improvement suggestions.
4. **Two-sided network** — Agent builders query our registry. Site owners install us to be visible to agents.
5. **Vertical depth** — Industry-specific tool schemas (next: SaaS, legal, healthcare).
6. **WebMCP auto-implementation** — Chrome shipped WebMCP Feb 2026 (early preview). We auto-implement it for any site via snippet. First mover.

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
    └── <script src="https://galui-production.up.railway.app/galui.js?key=cr_live_..." async>
            ├── Detects 30+ AI crawler User-Agents → sends analytics beacon
            ├── Extracts page structure (headings, CTAs, forms, schema.org, OG, images)
            ├── Registers WebMCP tools via navigator.modelContext (provideContext + registerTool)
            ├── Injects <link rel="llms"> and <link rel="ai-plugin"> in <head>
            ├── Auto-injects Organization/WebSite/WebPage JSON-LD schema if none exists
            ├── Content-hash gating — only pushes data when content changes
            └── POSTs structured page data to /api/v1/ingest/push

[Backend — FastAPI on Railway]
    ├── GET  /galui.js                          ← serves the snippet (v3.0.0)
    ├── POST /api/v1/ingest/push                ← snippet-driven ingest pipeline
    ├── POST /api/v1/ingest                     ← manual crawl (landing page scan)
    ├── GET  /api/v1/jobs/{job_id}              ← poll job status
    ├── POST /api/v1/analytics/event            ← logs AI agent hits
    ├── GET  /api/v1/analytics/{domain}         ← customer analytics summary
    ├── GET  /api/v1/analytics/{domain}/agents  ← agent breakdown
    ├── GET  /api/v1/analytics/{domain}/pages   ← page breakdown
    ├── GET  /api/v1/score/{domain}             ← AI Readiness Score (0-100)
    ├── GET  /api/v1/score/{domain}/badge       ← embeddable SVG badge
    ├── GET  /api/v1/score/{domain}/suggestions ← improvement suggestions
    ├── GET  /registry/{domain}                 ← full JSON registry
    ├── GET  /registry/{domain}/llms.txt        ← llms.txt standard
    ├── GET  /registry/{domain}/ai-plugin.json  ← OpenAI plugin manifest
    ├── GET  /registry/{domain}/status          ← live status check
    └── Full tenant + admin endpoints

[Landing page — React SPA at /]
    ├── Hero with two-column layout + HeroAnimation card
    ├── Free scan form → ScanAnimation (terminal-style) → ResultsPage
    ├── ResultsPage — blurred overlay + registration form → unlocked report
    ├── How it works (3 steps)
    ├── Features grid (6 cards — AI Score, Analytics, WebMCP, llms.txt, Plugin Manifest, Auto-refresh)
    ├── What is AI Readability (dark section — llms.txt, WebMCP, Plugin Manifest, Score glossary)
    ├── Score scale (A+ → F with horizontal bars)
    ├── FAQ (7 questions accordion)
    └── Bottom CTA + footer

[Customer dashboard — React/Vite at /dashboard/]
    ├── Overview    — stats, quick start, snippet tag
    ├── Analytics   — AI agent traffic, agent breakdown, page hits, daily trend
    ├── AI Score    — score ring, dimension breakdown, suggestions, badge embed
    ├── Snippet     — install guide, what happens auto, generated outputs, verify
    ├── Registries  — domain list + detail tabs (overview/capabilities/pricing/integration/llms.txt/JSON)
    ├── Ingest      — manual crawl with live progress + results
    ├── Tenants     — create/manage tenant API keys
    └── Settings    — API URL + key config, connection test
```

---

## PRODUCTION STATE ✅ FULLY LIVE

### URLs
| What | URL |
|------|-----|
| API (Railway) | `https://galui-production.up.railway.app` |
| Dashboard (Lovable) | `https://galui.lovable.app` |
| Health check | `https://galui-production.up.railway.app/health` |
| API docs | `https://galui-production.up.railway.app/docs` |
| GitHub repo | `https://github.com/yan-yanko/galui` |

### Dashboard login
Go to `https://galui.lovable.app` → Settings tab → set:
- **API URL:** `https://galui-production.up.railway.app`
- **API Key:** `kotleryan1984`

### Credentials (keep safe — never commit)
| Key | Value | Where used |
|-----|-------|-----------|
| `REGISTRY_API_KEY` | `kotleryan1984` | Admin master key — X-API-Key header |
| Your tenant key | `cr_live_Jrdgrz8mSPKxQsoIhrrpaQNWr72zzOL1PrRS4Fg3` | Snippet + dashboard |
| Anthropic API key | in `.env` file locally | Set in Railway variables |
| Firecrawl API key | in `.env` file locally | Set in Railway variables |

### Railway environment variables (already set)
```
ANTHROPIC_API_KEY=sk-ant-api03-...
FIRECRAWL_API_KEY=fc-d777...
DATABASE_URL=data/registry.db
BASE_API_URL=https://galui-production.up.railway.app
MAX_PAGES_PER_CRAWL=20
FAST_MODEL=claude-haiku-4-5-20251001
DEEP_MODEL=claude-sonnet-4-5-20250929
REGISTRY_API_KEY=kotleryan1984
```

### Railway Volume (already set)
- Volume mounted at `/app/data` — SQLite DB persists across deploys ✅

### Pipeline test results (stripe.com, 2026-02-22) — all passing
| Endpoint | Status | Result |
|----------|--------|--------|
| POST /api/v1/ingest | ✅ | 10 pages, 76 seconds, confidence 0.767 |
| GET /registry/{domain} | ✅ | 8 capabilities, fintech, full schema |
| GET /registry/{domain}/llms.txt | ✅ Fixed | Was 500 (strftime bug) — fixed in commit c239b0f |
| GET /api/v1/score/{domain} | ✅ | Grade C, 66/100 for stripe.com |
| GET /api/v1/score/{domain}/badge | ✅ | SVG renders correctly |
| GET /registry/{domain}/ai-plugin.json | ✅ | Valid OpenAI plugin manifest |
| GET /registry/{domain}/status | ✅ | Live HTTP check, "operational" |
| Dashboard live | ✅ | https://galui.lovable.app rendering correctly |

---

## CODEBASE MAP

**Local path:** `C:\Users\yanko\OneDrive\שולחן העבודה\galui\`

### Backend (Python / FastAPI)
| File | What it does |
|------|-------------|
| `app/api/main.py` | FastAPI app — all routes wired, serves /galui.js + SPA |
| `app/api/auth.py` | Two-mode auth: master key + tenant keys |
| `app/api/routes/ingest.py` | Manual crawl endpoint + job polling |
| `app/api/routes/push.py` | Snippet push + Score + Badge SVG endpoints |
| `app/api/routes/analytics.py` | AI traffic analytics routes |
| `app/api/routes/registry.py` | JSON / llms.txt / ai-plugin.json / status |
| `app/api/routes/admin.py` | Admin: refresh, delete, stats |
| `app/api/routes/tenants.py` | Tenant lifecycle CRUD |
| `app/services/comprehension.py` | 4-pass LLM pipeline (Haiku fast + Sonnet deep) |
| `app/services/crawler.py` | Firecrawl primary + httpx/BS4 fallback |
| `app/services/registry_builder.py` | LLM output → CapabilityRegistry schema |
| `app/services/score.py` | AI Readiness Score (5 dimensions, A+→F, suggestions) |
| `app/services/analytics.py` | Analytics DB — 30+ AI agent patterns, event logging |
| `app/services/storage.py` | SQLite — registries, jobs, page_hashes, analytics, tenants |
| `app/services/tenant.py` | Multi-tenancy, API key generation, usage tracking |
| `app/services/scheduler.py` | Auto-refresh every 7 days |
| `app/models/registry.py` | CapabilityRegistry schema incl. WebMCP fields |
| `app/models/crawl.py` | CrawlResult, PageContent models |
| `app/models/jobs.py` | IngestJob, JobStatus enum |
| `app/config.py` | Settings via pydantic-settings + .env |

### Snippet
| File | What it does |
|------|-------------|
| `static/galui.js` | **v3.0.0** — 783 lines. Detects 30+ AI crawlers, WebMCP registration, discovery link injection, auto JSON-LD, content extraction, analytics beacon, hash-gated push |

### Frontend (React / Vite)
| File | What it does |
|------|-------------|
| `dashboard/src/main.jsx` | Entry point — path routing: `/` → LandingPage, `/dashboard/` → App |
| `dashboard/src/Landing.jsx` | Full marketing landing page + free scan flow + ResultsPage |
| `dashboard/src/App.jsx` | 8-page dashboard app (Overview, Ingest, Score, Analytics, Registries, Snippet, Tenants, Settings) |
| `dashboard/src/api.js` | API client — reads URL+key from localStorage, injects X-API-Key header |

### Config & Deployment
| File | What it does |
|------|-------------|
| `Dockerfile` | Multi-stage: Node 20 builds React → Python 3.11-slim runs FastAPI |
| `railway.toml` | Railway deploy config — health check `/health`, restart on failure |
| `requirements.txt` | Python deps (FastAPI, Anthropic, Firecrawl, APScheduler, etc.) |
| `run.py` | Local dev runner — handles Hebrew path UTF-8 encoding |
| `.env` | Local environment variables — never commit |
| `.env.example` | Template showing all variables with docs |
| `MASTER_PLAN.md` | This file |

---

## GALUI.JS — SNIPPET CAPABILITIES (v3.0.0)

The snippet (~783 lines, ~12KB) runs client-side on every page of a customer's site:

### AI Crawler Detection (30+ patterns)
GPTBot, ChatGPT-User, ClaudeBot, Claude-Web, PerplexityBot, Google-Extended, GoogleOther,
Gemini, Bingbot, BingPreview, DuckAssistBot, YouBot, Cohere-AI, CCBot, Bytespider,
PetalBot, Applebot, Applebot-Extended, Meta-ExternalAgent, Meta-ExternalFetcher,
AI2Bot, Diffbot, Amazonbot, FacebookBot, Timpibot, OAI-SearchBot, iaskspider + more

### Discovery Link Injection (_injectDiscoveryLinks)
- `<link rel="llms">` → `{origin}/llms.txt`
- `<link rel="ai-plugin">` → `{origin}/.well-known/ai-plugin.json`
- `<meta name="robots" content="index, follow">` (if missing)
- `<link rel="canonical">` (if missing)
- `<meta name="galui-verified">` tag

### Auto JSON-LD (_injectSchemaIfMissing)
If no schema.org markup exists, auto-injects:
- `Organization` (name, url, description, logo)
- `WebSite` (with SearchAction)
- `WebPage` (name, description, breadcrumb)

### Content Extraction
- `_extractOpenGraph()` — OG title, description, image, type
- `_extractImages()` — visible images with alt text
- Page type detection (homepage/pricing/docs/blog/contact/product)
- Headings, CTAs, forms, clean body text
- Schema.org detection

### WebMCP Registration
- Uses `navigator.modelContext.provideContext()` batch first
- Falls back to `navigator.modelContext.registerTool()` per-tool
- Registers all forms on the page as named tools
- `readOnlyHint: true` for read-only operations
- `execute()` method (not `handler:`) per W3C spec

### Analytics
- Sends beacon on AI crawler detection via `navigator.sendBeacon`
- `POST /api/v1/analytics/event` with domain, page, user_agent, referer, timestamp

### Push Pipeline
- Content hash gating (SHA256-like, skips unchanged pages)
- `POST /api/v1/ingest/push` with full page data
- Accepts `?push=0` param (analytics-only mode)
- Accepts `?schema=0` param (disable auto JSON-LD)
- Sends `Accept: text/markdown` header (Cloudflare Markdown for Agents compatibility)

### Public API
- `window.galui.refreshPage()` — force re-push current page

---

## LANDING PAGE SECTIONS (in order)

1. **Nav** — Galui logo, Dashboard link, "Get started free" button
2. **Hero** — Two-column grid: left=copy+scan form, right=HeroAnimation card
   - HeroAnimation: floating card showing 3-step process with CSS animations
   - ScanAnimation: terminal-style dark card when scanning (macOS dots, progress bar, steps, log output)
   - ResultsPage: full-screen result with blurred overlay + registration modal
3. **AI agents strip** — "Visible to: ChatGPT, Claude, Perplexity, Gemini, Bing AI, WebMCP Agents"
4. **How it works** — 3 cards (Scan free → Add script tag → Get found by AI)
5. **Features grid** — White background, 6 cards in 3×2 layout, large icons, color accents
   - AI Readiness Score / AI Agent Analytics / WebMCP Auto-Setup
   - llms.txt Generation / AI Plugin Manifest / Smart Auto-refresh
6. **What is AI Readability?** — Dark section, 2-column: explanation + glossary cards (llms.txt, WebMCP, AI Plugin Manifest, AI Readiness Score)
7. **Score scale** — White background, horizontal bar layout, 64px grade badges (A+/B/C/D/F)
   - 5-dimensions callout card at bottom
8. **FAQ** — 7 questions, accordion (useState toggle)
9. **Bottom CTA** — Second scan form
10. **Footer**

---

## DASHBOARD PAGES (8 total)

| Page | Key features |
|------|-------------|
| **Overview** | Stats cards (indexed sites, crawl jobs, AI hits, tenants), empty state with 3 preview cards |
| **Ingest** | URL form, async job polling, results with score breakdown + capabilities |
| **AI Score** | Score ring, 5-dimension breakdown bars, grade badge, improvement suggestions, embeddable badge (preview/HTML/Markdown) |
| **Analytics** | Summary (hits, unique agents, pages), agent breakdown table, top pages, daily trend (7-day bar chart) |
| **Registries** | Domain list + detail tabs: Overview / Capabilities / Pricing / Integration / llms.txt / Raw JSON |
| **Snippet** | Install code block, "what happens automatically" (WebMCP explained), "what gets generated" (5 output URLs), debug mode toggle, verify checklist |
| **Tenants** | CRUD for API keys, plan selection (free/pro/enterprise), usage stats |
| **Settings** | API URL + key override, connection test, full API endpoint reference |

---

## AI READINESS SCORE — 5 DIMENSIONS

| Dimension | Max | What it measures |
|-----------|-----|-----------------|
| `content_coverage` | 25 | How complete and structured the indexed content is |
| `structure_quality` | 20 | Schema.org markup, semantic HTML quality |
| `freshness` | 15 | How recently the site was indexed / content updated |
| `webmcp_compliance` | 20 | Whether WebMCP tools are registered and callable |
| `output_formats` | 20 | Whether llms.txt, ai-plugin.json, badge are all present |

**Grades:** A+ (90–100) · B (70–89) · C (50–69) · D (30–49) · F (0–29)

---

## KNOWN ISSUES / NEXT STEPS

### 🔴 Critical — Nothing blocking right now ✅
All critical issues resolved:
- ✅ SQLite persistence: Railway Volume mounted at `/app/data`
- ✅ llms.txt 500 bug: strftime + sla_uptime_percent fixes committed
- ✅ Dashboard deployed: https://galui.lovable.app
- ✅ Scan → ResultsPage transition: finishScan() helper with .catch() safe defaults
- ✅ WebMCP handler vs execute: galui.js v3.0.0 uses execute() per W3C spec

### 🟡 Important — Do soon
1. **Rate limiting not enforced** — tenant plan limits (free=10/min, pro=60/min) are defined but not checked in middleware
2. **Push pipeline merge logic** — `_merge_registries()` in push.py is basic; needs smarter field-level merging for multi-page sites
3. **Self-serve onboarding** — currently users must manually set API URL in Settings; needs a proper signup → tenant creation flow

### 🟢 Nice to have — Next features
4. **Public domain profile page** — `GET /profile/{domain}` — public HTML with score + badge (for two-sided network moat)
5. **Vertical templates** — industry-specific prompts and WebMCP schemas (SaaS, legal, healthcare)
6. **Email notifications** — tenant welcome email, score change alerts
7. **Stripe billing integration** — self-serve plan upgrade/downgrade
8. **robots.txt hosting** — serve AI-friendly robots.txt from our domain for each tenant

---

## KEY TECHNICAL NOTES

- Windows path has Hebrew chars — always use `pathlib` not `os.path`
- Starlette BaseHTTPMiddleware swallows HTTPException — use JSONResponse for auth errors (already done in auth.py)
- Railway uses dynamic `$PORT` — Dockerfile uses `CMD uvicorn ... --port ${PORT}` ✅
- SQLite db at `data/registry.db` — Railway Volume at `/app/data` keeps it persistent ✅
- Fast model: `claude-haiku-4-5-20251001`, Deep model: `claude-sonnet-4-5-20250929`
- Dashboard reads API URL from localStorage key `galui_api_url` (default: localhost:8000)
- Dashboard reads API key from localStorage key `galui_api_key`
- Lovable.dev dashboard: deployed from GitHub repo `yan-yanko/galui`, branch `main`, root `dashboard/`
- Landing page and dashboard are the same React bundle — routing is path-based in `main.jsx`
- `nul` file in root is a Windows artifact — safe to ignore
- CORS allows: localhost:5173, localhost:3000, https://galui.lovable.app

---

## WORKFLOW — HOW TO DEVELOP

```bash
# 1. Start backend locally
cd "C:\Users\yanko\OneDrive\שולחן העבודה\galui"
python run.py

# 2. Start dashboard locally (separate terminal)
cd dashboard
npm run dev
# Opens at http://localhost:5173

# 3. In dashboard Settings tab:
#    API URL: http://localhost:8000
#    API Key: kotleryan1984

# 4. When ready to deploy:
git add -A
git commit -m "your message"
git push
# Railway auto-deploys backend on push to main
# Lovable auto-deploys dashboard on push to main
```

---

## TO RESUME A SESSION

Say exactly this:

> **"Read MASTER_PLAN.md at C:\Users\yanko\OneDrive\שולחן העבודה\galui\MASTER_PLAN.md and continue from where we left off"**

The plan has everything needed:
1. What the product is and business model
2. All credentials and URLs (API + Dashboard both live)
3. Full architecture diagram
4. Complete codebase map with file descriptions
5. galui.js v3.0.0 capabilities
6. Landing page section order
7. Dashboard pages and features
8. Known issues and next steps
9. How to run locally and deploy
