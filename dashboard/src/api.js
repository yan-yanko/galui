// Auto-detect the API base URL:
// - When served from Railway (/dashboard), use same origin → no config needed
// - When running locally, use localhost:8000
// - Can always be overridden via Settings (localStorage)
const _autoBase = window.location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : window.location.origin;

const BASE = localStorage.getItem('galui_api_url') || _autoBase;

// Default API key — works out of the box for the hosted dashboard.
// Users can override in Settings if needed.
const DEFAULT_KEY = 'kotleryan1984';

function getKey() {
  return localStorage.getItem('galui_api_key') || DEFAULT_KEY;
}

function getBase() {
  return localStorage.getItem('galui_api_url') || BASE;
}

async function req(path, options = {}) {
  const res = await fetch(`${getBase()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': getKey(),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || err.error || 'Request failed');
  }
  return res.json();
}

async function reqText(path) {
  const res = await fetch(`${getBase()}${path}`, {
    headers: { 'X-API-Key': getKey() },
  });
  if (!res.ok) throw new Error(res.statusText);
  return res.text();
}

export const api = {
  base: getBase,

  health: () => req('/health'),

  // ── Ingestion ────────────────────────────────────────────────────────────
  ingest:   (url, force = false) =>
    req('/api/v1/ingest', { method: 'POST', body: JSON.stringify({ url, force_refresh: force }) }),
  pollJob:  (jobId) => req(`/api/v1/jobs/${jobId}`),
  listJobs: ()      => req('/api/v1/jobs'),

  // ── Registry ─────────────────────────────────────────────────────────────
  listRegistries: ()       => req('/registry/'),
  getRegistry:    (domain) => req(`/registry/${domain}`),
  getLlmsTxt:     (domain) => reqText(`/registry/${domain}/llms.txt`),
  getLiveStatus:  (domain) => req(`/registry/${domain}/status`),

  // ── Score + Badge ─────────────────────────────────────────────────────────
  getScore:       (domain) => req(`/api/v1/score/${domain}`),
  getSuggestions: (domain) => req(`/api/v1/score/${domain}/suggestions`),
  getBadgeUrl:    (domain) => `${getBase()}/api/v1/score/${domain}/badge`,

  // ── Analytics ─────────────────────────────────────────────────────────────
  getAnalytics:      (domain, days = 30) => req(`/api/v1/analytics/${domain}?days=${days}`),
  getAgentBreakdown: (domain, days = 30) => req(`/api/v1/analytics/${domain}/agents?days=${days}`),
  getPageBreakdown:  (domain, days = 30) => req(`/api/v1/analytics/${domain}/pages?days=${days}`),

  // ── Admin ─────────────────────────────────────────────────────────────────
  deleteRegistry:  (domain) => req(`/api/v1/admin/registry/${domain}`, { method: 'DELETE' }),
  refreshRegistry: (domain) => req('/api/v1/admin/refresh', { method: 'POST', body: JSON.stringify({ domain }) }),
  getStats:        ()       => req('/api/v1/admin/stats'),

  // ── Tenants ───────────────────────────────────────────────────────────────
  createTenant: (name, email, plan) =>
    req('/api/v1/tenants', { method: 'POST', body: JSON.stringify({ name, email, plan }) }),
  listTenants:  () => req('/api/v1/tenants'),
  getMe:        () => req('/api/v1/tenants/me'),
  getMyUsage:   () => req('/api/v1/tenants/me/usage'),
};
