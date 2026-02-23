# Galui — MASTER PLAN
_Last updated: 2026-02-23_

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
3. **AI Readiness Score + Badge** — 0-100 score, grade A+→F, embeddable SVG badge, improvement suggestions.
4. **Two-sided network** — Agent builders query our registry. Site owners install us to be visible to agents.
5. **Vertical depth** — Industry-specific tool schemas (next: SaaS, legal, healthcare).
6. **WebMCP auto-implementation** — Google shipped WebMCP Feb 2026 (Chrome 146 Canary). We auto-implement it for any site via snippet. First mover.

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
            ├── Detects page type (homepage/pricing/docs/blog/contact/product)
            ├── Extracts headings, CTAs, forms, schema.org, clean text
            ├── Registers WebMCP tools via navigator.modelContext.registerTool()
            ├── Detects AI agent User-Agents → sends analytics event via sendBeacon
            ├── Injects <link rel="llms"> and <link rel="ai-plugin"> in <head>
            └── POSTs structured page data to /api/v1/ingest/push (hash-gated)

[Backend — FastAPI on Railway]
    ├── GET  /galui.js                          ← serves the snippet
    ├── POST /api/v1/ingest/push                ← snippet-driven ingest pipeline
    ├── POST /api/v1/ingest                     ← manual crawl (also works)
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

[Customer dashboard — React/Vite on Lovable.dev]
    ├── Overview    — stats, quick start, snippet tag
    ├── Analytics   — AI agent traffic, agent breakdown, page hits, daily trend
    ├── AI Score    — score ring, dimension breakdown, suggestions, badge embed
    ├── Snippet     — install guide, debug mode, verify checklist
    ├── Registries  — domain list + detail tabs
    ├── Ingest      — manual crawl with live progress
    ├── Tenants     — create/manage tenant API keys
    └── Settings    — API URL + key config
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

| File | What it does |
|------|-------------|
| `static/galui.js` | JS snippet — page analysis, WebMCP, AI detection, beacon, link injection |
| `app/api/main.py` | FastAPI app v2.0 — all routes wired, serves /galui.js |
| `app/api/auth.py` | Two-mode auth: master key + tenant keys |
| `app/api/routes/push.py` | Push ingest + Score + Badge SVG endpoints |
| `app/api/routes/analytics.py` | AI traffic analytics routes |
| `app/api/routes/ingest.py` | Manual crawl endpoint |
| `app/api/routes/registry.py` | JSON / llms.txt / ai-plugin.json / status |
| `app/api/routes/admin.py` | Admin: refresh, delete, stats |
| `app/api/routes/tenants.py` | Tenant lifecycle CRUD |
| `app/services/analytics.py` | Analytics DB — 20 AI agent patterns, event logging |
| `app/services/score.py` | AI Readiness Score (5 dimensions, suggestions) |
| `app/services/comprehension.py` | 4-pass LLM pipeline (Haiku + Sonnet) |
| `app/services/crawler.py` | Firecrawl + httpx fallback crawler |
| `app/services/registry_builder.py` | LLM output → CapabilityRegistry schema |
| `app/services/storage.py` | SQLite storage + page_hashes table |
| `app/services/tenant.py` | Multi-tenancy, API key generation, usage tracking |
| `app/services/scheduler.py` | Auto-refresh every 7 days |
| `app/models/registry.py` | Full data schema incl. WebMCP fields |
| `app/models/crawl.py` | CrawlResult model |
| `app/models/jobs.py` | Job tracking model |
| `app/config.py` | Settings via pydantic-settings + .env |
| `dashboard/src/App.jsx` | 8-page React dashboard (deployed on Lovable.dev) |
| `dashboard/src/api.js` | API client (reads URL+key from localStorage) |
| `railway.toml` | Railway deploy config |
| `Dockerfile` | Python 3.11-slim, uvicorn |

---

## KNOWN ISSUES / NEXT STEPS

### 🔴 Critical — Nothing blocking right now ✅
All critical issues resolved:
- ✅ SQLite persistence: Railway Volume mounted at `/app/data`
- ✅ llms.txt 500 bug: strftime + sla_uptime_percent fixes committed
- ✅ Dashboard deployed: https://galui.lovable.app

### 🟡 Important — Do soon
1. **Rate limiting not enforced** — tenant plan limits (free=10/min, pro=60/min) are defined but not checked in middleware
2. **Push pipeline merge logic** — `_merge_registries()` in push.py is basic; needs smarter field-level merging for multi-page sites
3. **Dashboard CORS** — if Lovable dashboard calls fail due to CORS, add `https://galui.lovable.app` to FastAPI CORS allowed origins in main.py

### 🟢 Nice to have — Next features
4. **Public domain profile page** — `GET /profile/{domain}` — public HTML with score + badge (for two-sided network moat)
5. **Vertical templates** — industry-specific prompts and WebMCP schemas (SaaS, legal, healthcare)
6. **Rate limiting** — enforce in auth middleware using in-memory counter or Redis
7. **Email notifications** — tenant welcome email, score change alerts
8. **Onboarding flow** — self-serve signup → auto-create tenant → show snippet tag

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
- `nul` file in root is a Windows artifact — safe to ignore

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
1. What the product is
2. All credentials and URLs (API + Dashboard both live)
3. Current codebase state
4. Exactly what's next (rate limiting, public profile page, verticals)
5. How to run it locally and deploy
