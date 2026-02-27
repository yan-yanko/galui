# Galuli — Session State & Continuation Guide
> Last updated: 2025-02 (after rename + GEO launch commit)
> Read this at the start of every new Claude session.

---

## 1. What This Project Is

**Galuli** is a SaaS platform that makes websites visible to AI systems (ChatGPT, Claude, Perplexity, Gemini, Grok, Llama).
One script tag → AI Readiness Score + GEO Score + AI agent analytics + llms.txt + WebMCP auto-setup.

**Core value prop:** Like SEMrush/Ahrefs but for AI visibility instead of Google search rankings.

---

## 2. Repository & Infrastructure

| Thing | Value |
|---|---|
| GitHub repo | `https://github.com/yan-yanko/galuli` |
| Local folder | `C:\Users\yanko\OneDrive\שולחן העבודה\galui` (folder not yet renamed, git remote is correct) |
| Hosting | Railway (single service, auto-deploys on `git push`) |
| Deploy trigger | `git push` → Railway picks up → builds Dockerfile → live |
| Health endpoint | `GET /health` |
| Python version | 3.11.9 |

**Git remote:** `origin → https://github.com/yan-yanko/galuli.git`

**Latest commit:** `2fe57f0 — feat: rename Galui → Galuli, add GEO scoring engine + GEO dashboard tab`

---

## 3. Architecture — How Everything Fits Together

```
github.com/yan-yanko/galuli
│
├── Dockerfile                  ← Multi-stage build
│   ├── Stage 1: node:20 → npm run build → /dashboard/dist
│   └── Stage 2: python:3.11 → FastAPI → serves everything
│
├── app/
│   ├── api/
│   │   ├── main.py             ← FastAPI app, serves /galuli.js, /galui.js (301), /health
│   │   ├── auth.py             ← API key middleware (X-API-Key header)
│   │   └── routes/
│   │       ├── push.py         ← POST /api/v1/ingest, GET /api/v1/score/{domain},
│   │       │                      GET /api/v1/geo/{domain}  ← NEW
│   │       ├── registry.py     ← GET /registry/{domain}, /llms.txt, /ai-plugin.json
│   │       ├── analytics.py    ← AI agent visit tracking
│   │       ├── tenants.py      ← API key management
│   │       ├── ingest.py       ← Job polling
│   │       └── admin.py        ← Admin routes
│   └── services/
│       ├── geo.py              ← NEW: 6-LLM GEO scoring engine (0-100)
│       ├── score.py            ← AI Readiness Score (5 dimensions, 0-100)
│       ├── comprehension.py    ← 4-pass AI pipeline (Anthropic Claude)
│       ├── crawler.py          ← Site crawler
│       ├── storage.py          ← SQLite via data/ directory
│       ├── registry_builder.py ← Builds structured registry from crawl
│       ├── analytics.py        ← Analytics aggregation
│       ├── scheduler.py        ← Auto-refresh scheduler
│       └── tenant.py           ← Tenant/billing logic
│
├── static/
│   ├── galuli.js               ← PRIMARY snippet v3.1.0 (window.galuli)
│   └── galui.js                ← LEGACY (still works, /galui.js 301→/galuli.js)
│
├── dashboard/
│   └── src/
│       ├── main.jsx            ← Entry: renders LandingPage or App based on path
│       ├── Landing.jsx         ← Public landing page (/)
│       ├── App.jsx             ← Dashboard SPA (/dashboard/)
│       ├── api.js              ← All API calls, localStorage keys (galuli_*)
│       ├── App.css             ← Dashboard styles
│       └── index.css           ← Global CSS variables (light/dark themes)
│
├── railway.toml                ← builder=DOCKERFILE, healthcheck=/health
├── requirements.txt            ← Python deps
└── run.py                      ← Local dev entry point
```

**How frontend is served:** FastAPI serves the built React SPA from `static/dashboard/`.
Same Railway process = same domain = no CORS issues. All API calls use relative URLs.

---

## 4. Key API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | Public | Health check, returns version + status |
| GET | `/galuli.js` | Public | Primary JS snippet (cache 300s) |
| GET | `/galui.js` | Public | 301 redirect → /galuli.js (backward compat) |
| GET | `/galuli.js/version` | Public | Returns `{"version":"3.1.0"}` |
| POST | `/api/v1/ingest` | API key | Start crawl + AI pipeline for a URL |
| GET | `/api/v1/jobs/{job_id}` | API key | Poll job status |
| GET | `/api/v1/score/{domain}` | API key | AI Readiness Score (0-100, 5 dims) |
| GET | `/api/v1/geo/{domain}` | API key | GEO Score (0-100, 6 LLMs) ← NEW |
| GET | `/registry/{domain}` | API key | Full structured registry JSON |
| GET | `/registry/{domain}/llms.txt` | Public | llms.txt for domain |
| GET | `/api/v1/analytics/{domain}` | API key | AI traffic summary |
| POST | `/api/v1/tenants` | Public | Create API key (free signup) |
| GET | `/api/v1/tenants/me` | API key | Current tenant info |

---

## 5. Dashboard Pages & Navigation

Nav order: **Overview → AI Score → GEO → Analytics → Snippet → Settings**

| Page ID | Component | What it does |
|---|---|---|
| `overview` | `OverviewPage` | Quick scan form, sites list, stats |
| `score` | `ScorePage` | AI Readiness Score with 5-dimension breakdown, badge generator |
| `geo` | `GeoPage` | GEO Score — 6 LLM cards (ChatGPT/Perplexity/Claude/Gemini/Grok/Llama) |
| `analytics` | `AnalyticsPage` | AI agent traffic, agent breakdown, page breakdown, daily trend |
| `snippet` | `SnippetPage` | API key creation, install code, domain list |
| `settings` | `SettingsPage` | Profile & Billing (plan card, usage bar, billing placeholder, API key, Advanced) |
| `registries` | `RegistriesPage` | Hidden — raw registry explorer (overview/capabilities/pricing/integration/llms.txt/JSON tabs) |
| `tenants` | `TenantsPage` | Hidden — admin tenant management |
| `ingest` | `IngestPage` | Hidden — manual ingest with progress pipeline UI |

---

## 6. localStorage Keys (all prefixed `galuli_`)

| Key | Value |
|---|---|
| `galuli_api_key` | User's API key |
| `galuli_api_url` | Custom API URL override (Advanced settings) |
| `galuli_theme` | `'light'` or `'dark'` (default: `'light'`) |
| `galuli_user` | JSON `{name, email, registered_at}` — set after landing page registration |

**Migration:** `api.js` silently migrates old `galui_*` keys to `galuli_*` on first load.

---

## 7. GEO Scoring Engine (`app/services/geo.py`)

6 dimensions × 20 pts each → total normalized 0–100.

| LLM | Key signals scored |
|---|---|
| ChatGPT | Content density, use_cases count, pricing numbers present, docs_url, api_base_url |
| Perplexity | Freshness (age_days ≤ 7), authority URLs, pages_crawled, pricing_page_url |
| Claude | problems_solved count, category clarity, constraints documented, sub_categories, confidence |
| Gemini | Schema.org proxy (webmcp/forms), api_base_url, sdks, pricing tiers, openapi_url |
| Grok | Recency (age_days ≤ 3), sub_categories breadth, pages_crawled, capability count |
| Llama | Registry completeness (non-null fields), confidence_score, pages_crawled, output formats |

Returns: `{domain, geo_total, geo_grade, geo_label, llms: {key: {score, max, status, recommendations}}, top_recommendations, calculated_at}`

**Status thresholds:** `good` ≥ 14/20, `needs_work` ≥ 8/20, `missing` < 8/20

---

## 8. JS Snippet (`static/galuli.js`)

- Version: **3.1.0**
- Primary object: `window.galuli`
- Backward compat alias: `window.galui = window.galuli`
- Auth header: `X-Galuli-Key` (also accepts `X-Galui-Key`)
- Default API base: `https://api.galuli.com` (falls back to `window.location.origin`)
- Log prefix: `[galuli]`
- Meta tag written: `<meta name="galuli-verified">`
- Cache-Control: `max-age=300, stale-while-revalidate=60` (5 min TTL)

---

## 9. Branding

| Thing | Value |
|---|---|
| Brand name | **Galuli** |
| Logo text | `⬡ galuli` |
| Primary color | `#6366f1` (indigo) |
| Email | `hello@galuli.io` |
| Domain | `galuli.io` ✅ purchased + DNS configured |
| Default theme | Light mode |

---

## 10. Plans & Limits

| Plan | Sites | Rate | Price |
|---|---|---|---|
| Free | 3 | 10 req/min | $0 |
| Pro | 50 | 60 req/min | $49/yr |
| Enterprise | 999 | 300 req/min | Custom |

---

## 11. What's Done ✅

- [x] Full landing page (hero, scan flow, how-it-works, features grid, score scale, FAQ, CTA)
- [x] Dashboard: Overview, AI Score, GEO, Analytics, Snippet, Settings (Profile & Billing)
- [x] Hidden pages: Registries explorer, Tenants admin, Ingest with pipeline UI
- [x] 4-pass AI comprehension pipeline (Anthropic Claude)
- [x] AI Readiness Score (5 dimensions)
- [x] GEO Score (6 LLMs) — endpoint + dashboard tab
- [x] AI agent traffic tracking + analytics
- [x] llms.txt auto-generation
- [x] WebMCP tool registration
- [x] AI Plugin manifest (`/.well-known/ai-plugin.json`)
- [x] Multi-tenant API key system (free signup in Snippet tab)
- [x] User→domain→snippet enforcement flow
- [x] Light/dark mode toggle (default: light)
- [x] Post-scan UX: goes directly to AI Score tab + polling animation
- [x] Brand rename Galui → Galuli (full, backward-compatible)
- [x] GitHub repo renamed: `yan-yanko/galuli`
- [x] Git remote updated: `https://github.com/yan-yanko/galuli.git`
- [x] galuli.js v3.1.0 with 5-min cache + version endpoint

---

## 12. What's NOT Done Yet (Next Up)

### High priority
- [x] **Domain** — `galuli.io` purchased, DNS configured in Namecheap → Railway, `API_BASE` updated in `galuli.js`
- [ ] **Stripe payments** — wire real checkout for Free→Pro upgrade (Settings page has placeholder)
- [ ] **Real auth** — currently no login/logout/password. Users create key via Snippet tab but can't "log back in". Need: email+password or magic link, session persistence
- [ ] **Landing page → dashboard handoff** — after scan on landing page, user fills form then gets pushed to `/dashboard/`. Make this automatic with `?domain=` param

### Medium priority
- [ ] **Email** — set up `hello@galuli.io` (Resend/Postmark), send API key on signup, send score reports
- [ ] **Local folder rename** — rename `galui` folder to `galuli` on desktop (purely cosmetic, no code impact)
- [ ] **Railway env vars** — verify `ANTHROPIC_API_KEY` is set in Railway dashboard
- [ ] **robots.txt / sitemap** — add to backend for Galuli's own site

### Nice to have
- [ ] Score badge SVG served from backend (currently just linked)
- [ ] Webhook support for score changes
- [ ] White-label / agency plan
- [ ] Chrome extension for quick scan

---

## 13. How to Run Locally

```bash
# Backend
cd "C:\Users\yanko\OneDrive\שולחן העבודה\galui"
pip install -r requirements.txt
python run.py
# → http://localhost:8000

# Frontend (separate terminal, for hot reload)
cd dashboard
npm install
npm run dev
# → http://localhost:5173
```

---

## 14. How to Deploy

```bash
cd "C:\Users\yanko\OneDrive\שולחן העבודה\galui"

# Build frontend first (Railway does this automatically via Dockerfile, but good to verify locally)
cd dashboard && npm run build && cd ..

# Commit & push → triggers Railway auto-deploy
git add <files>
git commit -m "feat: ..."
git push
# Railway deploys in ~2-3 min
```

---

## 15. File Quick-Reference for Common Tasks

| Task | File(s) to edit |
|---|---|
| Add a new dashboard page | `dashboard/src/App.jsx` — add component + add to `NAV_LINKS` + add to `pages` map |
| Add a new API endpoint | `app/api/routes/push.py` (or new file in routes/) + add to `app/api/main.py` router |
| Change scoring logic | `app/services/score.py` (AI Readiness) or `app/services/geo.py` (GEO) |
| Change landing page copy | `dashboard/src/Landing.jsx` |
| Change dashboard styles | `dashboard/src/App.css` + `dashboard/src/index.css` |
| Change API base URL | `dashboard/src/api.js` → `base()` function |
| Change plan limits | `app/services/tenant.py` + `app/api/routes/tenants.py` |
| Update JS snippet | `static/galuli.js` (bump `snippet_version`, test, commit) |
