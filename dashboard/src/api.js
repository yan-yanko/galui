const BASE = localStorage.getItem('galui_api_url') || import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function req(path, options = {}) {
  const apiKey = localStorage.getItem('galui_api_key') || '';
  const base   = localStorage.getItem('galui_api_url') || BASE;
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'X-API-Key': apiKey } : {}),
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
  const apiKey = localStorage.getItem('galui_api_key') || '';
  const base   = localStorage.getItem('galui_api_url') || BASE;
  const res = await fetch(`${base}${path}`, {
    headers: apiKey ? { 'X-API-Key': apiKey } : {},
  });
  if (!res.ok) throw new Error(res.statusText);
  return res.text();
}

export const api = {
  base: () => localStorage.getItem('galui_api_url') || BASE,

  health: () => req('/health'),

  // ── Ingestion (crawl-based) ──────────────────────────────────────────────
  ingest: (url, force = false) =>
    req('/api/v1/ingest', { method: 'POST', body: JSON.stringify({ url, force_refresh: force }) }),
  pollJob: (jobId) => req(`/api/v1/jobs/${jobId}`),
  listJobs: () => req('/api/v1/jobs'),

  // ── Registry ─────────────────────────────────────────────────────────────
  listRegistries: () => req('/registry/'),
  getRegistry:    (domain) => req(`/registry/${domain}`),
  getLlmsTxt:     (domain) => reqText(`/registry/${domain}/llms.txt`),
  getLiveStatus:  (domain) => req(`/registry/${domain}/status`),

  // ── Score + Badge ─────────────────────────────────────────────────────────
  getScore:       (domain) => req(`/api/v1/score/${domain}`),
  getSuggestions: (domain) => req(`/api/v1/score/${domain}/suggestions`),
  getBadgeUrl:    (domain) => `${api.base()}/api/v1/score/${domain}/badge`,

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
