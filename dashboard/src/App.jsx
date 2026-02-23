import { useState, useEffect, useCallback } from 'react'
import { api } from './api'
import './index.css'
import './App.css'

// ── Toast ──────────────────────────────────────────────────────────────────
let _addToast = () => {}
function ToastContainer() {
  const [toasts, setToasts] = useState([])
  useEffect(() => {
    _addToast = (msg, type = 'info') => {
      const id = Date.now()
      setToasts(t => [...t, { id, msg, type }])
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
    }
  }, [])
  return (
    <div className="toast-container">
      {toasts.map(t => <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>)}
    </div>
  )
}
const toast = {
  success: m => _addToast(m, 'success'),
  error:   m => _addToast(m, 'error'),
  info:    m => _addToast(m, 'info'),
}

// ── Shared components ──────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    operational:  ['badge-green',  'Operational'],
    complete:     ['badge-green',  'Complete'],
    degraded:     ['badge-yellow', 'Degraded'],
    outage:       ['badge-red',    'Outage'],
    unreachable:  ['badge-red',    'Unreachable'],
    failed:       ['badge-red',    'Failed'],
    crawling:     ['badge-blue',   'Crawling'],
    comprehending:['badge-blue',   'Processing'],
    storing:      ['badge-blue',   'Storing'],
    pending:      ['badge-gray',   'Pending'],
    unknown:      ['badge-gray',   'Unknown'],
  }
  const [cls, label] = map[status] || ['badge-gray', status]
  return <span className={`badge ${cls}`}>{label}</span>
}

function ScoreRing({ score, size = 80 }) {
  const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F'
  const color = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--blue)' : score >= 40 ? 'var(--yellow)' : 'var(--red)'
  const r = size / 2 - 7
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border2)" strokeWidth={7} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.22, fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: size * 0.15, color: 'var(--muted)', marginTop: 2 }}>{grade}</span>
      </div>
    </div>
  )
}

function CopyBtn({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  return (
    <button className="btn btn-ghost btn-sm" onClick={() => {
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }}>
      {copied ? '✓ Copied!' : label}
    </button>
  )
}

function MiniBar({ value, max, color }) {
  const pct = Math.round((value / (max || 1)) * 100)
  return (
    <div style={{ background: 'var(--border)', borderRadius: 3, height: 5, flex: 1 }}>
      <div style={{ height: 5, borderRadius: 3, background: color || 'var(--accent2)', width: `${pct}%`, transition: 'width 0.4s' }} />
    </div>
  )
}

function PageHeader({ title, subtitle }) {
  return (
    <div className="section-header">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  )
}

function EmptyState({ icon, title, description, action }) {
  return (
    <div className="card">
      <div className="empty-state">
        <div className="empty-state-icon">{icon}</div>
        <div className="empty-state-title">{title}</div>
        <div className="empty-state-desc">{description}</div>
        {action && <div style={{ marginTop: 16 }}>{action}</div>}
      </div>
    </div>
  )
}

// ── Nav ─────────────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { id: 'overview',   label: 'Overview',   icon: '◎' },
  { id: 'ingest',     label: 'Index a Site', icon: '↓' },
  { id: 'score',      label: 'AI Score',   icon: '◈' },
  { id: 'analytics',  label: 'Analytics',  icon: '◉' },
  { id: 'registries', label: 'Registries', icon: '▦' },
  { id: 'snippet',    label: 'Snippet',    icon: '</>' },
  { id: 'tenants',    label: 'Tenants',    icon: '⊞' },
  { id: 'settings',   label: 'Settings',   icon: '⚙' },
]

function Nav({ page, setPage, health }) {
  return (
    <nav style={{
      background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      padding: '0 24px', display: 'flex', alignItems: 'center', gap: 2,
      height: 54, position: 'sticky', top: 0, zIndex: 100,
      boxShadow: '0 1px 0 var(--border)',
    }}>
      {/* Logo */}
      <div style={{
        fontWeight: 800, fontSize: 16, color: 'var(--accent2)',
        letterSpacing: '-0.5px', marginRight: 20, flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 18 }}>⬡</span> galui
      </div>

      {/* Links */}
      <div style={{ display: 'flex', gap: 2, flex: 1, overflowX: 'auto' }}>
        {NAV_LINKS.map(l => (
          <button key={l.id} onClick={() => setPage(l.id)} style={{
            background: page === l.id ? 'var(--border)' : 'none',
            color: page === l.id ? 'var(--text)' : 'var(--muted)',
            padding: '5px 12px', borderRadius: 7,
            fontWeight: page === l.id ? 600 : 400,
            fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0,
            transition: 'all 0.15s',
          }}>{l.label}</button>
        ))}
      </div>

      {/* Status indicators */}
      {health && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0, marginLeft: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
            <span className={`dot dot-${health.anthropic_configured ? 'green' : 'red'}`} />
            <span>AI {health.anthropic_configured ? 'ready' : 'offline'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
            <span className="dot dot-green" />
            <span>{health.registries_indexed} site{health.registries_indexed !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}
    </nav>
  )
}

// ── Overview ─────────────────────────────────────────────────────────────────
function OverviewPage({ setPage }) {
  const [health, setHealth] = useState(null)
  const [registries, setRegistries] = useState([])
  const [scores, setScores] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.health().catch(() => null),
      api.listRegistries().catch(() => ({ registries: [] })),
    ]).then(([h, r]) => {
      setHealth(h)
      const regs = r?.registries || []
      setRegistries(regs)
      regs.forEach(reg => {
        api.getScore(reg.domain)
          .then(s => setScores(prev => ({ ...prev, [reg.domain]: s })))
          .catch(() => {})
      })
    }).finally(() => setLoading(false))
  }, [])

  const hasData = registries.length > 0

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 48, color: 'var(--muted)' }}>
      <span className="spinner" /> Loading…
    </div>
  )

  return (
    <div className="flex col gap-24">
      <PageHeader
        title="Overview"
        subtitle="Your AI readability hub — see how visible your sites are to AI agents."
      />

      {/* Empty state hero */}
      {!hasData && (
        <div className="card" style={{
          borderColor: 'var(--accent)', borderWidth: 1,
          background: 'linear-gradient(135deg, #0f0f1a 0%, #13102a 100%)',
          padding: '40px 36px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 20 }}>
            <div style={{ fontSize: 48, lineHeight: 1 }}>🚀</div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>
                Make your first site AI-readable
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 540, lineHeight: 1.8 }}>
                Enter any URL below. Galui crawls every page, runs a 4-pass AI pipeline, extracts your site's capabilities,
                and generates an <strong style={{ color: 'var(--text)' }}>AI Readiness Score (0–100)</strong> — in under 2 minutes. Free, no credit card.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 560, width: '100%' }}>
              {[
                { icon: '📊', label: 'AI Readiness Score', sub: '0–100 across 5 dimensions' },
                { icon: '🔍', label: 'Capabilities extracted', sub: 'What AI agents will know' },
                { icon: '💡', label: 'Improvement plan', sub: 'Specific fixes, ranked by impact' },
              ].map(({ icon, label, sub }) => (
                <div key={label} style={{ background: '#0a0a18', border: '1px solid var(--border2)', borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</div>
                </div>
              ))}
            </div>
            <button
              className="btn btn-primary"
              style={{ fontSize: 14, padding: '12px 32px' }}
              onClick={() => setPage('ingest')}
            >
              Index your first site →
            </button>
          </div>
        </div>
      )}

      {/* Indexed sites */}
      {hasData && (
        <>
          <div>
            <div className="flex between center" style={{ marginBottom: 14 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Your indexed sites</h2>
              <button className="btn btn-primary btn-sm" onClick={() => setPage('ingest')}>
                + Index another site
              </button>
            </div>
            <div className="flex col gap-12">
              {registries.map(r => {
                const s = scores[r.domain]
                return (
                  <div key={r.domain} className="card" style={{ padding: '16px 20px' }}>
                    <div className="flex center gap-20 wrap">
                      {s
                        ? <ScoreRing score={s.total} size={68} />
                        : <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="spinner" /></div>
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>
                          {r.domain}
                        </div>
                        {s ? (
                          <>
                            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>
                              Grade <strong style={{ color: s.total >= 70 ? 'var(--green)' : s.total >= 50 ? 'var(--yellow)' : 'var(--red)' }}>{s.grade}</strong>
                              {' · '}{s.total}/100{' · '}{s.label}
                            </div>
                            {s.suggestions?.[0] && (
                              <div style={{ fontSize: 12, color: 'var(--yellow)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>💡</span> {s.suggestions[0].issue}
                              </div>
                            )}
                          </>
                        ) : (
                          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Loading score…</div>
                        )}
                      </div>
                      <div className="flex gap-8 wrap" style={{ flexShrink: 0 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setPage('score')}>Score →</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setPage('analytics')}>Analytics →</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setPage('snippet')}>Install →</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {[
              { label: 'Sites indexed',       value: registries.length,                          color: 'var(--accent2)' },
              { label: 'AI traffic domains',  value: health?.domains_with_ai_traffic ?? 0,        color: 'var(--blue)'    },
              { label: 'Avg score',           value: scores && Object.values(scores).length > 0 ? Math.round(Object.values(scores).reduce((a,b) => a + b.total, 0) / Object.values(scores).length) + '/100' : '—', color: 'var(--green)' },
              { label: 'WebMCP enabled',      value: Object.values(scores).filter(s => s?.dimensions?.webmcp_compliance?.webmcp_enabled).length, color: 'var(--purple)' },
            ].map(c => (
              <div key={c.label} className="stat-card">
                <div className="stat-value" style={{ color: c.color }}>{c.value}</div>
                <div className="stat-label">{c.label}</div>
              </div>
            ))}
          </div>

          {/* Snippet CTA */}
          <div className="card" style={{ background: 'var(--surface2)', border: '1px solid var(--border2)' }}>
            <div className="flex between center wrap gap-16">
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                  Unlock real-time AI traffic analytics
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                  Install one script tag → track every AI agent that visits your site + WebMCP auto-registration.
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setPage('snippet')}>
                View install guide →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Index a Site (Ingest) ────────────────────────────────────────────────────
function IngestPage() {
  const [url, setUrl] = useState('')
  const [force, setForce] = useState(false)
  const [loading, setLoading] = useState(false)
  const [job, setJob] = useState(null)
  const [polling, setPolling] = useState(false)
  const [result, setResult] = useState(null)
  const [loadingResult, setLoadingResult] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true); setJob(null); setResult(null)
    try {
      const res = await api.ingest(url.trim(), force)
      setJob(res)
      if (res.status === 'complete') {
        toast.success(`Already indexed — loading results`)
        loadResult(res.domain)
      } else {
        toast.info(`Indexing started for ${res.domain}`)
        setPolling(true)
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadResult = async (domain) => {
    setLoadingResult(true)
    try {
      const [registry, score] = await Promise.all([
        api.getRegistry(domain),
        api.getScore(domain),
      ])
      setResult({ registry, score })
    } catch {}
    setLoadingResult(false)
  }

  useEffect(() => {
    if (!polling || !job?.job_id || job.job_id === 'cached') return
    const i = setInterval(async () => {
      try {
        const u = await api.pollJob(job.job_id)
        setJob(j => ({ ...j, ...u }))
        if (['complete', 'failed'].includes(u.status)) {
          setPolling(false)
          if (u.status === 'complete') {
            toast.success(`Done! Loading results for ${job.domain}`)
            loadResult(job.domain)
          } else {
            toast.error(`Failed: ${u.error}`)
          }
        }
      } catch {}
    }, 800)
    return () => clearInterval(i)
  }, [polling, job])

  const stageMap = { pending: 0, crawling: 1, comprehending: 2, storing: 3, complete: 4, failed: 4 }
  const stages = [
    { label: 'Crawling pages', desc: 'Fetching all pages on the site' },
    { label: 'AI comprehension', desc: '4-pass LLM pipeline — extracting capabilities, pricing, integrations' },
    { label: 'Building schema', desc: 'Structuring data into registry format' },
    { label: 'Storing', desc: 'Saving to database and generating outputs' },
  ]

  return (
    <div className="flex col gap-24" style={{ maxWidth: 740 }}>
      <PageHeader
        title="Index a site"
        subtitle="Enter any URL. We crawl it, run a 4-pass AI pipeline, and show you exactly what AI agents will see."
      />

      <form onSubmit={submit} className="card flex col gap-16">
        <div>
          <label className="label">Website URL</label>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://yoursite.com"
            disabled={loading || polling}
            style={{ fontSize: 15 }}
          />
        </div>
        <div className="flex center gap-12">
          <label className="flex center gap-8" style={{ cursor: 'pointer', userSelect: 'none', color: 'var(--muted)', fontSize: 13 }}>
            <input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)} style={{ width: 'auto', cursor: 'pointer' }} />
            Force re-crawl
          </label>
          <div className="grow" />
          <button className="btn btn-primary" disabled={loading || polling || !url.trim()} style={{ minWidth: 130 }}>
            {loading || polling
              ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Working…</>
              : '→ Index site'}
          </button>
        </div>
      </form>

      {/* Progress */}
      {job && !['complete', 'failed'].includes(job.status) && (
        <div className="card flex col gap-20">
          <div className="flex center between">
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{job.domain}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>{job.job_id}</div>
            </div>
            <StatusBadge status={job.status} />
          </div>
          <div className="flex col gap-12">
            {stages.map(({ label, desc }, i) => {
              const cur = stageMap[job.status] || 0
              const stageNum = i + 1
              const done = cur > stageNum
              const active = cur === stageNum
              return (
                <div key={label} className="flex gap-14 center" style={{ opacity: active || done ? 1 : 0.35 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? '#10b98120' : active ? '#6366f120' : 'var(--border)', border: `1px solid ${done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--border2)'}` }}>
                    {done
                      ? <span style={{ color: 'var(--green)', fontSize: 13 }}>✓</span>
                      : active
                        ? <span className="spinner" style={{ width: 12, height: 12 }} />
                        : <span style={{ color: 'var(--muted)', fontSize: 11 }}>{stageNum}</span>}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? 'var(--text)' : done ? 'var(--subtle)' : 'var(--muted)' }}>{label}</div>
                    {active && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{desc}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Error */}
      {job?.status === 'failed' && (
        <div className="card" style={{ borderColor: 'var(--red)', background: '#ef444408' }}>
          <div style={{ color: 'var(--red)', fontWeight: 600, marginBottom: 6 }}>Indexing failed</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>{job.error || 'Unknown error. Check the URL and try again.'}</div>
        </div>
      )}

      {/* Loading result */}
      {loadingResult && (
        <div className="flex center gap-12" style={{ padding: 32, color: 'var(--muted)' }}>
          <span className="spinner" /> Loading results…
        </div>
      )}

      {/* Results */}
      {result && <IndexResult result={result} />}
    </div>
  )
}

function IndexResult({ result }) {
  const { registry, score } = result
  const gradeColor = score.total >= 70 ? 'var(--green)' : score.total >= 50 ? 'var(--yellow)' : 'var(--red)'
  const dimLabels = { content_coverage: 'Content Coverage', structure_quality: 'Structure Quality', freshness: 'Freshness', webmcp_compliance: 'WebMCP Compliance', output_formats: 'Output Formats' }
  const dimColors = { content_coverage: 'var(--accent2)', structure_quality: 'var(--green)', freshness: 'var(--blue)', webmcp_compliance: 'var(--purple)', output_formats: 'var(--yellow)' }
  const priorityColor = { high: 'var(--red)', medium: 'var(--yellow)', low: 'var(--muted)' }

  return (
    <div className="flex col gap-16">
      {/* Score hero */}
      <div className="card" style={{ borderColor: gradeColor, background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface2) 100%)' }}>
        <div className="flex center gap-24 wrap">
          <ScoreRing score={score.total} size={110} />
          <div className="flex col gap-8" style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{score.label}</div>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>{registry.domain}</div>
            <div style={{ fontSize: 13, color: 'var(--subtle)', marginTop: 2, lineHeight: 1.5 }}>
              {registry.metadata?.description}
            </div>
            <div className="flex gap-8 wrap" style={{ marginTop: 6 }}>
              <span className="badge badge-blue">{score.total}/100</span>
              <span className={`badge ${score.total >= 70 ? 'badge-green' : score.total >= 50 ? 'badge-yellow' : 'badge-red'}`}>Grade {score.grade}</span>
              {registry.metadata?.category && <span className="badge badge-gray">{registry.metadata.category}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="card flex col gap-14">
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Score breakdown</div>
        {Object.entries(score.dimensions || {}).map(([key, dim]) => (
          <div key={key}>
            <div className="flex between" style={{ fontSize: 13, marginBottom: 6 }}>
              <span style={{ fontWeight: 500 }}>{dimLabels[key] || key}</span>
              <span style={{ color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{dim.score}<span style={{ color: 'var(--border2)' }}>/{dim.max}</span></span>
            </div>
            <div style={{ background: 'var(--border)', borderRadius: 4, height: 6 }}>
              <div style={{
                height: 6, borderRadius: 4,
                background: dimColors[key] || 'var(--accent2)',
                width: `${Math.round((dim.score / dim.max) * 100)}%`,
                transition: 'width 0.6s ease',
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Capabilities */}
      {registry.capabilities?.length > 0 && (
        <div className="card flex col gap-12">
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>What AI agents now know about {registry.domain}</div>
            <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 3 }}>
              {registry.capabilities.length} capabilities extracted by the AI pipeline
            </div>
          </div>
          {registry.capabilities.map(cap => (
            <div key={cap.id} className="capability">
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{cap.name}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>{cap.description}</div>
              {cap.use_cases?.length > 0 && (
                <div className="flex wrap gap-6" style={{ marginTop: 8 }}>
                  {cap.use_cases.slice(0, 4).map(u => (
                    <span key={u} style={{ fontSize: 11, background: 'var(--border)', color: 'var(--subtle)', padding: '2px 8px', borderRadius: 4 }}>{u}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {score.suggestions?.length > 0 && (
        <div className="card flex col gap-10">
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>How to improve your score</div>
          {score.suggestions.map((s, i) => (
            <div key={i} className={`suggestion suggestion-${s.priority}`}>
              <div className="flex center gap-8" style={{ marginBottom: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: priorityColor[s.priority], textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.priority}</span>
                <span style={{ color: 'var(--border2)' }}>·</span>
                <span style={{ fontSize: 12, color: 'var(--subtle)', fontWeight: 600 }}>{s.dimension}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{s.issue}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{s.fix}</div>
            </div>
          ))}
        </div>
      )}

      {/* Next step */}
      <div className="card flex col gap-14" style={{ background: 'linear-gradient(135deg, #0f1020 0%, #0a0a18 100%)', borderColor: 'var(--accent)' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 5 }}>Next step: install the snippet</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
            Add one script tag to your site's <code>&lt;head&gt;</code> to unlock AI agent tracking, WebMCP auto-registration, and live score updates.
          </div>
        </div>
        <div className="code-block">
          {`<script src="${api.base()}/galui.js?key=${localStorage.getItem('galui_api_key') || 'YOUR_KEY'}" async></script>`}
          <div className="copy-btn-abs">
            <CopyBtn text={`<script src="${api.base()}/galui.js?key=${localStorage.getItem('galui_api_key') || 'YOUR_KEY'}" async></script>`} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── AI Score ─────────────────────────────────────────────────────────────────
function ScorePage() {
  const [registries, setRegistries] = useState([])
  const [selected, setSelected] = useState('')
  const [score, setScore] = useState(null)
  const [loading, setLoading] = useState(false)
  const [badgeTab, setBadgeTab] = useState('preview')

  useEffect(() => {
    api.listRegistries().then(r => {
      const regs = r.registries || []
      setRegistries(regs)
      if (regs.length > 0) loadScore(regs[0].domain)
    }).catch(() => {})
  }, [])

  const loadScore = (domain) => {
    setSelected(domain); setLoading(true); setScore(null)
    api.getScore(domain).then(setScore).catch(() => {}).finally(() => setLoading(false))
  }

  const dimLabels = { content_coverage: 'Content Coverage', structure_quality: 'Structure Quality', freshness: 'Freshness', webmcp_compliance: 'WebMCP Compliance', output_formats: 'Output Formats' }
  const dimColors = { content_coverage: 'var(--accent2)', structure_quality: 'var(--green)', freshness: 'var(--blue)', webmcp_compliance: 'var(--purple)', output_formats: 'var(--yellow)' }
  const dimDesc  = {
    content_coverage: 'How well your site\'s capabilities, use cases, and value proposition are extracted and described. Low score = AI agents can\'t explain what you do.',
    structure_quality: 'Completeness of structured data: pricing, API info, schema.org markup, headings hierarchy. Low score = AI gives incomplete or inaccurate answers about your product.',
    freshness: 'How recently your registry was updated relative to your actual site. Stale data = AI agents cite outdated information.',
    webmcp_compliance: 'Whether the Galui snippet is installed and WebMCP tools are registered. Without this, AI agents can\'t interact with your site\'s forms or actions.',
    output_formats: 'Whether your llms.txt, JSON registry, and AI plugin manifest are generated and accessible. These are what AI crawlers actually fetch.',
  }
  const priorityColor = { high: 'var(--red)', medium: 'var(--yellow)', low: 'var(--muted)' }

  return (
    <div className="flex col gap-24">
      <div className="flex between center wrap gap-12">
        <PageHeader title="AI Readiness Score" subtitle="How visible and useful is your site to AI agents and LLMs?" />
        {registries.length > 0 && (
          <select value={selected} onChange={e => loadScore(e.target.value)} style={{ width: 'auto', minWidth: 200 }}>
            {registries.map(r => <option key={r.domain} value={r.domain}>{r.domain}</option>)}
          </select>
        )}
      </div>

      {registries.length === 0 && (
        <EmptyState
          icon="◈"
          title="No sites indexed yet"
          description="Index a site first to see its AI Readiness Score."
          action={<button className="btn btn-primary btn-sm" onClick={() => {}}>Go to Index a site</button>}
        />
      )}

      {loading && <div className="flex center gap-12" style={{ padding: 40, color: 'var(--muted)' }}><span className="spinner" /> Calculating score…</div>}

      {!loading && score && (
        <>
          {/* Score hero */}
          <div className="card" style={{ padding: '28px 32px' }}>
            <div className="flex center gap-32 wrap">
              <ScoreRing score={score.total} size={130} />
              <div className="flex col gap-10" style={{ flex: 1 }}>
                <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.3px' }}>{score.label}</div>
                <div style={{ color: 'var(--muted)', fontSize: 14 }}>{selected}</div>
                <div className="flex gap-8 wrap" style={{ marginTop: 4 }}>
                  <span className="badge badge-blue">Score: {score.total}/100</span>
                  <span className={`badge ${score.total >= 70 ? 'badge-green' : score.total >= 50 ? 'badge-yellow' : 'badge-red'}`}>Grade: {score.grade}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  Calculated {new Date(score.calculated_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Score scale */}
          <div className="card flex col gap-10">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Score scale</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { range: '90–100', grade: 'A+', color: 'var(--green)',  label: 'Elite — fully AI-optimized' },
                { range: '70–89',  grade: 'B',  color: 'var(--blue)',   label: 'Good — minor improvements needed' },
                { range: '50–69',  grade: 'C',  color: 'var(--yellow)', label: 'Average — AI may miss key info' },
                { range: '30–49',  grade: 'D',  color: 'var(--red)',    label: 'Poor — high invisibility risk' },
                { range: '0–29',   grade: 'F',  color: '#991b1b',       label: 'Not readable by AI' },
              ].map(({ range, grade, color, label }) => (
                <div key={grade} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', flex: '1 1 160px' }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white', fontSize: 11, flexShrink: 0 }}>{grade}</div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{range}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Breakdown */}
          <div className="card flex col gap-16">
            <div style={{ fontWeight: 700, fontSize: 14 }}>Score breakdown</div>
            {Object.entries(score.dimensions || {}).map(([key, dim]) => (
              <div key={key} className="flex col gap-6">
                <div className="flex between center" style={{ fontSize: 13 }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{dimLabels[key] || key}</span>
                    <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 8 }}>{dimDesc[key]}</span>
                  </div>
                  <span style={{ color: 'var(--subtle)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {dim.score}<span style={{ color: 'var(--muted)', fontWeight: 400 }}>/{dim.max}</span>
                  </span>
                </div>
                <div style={{ background: 'var(--border)', borderRadius: 4, height: 7 }}>
                  <div style={{ height: 7, borderRadius: 4, background: dimColors[key] || 'var(--accent2)', width: `${(dim.score / dim.max) * 100}%`, transition: 'width 0.6s' }} />
                </div>
                {key === 'webmcp_compliance' && (
                  <div className="flex gap-16" style={{ fontSize: 12, color: 'var(--muted)' }}>
                    <span>{dim.webmcp_enabled ? '✓ WebMCP active' : '○ WebMCP pending (install snippet)'}</span>
                    {dim.tools_registered > 0 && <span>{dim.tools_registered} tools</span>}
                  </div>
                )}
                {key === 'freshness' && dim.age_days !== null && (
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Last updated {dim.age_days === 0 ? 'today' : `${dim.age_days} day${dim.age_days !== 1 ? 's' : ''} ago`}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Suggestions */}
          {score.suggestions?.length > 0 && (
            <div className="card flex col gap-10">
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Improvement suggestions</div>
              {score.suggestions.map((s, i) => (
                <div key={i} className={`suggestion suggestion-${s.priority}`}>
                  <div className="flex center gap-8" style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: priorityColor[s.priority], textTransform: 'uppercase' }}>{s.priority}</span>
                    <span style={{ color: 'var(--border2)' }}>·</span>
                    <span style={{ fontSize: 12, color: 'var(--subtle)' }}>{s.dimension}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{s.issue}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{s.fix}</div>
                </div>
              ))}
            </div>
          )}

          {/* Badge */}
          <div className="card flex col gap-16">
            <div style={{ fontWeight: 700, fontSize: 14 }}>Embeddable badge</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              Show visitors your AI Readiness score. Updates automatically when your score changes.
            </div>
            <div className="tabs">
              {['preview', 'html', 'markdown'].map(t => (
                <button key={t} className={`tab ${badgeTab === t ? 'active' : ''}`} onClick={() => setBadgeTab(t)}>{t}</button>
              ))}
            </div>
            {badgeTab === 'preview' && (
              <div className="flex col gap-12">
                <img src={api.getBadgeUrl(selected)} alt="AI Readiness Badge" style={{ height: 28 }} />
              </div>
            )}
            {badgeTab === 'html' && (
              <div className="flex col gap-10">
                <div className="code-block">
                  {`<a href="${api.base()}/api/v1/score/${selected}" target="_blank">\n  <img src="${api.getBadgeUrl(selected)}" alt="AI-Ready" />\n</a>`}
                  <div className="copy-btn-abs">
                    <CopyBtn text={`<a href="${api.base()}/api/v1/score/${selected}" target="_blank"><img src="${api.getBadgeUrl(selected)}" alt="AI-Ready" /></a>`} />
                  </div>
                </div>
              </div>
            )}
            {badgeTab === 'markdown' && (
              <div className="flex col gap-10">
                <div className="code-block">
                  {`[![AI-Ready](${api.getBadgeUrl(selected)})](${api.base()}/api/v1/score/${selected})`}
                  <div className="copy-btn-abs">
                    <CopyBtn text={`[![AI-Ready](${api.getBadgeUrl(selected)})](${api.base()}/api/v1/score/${selected})`} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Analytics ─────────────────────────────────────────────────────────────────
const AGENT_COLORS = {
  'GPTBot': '#10b981', 'ChatGPT': '#10b981', 'OpenAI Search': '#10b981',
  'ClaudeBot': '#f59e0b', 'Claude Web': '#f59e0b', 'Anthropic': '#f59e0b',
  'PerplexityBot': '#3b82f6', 'Perplexity': '#3b82f6',
  'Gemini': '#8b5cf6', 'Google Extended': '#8b5cf6',
  'BingBot': '#06b6d4', 'WebMCP Agent': '#ec4899',
}

function AnalyticsPage({ setPage }) {
  const [registries, setRegistries] = useState([])
  const [selected, setSelected] = useState('')
  const [days, setDays] = useState(30)
  const [summary, setSummary] = useState(null)
  const [agents, setAgents] = useState([])
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.listRegistries().then(r => {
      const regs = r.registries || []
      setRegistries(regs)
      if (regs.length > 0 && !selected) setSelected(regs[0].domain)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selected) return
    setLoading(true)
    Promise.all([
      api.getAnalytics(selected, days),
      api.getAgentBreakdown(selected, days),
      api.getPageBreakdown(selected, days),
    ]).then(([s, a, p]) => {
      setSummary(s); setAgents(a.agents || []); setPages(p.pages || [])
    }).catch(() => {
      setSummary({ total_ai_hits: 0, unique_agents: 0, top_agents: [], daily_trend: [] })
    }).finally(() => setLoading(false))
  }, [selected, days])

  const maxHits = agents.length > 0 ? Math.max(...agents.map(a => a.hits)) : 1

  return (
    <div className="flex col gap-24">
      <div className="flex between center wrap gap-12">
        <PageHeader title="AI Traffic Analytics" subtitle="Which AI agents are visiting your site and what they're reading" />
        <div className="flex gap-10 center">
          {registries.length > 0 && (
            <select value={selected} onChange={e => setSelected(e.target.value)} style={{ width: 'auto' }}>
              {registries.map(r => <option key={r.domain} value={r.domain}>{r.domain}</option>)}
            </select>
          )}
          <select value={days} onChange={e => setDays(Number(e.target.value))} style={{ width: 'auto' }}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {loading && <div className="flex center gap-12" style={{ padding: 40, color: 'var(--muted)' }}><span className="spinner" /> Loading…</div>}

      {!loading && summary && summary.total_ai_hits === 0 && (
        <div className="card flex col gap-20" style={{ padding: '32px 28px' }}>
          <div className="empty-state">
            <div className="empty-state-icon">📡</div>
            <div className="empty-state-title">No AI traffic recorded yet</div>
            <div className="empty-state-desc">
              Install the Galui snippet on <strong>{selected || 'your site'}</strong> to start tracking AI agent visits in real time.
              The snippet detects 30+ AI crawlers and logs every visit — agent name, page visited, timestamp.
            </div>
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-primary btn-sm" onClick={() => setPage('snippet')}>
                View install guide →
              </button>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>What you'll see once the snippet is installed</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {[
                { icon: '🤖', label: 'GPTBot & ChatGPT visits', sub: 'OpenAI crawler + live ChatGPT browsing' },
                { icon: '🟣', label: 'ClaudeBot visits', sub: 'Anthropic crawler traffic' },
                { icon: '🔵', label: 'PerplexityBot visits', sub: 'Perplexity AI search indexing' },
                { icon: '📄', label: 'Pages AI agents read', sub: 'Which URLs they fetch most' },
              ].map(({ icon, label, sub }) => (
                <div key={label} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && summary && summary.total_ai_hits > 0 && (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {[
              { label: 'Total AI visits',  value: summary.total_ai_hits, color: 'var(--accent2)' },
              { label: 'Unique agents',    value: summary.unique_agents, color: 'var(--green)'   },
              { label: 'Top agent',        value: summary.top_agents?.[0]?.agent_name || '—', color: 'var(--blue)' },
              { label: 'Most visited',     value: summary.top_pages?.[0]?.hits || '—', color: 'var(--yellow)' },
            ].map(c => (
              <div key={c.label} className="stat-card">
                <div className="stat-value" style={{ color: c.color, fontSize: 24 }}>{c.value}</div>
                <div className="stat-label">{c.label}</div>
              </div>
            ))}
          </div>

          {/* Agent breakdown + top pages */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card flex col gap-14">
              <div style={{ fontWeight: 700, fontSize: 14 }}>AI agents visiting</div>
              {agents.length === 0
                ? <div style={{ color: 'var(--muted)', fontSize: 13 }}>No agent data</div>
                : agents.map(a => (
                  <div key={a.agent_name} className="flex center gap-12">
                    <div style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: AGENT_COLORS[a.agent_name] || 'var(--muted)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex between" style={{ fontSize: 13, marginBottom: 5 }}>
                        <span style={{ fontWeight: 500 }}>{a.agent_name}</span>
                        <span style={{ color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{a.hits} visits</span>
                      </div>
                      <MiniBar value={a.hits} max={maxHits} color={AGENT_COLORS[a.agent_name] || 'var(--accent2)'} />
                    </div>
                  </div>
                ))
              }
            </div>

            <div className="card flex col gap-12">
              <div style={{ fontWeight: 700, fontSize: 14 }}>Most visited pages</div>
              {pages.length === 0
                ? <div style={{ color: 'var(--muted)', fontSize: 13 }}>No page data</div>
                : pages.slice(0, 8).map((p, i) => (
                  <div key={p.page_url} className="flex center gap-12" style={{ fontSize: 12 }}>
                    <span style={{ color: 'var(--muted)', width: 18, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                    <span style={{ flex: 1, color: 'var(--accent2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.page_url.replace(/^https?:\/\/[^/]+/, '') || '/'}
                    </span>
                    <span style={{ color: 'var(--muted)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{p.total_hits}×</span>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Daily trend */}
          {summary.daily_trend?.length > 0 && (
            <div className="card flex col gap-14">
              <div style={{ fontWeight: 700, fontSize: 14 }}>Daily trend</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
                {(() => {
                  const maxVal = Math.max(...summary.daily_trend.map(d => d.hits), 1)
                  return summary.daily_trend.map(d => (
                    <div key={d.day} title={`${d.day}: ${d.hits} visits`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: '100%', background: 'var(--accent2)', height: `${(d.hits / maxVal) * 64}px`, borderRadius: '3px 3px 0 0', minHeight: 2, opacity: 0.75, transition: 'height 0.3s' }} />
                      <span style={{ fontSize: 9, color: 'var(--muted)', transform: 'rotate(-45deg)', transformOrigin: 'center', whiteSpace: 'nowrap' }}>{d.day.slice(5)}</span>
                    </div>
                  ))
                })()}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Snippet ───────────────────────────────────────────────────────────────────
function SnippetPage() {
  const apiKey = localStorage.getItem('galui_api_key') || 'YOUR_KEY'
  const snippetTag = `<script src="${api.base()}/galui.js?key=${apiKey}" async></script>`
  const debugTag = `<script src="${api.base()}/galui.js?key=${apiKey}&debug=1" async></script>`

  return (
    <div className="flex col gap-24" style={{ maxWidth: 760 }}>
      <PageHeader
        title="Install the Snippet"
        subtitle="One script tag. Your site becomes AI-readable, WebMCP-compliant, and analytics-enabled."
      />

      {/* Step 1 */}
      <div className="card flex col gap-16">
        <div className="flex center gap-14">
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>1</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Add the script to your site's <code>&lt;head&gt;</code></div>
            <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>Works on any site — WordPress, Webflow, custom HTML, React, anything.</div>
          </div>
        </div>
        <div className="code-block">
          {snippetTag}
          <div className="copy-btn-abs"><CopyBtn text={snippetTag} /></div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          Replace <code>YOUR_KEY</code> with your tenant key. Create one in the <strong>Tenants</strong> tab.
        </div>
      </div>

      {/* What it does */}
      <div className="card flex col gap-16">
        <div style={{ fontWeight: 700, fontSize: 14 }}>What happens automatically when the snippet loads</div>
        {[
          { icon: '🔍', title: 'Page analysis', desc: 'Detects page type, extracts headings, CTAs, forms, schema.org markup, and the full readable text of every page — then pushes it to your registry.' },
          { icon: '🤖', title: 'WebMCP tool registration', desc: 'WebMCP (W3C standard, Chrome Feb 2026) lets browser-based AI agents call your site\'s forms and interactions directly. The snippet auto-registers forms as WebMCP tools via navigator.modelContext — no backend changes needed.' },
          { icon: '📡', title: 'AI agent detection', desc: 'Identifies 30+ AI crawlers by User-Agent (GPTBot, ClaudeBot, PerplexityBot, Gemini, Applebot…) and logs each visit — agent name, page, timestamp — to your analytics dashboard.' },
          { icon: '🔗', title: 'Discovery link injection', desc: 'Injects <link> tags in your <head> pointing to your llms.txt, ai-plugin.json, and canonical URL — so AI crawlers scanning your HTML immediately find the machine-readable endpoints.' },
          { icon: '📄', title: 'Auto JSON-LD schema', desc: 'If your page has no structured data, the snippet injects Organization + WebSite + WebPage schema.org markup — improving AI entity recognition and AI Overview eligibility.' },
          { icon: '♻️', title: 'Smart content hashing', desc: 'Hashes page content on every load. Only re-indexes when content actually changes — zero redundant API calls, no performance impact.' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="flex gap-14">
            <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1, marginTop: 2 }}>{icon}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* What gets generated */}
      <div className="card flex col gap-14">
        <div style={{ fontWeight: 700, fontSize: 14 }}>What gets generated for your domain</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
          Once installed, these URLs are live and served automatically by Galui:
        </div>
        {[
          { label: 'llms.txt', url: `${api.base()}/registry/YOUR_DOMAIN/llms.txt`, what: 'Plain-text file LLMs read at inference time — lists your site\'s key pages and capabilities in a format every AI understands.' },
          { label: 'AI Plugin manifest', url: `${api.base()}/registry/YOUR_DOMAIN/ai-plugin.json`, what: 'OpenAI-compatible manifest at /.well-known/ai-plugin.json — tells ChatGPT and AI agents what tools your site exposes.' },
          { label: 'JSON registry', url: `${api.base()}/registry/YOUR_DOMAIN`, what: 'Full structured data: capabilities, pricing, integrations, WebMCP tools — machine-readable by any AI system.' },
          { label: 'AI Readiness Score', url: `${api.base()}/api/v1/score/YOUR_DOMAIN`, what: '0–100 score with dimension breakdown and improvement suggestions. Updates automatically when content changes.' },
          { label: 'Embeddable badge', url: `${api.base()}/api/v1/score/YOUR_DOMAIN/badge`, what: 'SVG badge you can add to your README or website showing your current AI Readiness Score.' },
        ].map(({ label, url, what }) => (
          <div key={label} style={{ borderLeft: '3px solid var(--accent)', paddingLeft: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 5, lineHeight: 1.5 }}>{what}</div>
            <code style={{ fontSize: 10, color: 'var(--accent2)', background: 'var(--border)', padding: '2px 8px', borderRadius: 4 }}>{url}</code>
          </div>
        ))}
      </div>

      {/* Debug mode */}
      <div className="card flex col gap-12">
        <div style={{ fontWeight: 700, fontSize: 14 }}>Debug mode</div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          Add <code>debug=1</code> to see detailed logs in your browser console while testing.
        </div>
        <div className="code-block">
          {debugTag}
          <div className="copy-btn-abs"><CopyBtn text={debugTag} /></div>
        </div>
      </div>

      {/* Verify */}
      <div className="card flex col gap-12">
        <div style={{ fontWeight: 700, fontSize: 14 }}>Verify installation</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>After installing, these URLs should return data for your domain:</div>
        {[
          [`${api.base()}/registry/YOUR_DOMAIN`, 'Full JSON registry'],
          [`${api.base()}/registry/YOUR_DOMAIN/llms.txt`, 'LLM-readable text'],
          [`${api.base()}/api/v1/score/YOUR_DOMAIN`, 'AI Readiness Score (0–100)'],
          [`${api.base()}/api/v1/score/YOUR_DOMAIN/badge`, 'Embeddable SVG badge'],
        ].map(([url, label]) => (
          <div key={url} className="info-row">
            <span className="info-row-label">{label}</span>
            <code style={{ fontSize: 11 }}>{url}</code>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Registries ────────────────────────────────────────────────────────────────
function RegistriesPage() {
  const [registries, setRegistries] = useState([])
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [tab, setTab] = useState('overview')
  const [llmsTxt, setLlmsTxt] = useState('')

  const load = useCallback(() => {
    api.listRegistries().then(r => setRegistries(r.registries || [])).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  const select = async (domain) => {
    setSelected(domain); setDetail(null); setLlmsTxt(''); setTab('overview')
    try { setDetail(await api.getRegistry(domain)) } catch (err) { toast.error(err.message) }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, height: 'calc(100vh - 54px - 48px)' }}>
      {/* Sidebar */}
      <div className="card flex col gap-4" style={{ overflow: 'auto', padding: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', padding: '4px 8px 4px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {registries.length} site{registries.length !== 1 ? 's' : ''}
        </div>
        {registries.length === 0 && (
          <div style={{ color: 'var(--muted)', fontSize: 12, padding: '8px 8px 4px', lineHeight: 1.6 }}>No registries yet.<br />Index a site first.</div>
        )}
        {registries.map(r => (
          <button key={r.domain} onClick={() => select(r.domain)} style={{
            background: selected === r.domain ? 'var(--border)' : 'none',
            color: selected === r.domain ? 'var(--text)' : 'var(--muted)',
            padding: '8px 10px', borderRadius: 8, textAlign: 'left', width: '100%',
            fontSize: 12, fontFamily: 'monospace', transition: 'all 0.12s',
          }}>{r.domain}</button>
        ))}
      </div>

      {/* Detail */}
      <div style={{ overflow: 'auto' }}>
        {!selected && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', flexDirection: 'column', gap: 14, padding: 40 }}>
            <div style={{ fontSize: 32, opacity: 0.3 }}>▦</div>
            <div style={{ fontSize: 14, textAlign: 'center' }}>Select a domain from the list</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', maxWidth: 340, lineHeight: 1.7 }}>
              A <strong style={{ color: 'var(--subtle)' }}>registry</strong> is Galui's structured representation of your site — capabilities, pricing, integrations, and WebMCP tools — served as JSON, llms.txt, and an AI plugin manifest that AI systems can read directly.
            </div>
          </div>
        )}
        {selected && !detail && (
          <div className="flex center gap-12" style={{ padding: 40, color: 'var(--muted)' }}>
            <span className="spinner" /> Loading…
          </div>
        )}
        {detail && (
          <div className="flex col gap-12">
            {/* Header */}
            <div className="card flex center between gap-16 wrap" style={{ padding: '16px 20px' }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{detail.metadata.name}</div>
                <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 3, maxWidth: 500 }}>{detail.metadata.description}</div>
              </div>
              <div className="flex gap-8 center wrap">
                <ConfBar score={detail.ai_metadata.confidence_score} />
                <button className="btn btn-ghost btn-sm" onClick={() => api.refreshRegistry(selected).then(() => toast.info('Re-crawl queued')).catch(e => toast.error(e.message))}>
                  ↻ Refresh
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => {
                  if (confirm(`Delete registry for ${selected}?`))
                    api.deleteRegistry(selected).then(() => { toast.success(`Deleted ${selected}`); setSelected(null); setDetail(null); load() }).catch(e => toast.error(e.message))
                }}>
                  Delete
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs" style={{ marginBottom: 0 }}>
              {['overview', 'capabilities', 'pricing', 'integration', 'llms.txt', 'raw json'].map(t => (
                <button key={t} className={`tab ${tab === t ? 'active' : ''}`}
                  onClick={() => { setTab(t); if (t === 'llms.txt' && !llmsTxt) api.getLlmsTxt(selected).then(setLlmsTxt) }}>
                  {t}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {tab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="card flex col gap-10">
                  <div className="label">Service info</div>
                  {[['Domain', detail.domain], ['Category', detail.metadata.category], ['Industry', detail.metadata.sub_categories?.join(', ')], ['Founded', detail.metadata.founded_year], ['HQ', detail.metadata.headquarters], ['Size', detail.metadata.company_size]].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="info-row">
                      <span className="info-row-label">{k}</span>
                      <span className="info-row-value" style={{ fontSize: 13 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div className="card flex col gap-10">
                  <div className="label">WebMCP status</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 4 }}>
                    WebMCP (W3C, Chrome 2026) lets AI agents call your site's forms and actions directly. Requires the Galui snippet.
                  </div>
                  <div className="flex between center">
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>Status</span>
                    <span className={`badge ${detail.ai_metadata.webmcp_enabled ? 'badge-green' : 'badge-gray'}`}>
                      {detail.ai_metadata.webmcp_enabled ? '✓ Active' : '○ Snippet not installed'}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-row-label">Tools registered</span>
                    <span className="info-row-value" style={{ fontSize: 13 }}>{detail.ai_metadata.webmcp_tools_count || 0}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-row-label">Forms exposed</span>
                    <span className="info-row-value" style={{ fontSize: 13 }}>{detail.ai_metadata.forms_exposed || 0}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-row-label">Last updated</span>
                    <span className="info-row-value" style={{ fontSize: 13 }}>{new Date(detail.last_updated).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="card flex col gap-10" style={{ gridColumn: '1/-1' }}>
                  <div className="label">Machine-readable endpoints</div>
                  {[['JSON registry', detail.ai_metadata.registry_url], ['llms.txt', detail.ai_metadata.llms_txt_url], ['AI Plugin manifest', detail.ai_metadata.ai_plugin_url]].map(([label, url]) => (
                    <div key={label} className="info-row">
                      <span className="info-row-label">{label}</span>
                      <div className="flex center gap-8">
                        <code style={{ fontSize: 11 }}>{url}</code>
                        <CopyBtn text={url} />
                        <a href={url} target="_blank" style={{ fontSize: 12 }}>↗</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'capabilities' && (
              <div className="flex col gap-10">
                {detail.capabilities.length === 0
                  ? <div className="card" style={{ color: 'var(--muted)', fontSize: 13, padding: 24 }}>No capabilities extracted.</div>
                  : detail.capabilities.map(cap => (
                    <div key={cap.id} className="card capability">
                      <div className="flex between center wrap gap-8" style={{ marginBottom: cap.description ? 8 : 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{cap.name}</div>
                        <span className="badge badge-blue">{cap.category}</span>
                      </div>
                      {cap.description && <div style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.5, marginBottom: 8 }}>{cap.description}</div>}
                      {cap.use_cases?.length > 0 && (
                        <div className="flex wrap gap-6">
                          {cap.use_cases.map(u => <span key={u} style={{ fontSize: 11, color: 'var(--subtle)', background: 'var(--border)', padding: '2px 8px', borderRadius: 4 }}>{u}</span>)}
                        </div>
                      )}
                    </div>
                  ))
                }
              </div>
            )}

            {tab === 'pricing' && (
              <div className="card flex col gap-14">
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  {[['Model', detail.pricing.model], ['Free tier', detail.pricing.has_free_tier ? 'Yes' : 'No'], ['Contact sales', detail.pricing.contact_sales_required ? 'Required' : 'Not required']].map(([k, v]) => (
                    <div key={k}><div className="label">{k}</div><div style={{ fontWeight: 600 }}>{v}</div></div>
                  ))}
                </div>
                {detail.pricing.tiers?.length > 0 && (
                  <table className="table">
                    <thead><tr><th>Plan</th><th>Price</th><th>Unit</th><th>Notes</th></tr></thead>
                    <tbody>{detail.pricing.tiers.map((t, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{t.name}</td>
                        <td>{t.contact_sales ? 'Contact sales' : t.price_per_unit != null ? `${t.currency} ${t.price_per_unit}` : '—'}</td>
                        <td style={{ color: 'var(--muted)' }}>{t.unit || '—'}</td>
                        <td style={{ color: 'var(--muted)', fontSize: 12 }}>{t.description || ''}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
              </div>
            )}

            {tab === 'integration' && (
              <div className="card flex col gap-12">
                {[['Base URL', detail.integration.api_base_url], ['Version', detail.integration.api_version], ['Auth methods', detail.integration.auth_methods?.join(', ')], ['Webhooks', detail.integration.webhooks_supported ? 'Supported' : 'Not documented']].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="info-row">
                    <span className="info-row-label">{k}</span>
                    <code style={{ fontSize: 12 }}>{v}</code>
                  </div>
                ))}
              </div>
            )}

            {tab === 'llms.txt' && (
              <div className="card flex col gap-12">
                <div className="flex between center">
                  <div style={{ fontWeight: 600, fontSize: 13 }}>llms.txt</div>
                  <CopyBtn text={llmsTxt} />
                </div>
                {!llmsTxt && <div className="flex center gap-8"><span className="spinner" /><span style={{ color: 'var(--muted)' }}>Loading…</span></div>}
                {llmsTxt && <pre>{llmsTxt}</pre>}
              </div>
            )}

            {tab === 'raw json' && (
              <div className="card flex col gap-12">
                <div className="flex between center">
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Raw JSON</div>
                  <CopyBtn text={JSON.stringify(detail, null, 2)} />
                </div>
                <pre>{JSON.stringify(detail, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ConfBar({ score }) {
  const pct = Math.round((score || 0) * 100)
  const color = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)'
  return (
    <div className="flex center gap-8" style={{ fontSize: 12, color: 'var(--muted)' }}>
      <div className="conf-bar"><div className="conf-fill" style={{ width: `${pct}%`, background: color }} /></div>
      <span style={{ color }}>{pct}% confidence</span>
    </div>
  )
}

// ── Tenants ───────────────────────────────────────────────────────────────────
function TenantsPage() {
  const [tenants, setTenants] = useState([])
  const [form, setForm] = useState({ name: '', email: '', plan: 'free' })
  const [loading, setLoading] = useState(false)
  const [newKey, setNewKey] = useState(null)

  const load = useCallback(() => {
    api.listTenants().then(r => setTenants(r.tenants || [])).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  const create = async (e) => {
    e.preventDefault(); setLoading(true); setNewKey(null)
    try {
      const res = await api.createTenant(form.name, form.email, form.plan)
      setNewKey(res.api_key)
      toast.success(`Tenant created: ${form.email}`)
      setForm({ name: '', email: '', plan: 'free' })
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const planBadge = { enterprise: 'badge-blue', pro: 'badge-green', free: 'badge-gray' }

  return (
    <div className="flex col gap-24">
      <PageHeader title="Tenants" subtitle="Manage API keys and plans for your users." />

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Create form */}
        <div className="card flex col gap-16">
          <div style={{ fontWeight: 700, fontSize: 14 }}>Create new tenant</div>
          <form onSubmit={create} className="flex col gap-14">
            <div>
              <label className="label">Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Acme Corp" required />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@acme.com" required />
            </div>
            <div>
              <label className="label">Plan</label>
              <select value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}>
                <option value="free">Free — 3 sites, 10 req/min</option>
                <option value="pro">Pro — 50 sites, 60 req/min</option>
                <option value="enterprise">Enterprise — unlimited</option>
              </select>
            </div>
            <button className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Creating…</> : 'Create tenant'}
            </button>
          </form>

          {newKey && (
            <div style={{ background: '#10b98110', border: '1px solid #10b98130', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700, marginBottom: 8 }}>
                ✓ API key — save this now, it won't be shown again
              </div>
              <code style={{ fontSize: 11, wordBreak: 'break-all', display: 'block', marginBottom: 8 }}>{newKey}</code>
              <CopyBtn text={newKey} label="Copy key" />
            </div>
          )}
        </div>

        {/* Tenant list */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Plan</th>
                <th>Sites</th>
                <th>Requests</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>No tenants yet</td></tr>
              )}
              {tenants.map(t => (
                <tr key={t.api_key}>
                  <td style={{ fontWeight: 500 }}>{t.email}</td>
                  <td style={{ color: 'var(--muted)' }}>{t.name}</td>
                  <td><span className={`badge ${planBadge[t.plan] || 'badge-gray'}`}>{t.plan}</span></td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{t.domains_limit}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{t.requests_total}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{t.last_seen ? new Date(t.last_seen).toLocaleDateString() : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Settings ──────────────────────────────────────────────────────────────────
function SettingsPage() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('galui_api_key') || '')
  const [apiUrl, setApiUrl] = useState(localStorage.getItem('galui_api_url') || '')
  const [testing, setTesting] = useState(false)
  const [status, setStatus] = useState(null)

  // Show what's actually being used (including defaults)
  const effectiveUrl = apiUrl || api.base()
  const effectiveKey = apiKey || 'kotleryan1984 (default)'

  const save = () => {
    if (apiKey) localStorage.setItem('galui_api_key', apiKey)
    else localStorage.removeItem('galui_api_key')
    if (apiUrl) localStorage.setItem('galui_api_url', apiUrl)
    else localStorage.removeItem('galui_api_url')
    toast.success('Settings saved')
    setStatus(null)
  }

  const reset = () => {
    localStorage.removeItem('galui_api_key')
    localStorage.removeItem('galui_api_url')
    setApiKey(''); setApiUrl('')
    toast.info('Reset to defaults')
    setStatus(null)
  }

  const test = async () => {
    setTesting(true); setStatus(null)
    try {
      const url = apiUrl || api.base()
      const key = apiKey || 'kotleryan1984'
      const h = await fetch(`${url}/health`, { headers: { 'X-API-Key': key } }).then(r => r.json())
      setStatus({ ok: true, msg: `✓ Connected — ${h.registries_indexed} sites indexed · Anthropic ${h.anthropic_configured ? 'ready' : 'not configured'}` })
    } catch (e) {
      setStatus({ ok: false, msg: `✗ Connection failed: ${e.message}` })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="flex col gap-24" style={{ maxWidth: 580 }}>
      <PageHeader title="Settings" subtitle="Override the default API connection if needed." />

      {/* Current connection — always visible */}
      <div className="card flex col gap-12" style={{ background: 'var(--surface2)', borderColor: 'var(--border2)' }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>Current connection</div>
        <div className="info-row">
          <span className="info-row-label">API URL</span>
          <code style={{ fontSize: 12 }}>{effectiveUrl}</code>
        </div>
        <div className="info-row">
          <span className="info-row-label">API Key</span>
          <code style={{ fontSize: 12 }}>{effectiveKey}</code>
        </div>
        <div>
          <button className="btn btn-ghost btn-sm" onClick={test} disabled={testing}>
            {testing ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Testing…</> : 'Test connection'}
          </button>
        </div>
        {status && (
          <div style={{
            padding: '9px 13px', borderRadius: 7, fontSize: 13,
            background: status.ok ? '#10b98110' : '#ef444410',
            border: `1px solid ${status.ok ? '#10b98130' : '#ef444430'}`,
            color: status.ok ? 'var(--green)' : 'var(--red)',
          }}>
            {status.msg}
          </div>
        )}
      </div>

      {/* Override — collapsed/advanced */}
      <div className="card flex col gap-16">
        <div style={{ fontWeight: 700, fontSize: 13 }}>Override defaults</div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          Leave blank to use auto-detected defaults. Only fill these in if you're running your own Galui backend.
        </div>
        <div>
          <label className="label">Custom API URL</label>
          <input value={apiUrl} onChange={e => setApiUrl(e.target.value)} placeholder={api.base()} />
        </div>
        <div>
          <label className="label">Custom API Key</label>
          <input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Leave blank for default" type="password" />
        </div>
        <div className="flex gap-10">
          <button className="btn btn-primary btn-sm" onClick={save}>Save overrides</button>
          <button className="btn btn-ghost btn-sm" onClick={reset}>Reset to defaults</button>
        </div>
      </div>

      {/* API reference */}
      <div className="card flex col gap-12">
        <div style={{ fontWeight: 700, fontSize: 13 }}>API reference</div>
        {[
          ['Snippet',        'GET /galui.js?key=YOUR_KEY'],
          ['Index a site',   'POST /api/v1/ingest'],
          ['AI Score',       'GET /api/v1/score/{domain}'],
          ['Badge SVG',      'GET /api/v1/score/{domain}/badge'],
          ['Analytics',      'GET /api/v1/analytics/{domain}'],
          ['JSON registry',  'GET /registry/{domain}'],
          ['llms.txt',       'GET /registry/{domain}/llms.txt'],
          ['AI Plugin',      'GET /registry/{domain}/ai-plugin.json'],
          ['Interactive docs','GET /docs'],
        ].map(([label, endpoint]) => (
          <div key={label} className="info-row">
            <span className="info-row-label">{label}</span>
            <code style={{ fontSize: 11 }}>{endpoint}</code>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── App root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState('overview')
  const [health, setHealth] = useState(null)

  useEffect(() => {
    api.health().then(setHealth).catch(() => {})
  }, [])

  const pages = {
    overview:   <OverviewPage setPage={setPage} />,
    ingest:     <IngestPage />,
    score:      <ScorePage />,
    analytics:  <AnalyticsPage setPage={setPage} />,
    registries: <RegistriesPage />,
    snippet:    <SnippetPage />,
    tenants:    <TenantsPage />,
    settings:   <SettingsPage />,
  }

  return (
    <>
      <Nav page={page} setPage={setPage} health={health} />
      <main style={{
        padding: '28px 32px',
        maxWidth: page === 'registries' ? '100%' : 1080,
        margin: '0 auto',
      }}>
        {pages[page]}
      </main>
      <ToastContainer />
    </>
  )
}
