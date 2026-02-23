import { useState, useEffect, useCallback, useRef } from 'react'
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
const toast = { success: m => _addToast(m,'success'), error: m => _addToast(m,'error'), info: m => _addToast(m,'info') }

// ── Shared components ──────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    operational: ['badge-green','Operational'], complete: ['badge-green','Complete'],
    degraded: ['badge-yellow','Degraded'],      outage: ['badge-red','Outage'],
    unreachable: ['badge-red','Unreachable'],   failed: ['badge-red','Failed'],
    crawling: ['badge-blue','Crawling'],         comprehending: ['badge-blue','Comprehending'],
    storing: ['badge-blue','Storing'],           pending: ['badge-gray','Pending'],
    unknown: ['badge-gray','Unknown'],
  }
  const [cls, label] = map[status] || ['badge-gray', status]
  return <span className={`badge ${cls}`}>{label}</span>
}

function ScoreRing({ score, size = 80 }) {
  const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F'
  const color = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--blue)' : score >= 40 ? 'var(--yellow)' : 'var(--red)'
  const r = size / 2 - 6
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={6} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.22, fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: size * 0.14, color: 'var(--muted)', marginTop: 1 }}>{grade}</span>
      </div>
    </div>
  )
}

function ConfBar({ score }) {
  const pct = Math.round((score || 0) * 100)
  const color = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)'
  return (
    <div className="flex center gap-8">
      <div className="conf-bar"><div className="conf-fill" style={{ width: `${pct}%`, background: color }} /></div>
      <span style={{ color, fontSize: 12, fontWeight: 600 }}>{pct}%</span>
    </div>
  )
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),1500) }}>
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

function MiniBar({ value, max, color }) {
  const pct = Math.round((value / (max || 1)) * 100)
  return (
    <div style={{ background: 'var(--border)', borderRadius: 3, height: 6, flex: 1 }}>
      <div style={{ height: 6, borderRadius: 3, background: color || 'var(--accent2)', width: `${pct}%`, transition: 'width 0.4s' }} />
    </div>
  )
}

// ── Nav ─────────────────────────────────────────────────────────────────────
function Nav({ page, setPage, health }) {
  const links = [
    { id: 'overview',   label: '◎ Overview'   },
    { id: 'analytics',  label: '◉ Analytics'  },
    { id: 'score',      label: '◈ AI Score'   },
    { id: 'snippet',    label: '⟨/⟩ Snippet'  },
    { id: 'registries', label: '▦ Registries' },
    { id: 'ingest',     label: '↓ Ingest'     },
    { id: 'tenants',    label: '⊞ Tenants'    },
    { id: 'settings',   label: '⚙ Settings'   },
  ]
  return (
    <nav style={{ background:'var(--surface)', borderBottom:'1px solid var(--border)', padding:'0 28px',
      display:'flex', alignItems:'center', gap:4, height:52, position:'sticky', top:0, zIndex:10 }}>
      <div style={{ fontWeight:800, fontSize:15, color:'var(--accent2)', letterSpacing:'-0.5px', marginRight:16, flexShrink:0 }}>
        ⬡ galui
      </div>
      <div className="flex gap-2" style={{ flex:1, overflowX:'auto' }}>
        {links.map(l => (
          <button key={l.id} onClick={() => setPage(l.id)} style={{
            background: page===l.id ? 'var(--border)' : 'none',
            color: page===l.id ? 'var(--text)' : 'var(--muted)',
            padding:'4px 10px', borderRadius:6, fontWeight:page===l.id?600:400,
            fontSize:12, whiteSpace:'nowrap', flexShrink:0,
          }}>{l.label}</button>
        ))}
      </div>
      {health && (
        <div className="flex center gap-12" style={{ fontSize:11, color:'var(--muted)', flexShrink:0 }}>
          <div className="flex center gap-6">
            <span className={`dot dot-${health.anthropic_configured?'green':'red'}`}/>
            <span>Anthropic</span>
          </div>
          <div className="flex center gap-6">
            <span className="dot dot-green"/>
            <span>{health.registries_indexed} sites</span>
          </div>
        </div>
      )}
    </nav>
  )
}

// ── Overview page ────────────────────────────────────────────────────────────
function OverviewPage({ setPage }) {
  const [stats, setStats] = useState(null)
  const [health, setHealth] = useState(null)
  const [registries, setRegistries] = useState([])
  const [scores, setScores] = useState({})

  useEffect(() => {
    api.getStats().then(setStats).catch(()=>{})
    api.health().then(setHealth).catch(()=>{})
    api.listRegistries().then(r => {
      const regs = r.registries || []
      setRegistries(regs)
      // load scores for all indexed sites
      regs.forEach(r => {
        api.getScore(r.domain).then(s => setScores(prev => ({ ...prev, [r.domain]: s }))).catch(()=>{})
      })
    }).catch(()=>{})
  }, [])

  const hasData = registries.length > 0

  return (
    <div className="flex col gap-24">
      <div>
        <h1 style={{ fontSize:26, fontWeight:800 }}>Overview</h1>
        <p style={{ color:'var(--muted)', marginTop:4, fontSize:14 }}>
          Galui makes your website instantly readable by AI agents and LLMs.
        </p>
      </div>

      {/* HERO: first-time empty state → index your site */}
      {!hasData && (
        <div className="card flex col gap-20" style={{ borderColor:'var(--accent2)', borderWidth:2, padding:32, textAlign:'center', alignItems:'center' }}>
          <div style={{ fontSize:40 }}>🚀</div>
          <div>
            <h2 style={{ fontWeight:800, fontSize:20, marginBottom:8 }}>Index your first site</h2>
            <p style={{ color:'var(--muted)', fontSize:14, maxWidth:460 }}>
              Enter your website URL below to crawl it, extract structured data for AI agents, and get your AI Readiness Score.
            </p>
          </div>
          <button className="btn btn-primary" style={{ fontSize:15, padding:'10px 28px' }} onClick={()=>setPage('ingest')}>
            → Index a site now
          </button>
        </div>
      )}

      {/* Indexed sites with scores */}
      {hasData && (
        <div className="flex col gap-12">
          <div className="flex between center">
            <h3 style={{ fontWeight:700, fontSize:15 }}>Your indexed sites</h3>
            <button className="btn btn-primary btn-sm" onClick={()=>setPage('ingest')}>+ Index another site</button>
          </div>
          {registries.map(r => {
            const s = scores[r.domain]
            return (
              <div key={r.domain} className="card flex center gap-20 wrap" style={{ padding:'16px 20px' }}>
                {s ? <ScoreRing score={s.total} size={64}/> : (
                  <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span className="spinner"/>
                  </div>
                )}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontFamily:'monospace', fontSize:15, color:'var(--accent2)' }}>{r.domain}</div>
                  {s && (
                    <div style={{ color:'var(--muted)', fontSize:13, marginTop:4 }}>
                      {s.label} · Grade {s.grade} · {s.total}/100
                    </div>
                  )}
                  {s?.suggestions?.[0] && (
                    <div style={{ fontSize:12, color:'var(--yellow)', marginTop:4 }}>
                      ↑ {s.suggestions[0].fix}
                    </div>
                  )}
                </div>
                <div className="flex gap-8 wrap">
                  <button className="btn btn-ghost btn-sm" onClick={()=>setPage('score')}>Score details</button>
                  <button className="btn btn-ghost btn-sm" onClick={()=>setPage('analytics')}>Analytics</button>
                  <button className="btn btn-ghost btn-sm" onClick={()=>setPage('snippet')}>Install snippet</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Stats row — only when there's data */}
      {hasData && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12 }}>
          {[
            { label:'Sites indexed',      value: stats?.registries_indexed ?? registries.length, color:'var(--accent2)' },
            { label:'Jobs completed',     value: stats?.jobs?.complete ?? '—',   color:'var(--green)'   },
            { label:'AI traffic domains', value: health?.domains_with_ai_traffic ?? '—', color:'var(--blue)' },
            { label:'Jobs failed',        value: stats?.jobs?.failed ?? 0,       color:'var(--red)'     },
          ].map(c => (
            <div key={c.label} className="stat-card">
              <div className="stat-value" style={{ color:c.color }}>{c.value}</div>
              <div className="stat-label">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Install snippet CTA */}
      {hasData && (
        <div className="card flex col gap-12" style={{ background:'#1e293b' }}>
          <div className="flex between center wrap gap-12">
            <div>
              <h3 style={{ fontWeight:700, fontSize:14 }}>Install the snippet to unlock AI traffic analytics</h3>
              <p style={{ color:'var(--muted)', fontSize:13, marginTop:4 }}>
                Drop one script tag on your site → get live AI agent tracking + auto WebMCP registration.
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={()=>setPage('snippet')}>View install guide →</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Analytics page ───────────────────────────────────────────────────────────
const AGENT_COLORS = {
  'GPTBot':'#10b981','ChatGPT':'#10b981','OpenAI Search':'#10b981',
  'ClaudeBot':'#f59e0b','Claude Web':'#f59e0b','Anthropic':'#f59e0b',
  'PerplexityBot':'#3b82f6','Perplexity':'#3b82f6',
  'Gemini':'#8b5cf6','Google Extended':'#8b5cf6',
  'BingBot':'#06b6d4','WebMCP Agent':'#ec4899',
}

function AnalyticsPage() {
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
    }).catch(()=>{})
  }, [])

  useEffect(() => {
    if (!selected) return
    setLoading(true)
    Promise.all([
      api.getAnalytics(selected, days),
      api.getAgentBreakdown(selected, days),
      api.getPageBreakdown(selected, days),
    ]).then(([s, a, p]) => {
      setSummary(s); setAgents(a.agents||[]); setPages(p.pages||[])
    }).catch(()=>{
      setSummary({ total_ai_hits:0, unique_agents:0, top_agents:[], daily_trend:[] })
    }).finally(()=>setLoading(false))
  }, [selected, days])

  const maxHits = agents.length > 0 ? Math.max(...agents.map(a=>a.hits)) : 1

  return (
    <div className="flex col gap-24">
      <div className="flex between center wrap gap-12">
        <div>
          <h1 style={{ fontSize:26, fontWeight:800 }}>AI Traffic Analytics</h1>
          <p style={{ color:'var(--muted)', marginTop:4, fontSize:14 }}>Which AI agents are visiting your site and what they read</p>
        </div>
        <div className="flex gap-12 center">
          <select value={selected} onChange={e=>setSelected(e.target.value)} style={{ padding:'6px 10px', fontSize:13 }}>
            {registries.map(r=><option key={r.domain} value={r.domain}>{r.domain}</option>)}
          </select>
          <select value={days} onChange={e=>setDays(Number(e.target.value))} style={{ padding:'6px 10px', fontSize:13 }}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {loading && <div className="flex center gap-12" style={{ padding:32, color:'var(--muted)' }}><span className="spinner"/> Loading…</div>}

      {!loading && summary && (
        <>
          {/* Summary cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12 }}>
            {[
              { label:'Total AI hits',    value:summary.total_ai_hits,   color:'var(--accent2)' },
              { label:'Unique agents',    value:summary.unique_agents,   color:'var(--green)'   },
              { label:'Top agent',        value:summary.top_agents?.[0]?.agent_name||'—', color:'var(--blue)' },
              { label:'Top page hits',    value:summary.top_pages?.[0]?.hits||'—', color:'var(--yellow)' },
            ].map(c=>(
              <div key={c.label} className="stat-card">
                <div className="stat-value" style={{ color:c.color, fontSize:22 }}>{c.value}</div>
                <div className="stat-label">{c.label}</div>
              </div>
            ))}
          </div>

          {summary.total_ai_hits === 0 ? (
            <div className="card" style={{ textAlign:'center', padding:48, color:'var(--muted)' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>📡</div>
              <div style={{ fontWeight:600, marginBottom:8 }}>No AI traffic yet</div>
              <div style={{ fontSize:13 }}>
                Install the snippet on <strong>{selected}</strong> to start tracking AI agent visits.
              </div>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              {/* Agent breakdown */}
              <div className="card flex col gap-16">
                <h3 style={{ fontWeight:700, fontSize:14 }}>Agent breakdown</h3>
                {agents.length === 0
                  ? <div style={{ color:'var(--muted)', fontSize:13 }}>No agent data</div>
                  : agents.map(a => (
                    <div key={a.agent_name} className="flex center gap-12">
                      <div style={{
                        width:10, height:10, borderRadius:'50%', flexShrink:0,
                        background: AGENT_COLORS[a.agent_name]||'var(--muted)'
                      }}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div className="flex between" style={{ fontSize:13, marginBottom:4 }}>
                          <span style={{ fontWeight:500 }}>{a.agent_name}</span>
                          <span style={{ color:'var(--muted)' }}>{a.hits} hits</span>
                        </div>
                        <MiniBar value={a.hits} max={maxHits} color={AGENT_COLORS[a.agent_name]||'var(--muted)'} />
                      </div>
                      <span style={{ fontSize:11, color:'var(--muted)', flexShrink:0 }}>{a.agent_type}</span>
                    </div>
                  ))
                }
              </div>

              {/* Top pages */}
              <div className="card flex col gap-12">
                <h3 style={{ fontWeight:700, fontSize:14 }}>Most visited pages</h3>
                {pages.length === 0
                  ? <div style={{ color:'var(--muted)', fontSize:13 }}>No page data</div>
                  : pages.slice(0,8).map((p,i) => (
                    <div key={p.page_url} className="flex center gap-12" style={{ fontSize:12 }}>
                      <span style={{ color:'var(--muted)', width:16, flexShrink:0 }}>{i+1}</span>
                      <span style={{ flex:1, color:'var(--accent2)', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {p.page_url.replace(/^https?:\/\/[^/]+/, '') || '/'}
                      </span>
                      <span style={{ color:'var(--muted)', flexShrink:0 }}>{p.total_hits}×</span>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* Daily trend */}
          {summary.daily_trend && summary.daily_trend.length > 0 && (
            <div className="card flex col gap-12">
              <h3 style={{ fontWeight:700, fontSize:14 }}>Daily AI traffic trend</h3>
              <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:80 }}>
                {(() => {
                  const maxVal = Math.max(...summary.daily_trend.map(d=>d.hits), 1)
                  return summary.daily_trend.map(d => (
                    <div key={d.day} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                      <div style={{
                        width:'100%', background:'var(--accent2)',
                        height: `${(d.hits/maxVal)*64}px`, borderRadius:'3px 3px 0 0',
                        minHeight:2, opacity:0.8, transition:'height 0.3s'
                      }} title={`${d.day}: ${d.hits} hits`}/>
                      <span style={{ fontSize:9, color:'var(--muted)', transform:'rotate(-45deg)', transformOrigin:'center', whiteSpace:'nowrap' }}>
                        {d.day.slice(5)}
                      </span>
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

// ── Score page ────────────────────────────────────────────────────────────────
function ScorePage() {
  const [registries, setRegistries] = useState([])
  const [selected, setSelected] = useState('')
  const [score, setScore] = useState(null)
  const [loading, setLoading] = useState(false)
  const [badgeTab, setBadgeTab] = useState('preview')

  useEffect(() => {
    api.listRegistries().then(r => {
      const regs = r.registries||[]
      setRegistries(regs)
      if (regs.length > 0) { setSelected(regs[0].domain); _loadScore(regs[0].domain) }
    }).catch(()=>{})
  }, [])

  const _loadScore = (domain) => {
    setLoading(true); setScore(null)
    api.getScore(domain).then(setScore).catch(()=>{}).finally(()=>setLoading(false))
  }

  const dimLabels = {
    content_coverage: 'Content Coverage',
    structure_quality: 'Structure Quality',
    freshness: 'Freshness',
    webmcp_compliance: 'WebMCP Compliance',
    output_formats: 'Output Formats',
  }

  const dimColors = {
    content_coverage: 'var(--accent2)',
    structure_quality: 'var(--green)',
    freshness: 'var(--blue)',
    webmcp_compliance: 'var(--purple, #8b5cf6)',
    output_formats: 'var(--yellow)',
  }

  const priorityColor = { high:'var(--red)', medium:'var(--yellow)', low:'var(--muted)' }

  return (
    <div className="flex col gap-24">
      <div className="flex between center wrap gap-12">
        <div>
          <h1 style={{ fontSize:26, fontWeight:800 }}>AI Readiness Score</h1>
          <p style={{ color:'var(--muted)', marginTop:4, fontSize:14 }}>How ready is your site for AI agents and LLMs?</p>
        </div>
        <select value={selected} onChange={e=>{ setSelected(e.target.value); _loadScore(e.target.value) }}
          style={{ padding:'6px 10px', fontSize:13 }}>
          {registries.map(r=><option key={r.domain} value={r.domain}>{r.domain}</option>)}
        </select>
      </div>

      {loading && <div className="flex center gap-12" style={{ padding:32, color:'var(--muted)' }}><span className="spinner"/>Loading score…</div>}

      {!loading && score && (
        <>
          {/* Score hero */}
          <div className="card flex center gap-32 wrap">
            <ScoreRing score={score.total} size={120} />
            <div className="flex col gap-8" style={{ flex:1, minWidth:200 }}>
              <div style={{ fontSize:24, fontWeight:800 }}>{score.label}</div>
              <div style={{ color:'var(--muted)', fontSize:14 }}>{selected}</div>
              <div className="flex gap-8 wrap" style={{ marginTop:8 }}>
                <span className="badge badge-blue">Score: {score.total}/100</span>
                <span className="badge badge-gray">Grade: {score.grade}</span>
              </div>
              <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>
                Last calculated: {new Date(score.calculated_at).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Dimension breakdown */}
          <div className="card flex col gap-16">
            <h3 style={{ fontWeight:700, fontSize:14 }}>Score breakdown</h3>
            {Object.entries(score.dimensions||{}).map(([key, dim]) => (
              <div key={key} className="flex col gap-6">
                <div className="flex between" style={{ fontSize:13 }}>
                  <span style={{ fontWeight:500 }}>{dimLabels[key]||key}</span>
                  <span style={{ color:'var(--muted)' }}>{dim.score}/{dim.max}</span>
                </div>
                <div style={{ background:'var(--border)', borderRadius:4, height:8 }}>
                  <div style={{
                    height:8, borderRadius:4, background:dimColors[key]||'var(--accent2)',
                    width:`${(dim.score/dim.max)*100}%`, transition:'width 0.5s'
                  }}/>
                </div>
                {/* Dimension details */}
                {key === 'webmcp_compliance' && (
                  <div className="flex gap-12" style={{ fontSize:11, color:'var(--muted)' }}>
                    <span>{dim.webmcp_enabled ? '✓ WebMCP active' : '○ WebMCP pending'}</span>
                    <span>{dim.tools_registered} tools registered</span>
                    <span>{dim.forms_exposed} forms exposed</span>
                  </div>
                )}
                {key === 'freshness' && dim.age_days !== null && (
                  <div style={{ fontSize:11, color:'var(--muted)' }}>
                    Last updated {dim.age_days} day{dim.age_days!==1?'s':''} ago
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Suggestions */}
          {score.suggestions && score.suggestions.length > 0 && (
            <div className="card flex col gap-12">
              <h3 style={{ fontWeight:700, fontSize:14 }}>Improvement suggestions</h3>
              {score.suggestions.map((s, i) => (
                <div key={i} style={{ borderLeft:`3px solid ${priorityColor[s.priority]||'var(--muted)'}`, paddingLeft:12 }}>
                  <div className="flex center gap-8" style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>
                    <span style={{ color:priorityColor[s.priority] }}>{s.priority.toUpperCase()}</span>
                    <span style={{ color:'var(--muted)' }}>·</span>
                    <span>{s.dimension}</span>
                    <span style={{ color:'var(--muted)' }}>·</span>
                    <span style={{ color:'var(--muted)', fontWeight:400 }}>{s.issue}</span>
                  </div>
                  <div style={{ fontSize:12, color:'var(--muted)' }}>{s.fix}</div>
                </div>
              ))}
            </div>
          )}

          {/* Badge */}
          <div className="card flex col gap-16">
            <h3 style={{ fontWeight:700, fontSize:14 }}>Embeddable badge</h3>
            <div className="tabs">
              {['preview','html','markdown'].map(t=>(
                <button key={t} className={`tab ${badgeTab===t?'active':''}`} onClick={()=>setBadgeTab(t)}>{t}</button>
              ))}
            </div>
            {badgeTab === 'preview' && (
              <div className="flex col gap-12">
                <img src={api.getBadgeUrl(selected)} alt="AI Readiness Badge" style={{ height:28 }} />
                <div style={{ fontSize:12, color:'var(--muted)' }}>
                  Live badge — updates automatically as your score changes.
                </div>
              </div>
            )}
            {badgeTab === 'html' && (
              <div>
                <pre style={{ fontSize:12 }}>{`<a href="${api.base()}/api/v1/score/${selected}" target="_blank">\n  <img src="${api.getBadgeUrl(selected)}" alt="AI-Ready" />\n</a>`}</pre>
                <CopyBtn text={`<a href="${api.base()}/api/v1/score/${selected}" target="_blank"><img src="${api.getBadgeUrl(selected)}" alt="AI-Ready" /></a>`} />
              </div>
            )}
            {badgeTab === 'markdown' && (
              <div>
                <pre style={{ fontSize:12 }}>{`[![AI-Ready](${api.getBadgeUrl(selected)})](${api.base()}/api/v1/score/${selected})`}</pre>
                <CopyBtn text={`[![AI-Ready](${api.getBadgeUrl(selected)})](${api.base()}/api/v1/score/${selected})`} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Snippet page ──────────────────────────────────────────────────────────────
function SnippetPage() {
  const [tenantKey, setTenantKey] = useState(localStorage.getItem('galui_api_key') || 'YOUR_KEY')
  const snippetTag = `<script src="${api.base()}/galui.js?key=${tenantKey}" async></script>`

  return (
    <div className="flex col gap-24" style={{ maxWidth:760 }}>
      <div>
        <h1 style={{ fontSize:26, fontWeight:800 }}>Install the Snippet</h1>
        <p style={{ color:'var(--muted)', marginTop:4, fontSize:14 }}>
          One script tag. Your site becomes AI-readable in minutes.
        </p>
      </div>

      {/* Step 1 */}
      <div className="card flex col gap-16">
        <div className="flex center gap-12">
          <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--accent2)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, flexShrink:0 }}>1</div>
          <h3 style={{ fontWeight:700 }}>Add the script to your site's &lt;head&gt;</h3>
        </div>
        <div style={{ background:'#0f172a', borderRadius:8, padding:'16px 20px', fontFamily:'monospace', fontSize:13, color:'#e2e8f0', position:'relative' }}>
          {snippetTag}
          <div style={{ position:'absolute', top:10, right:10 }}><CopyBtn text={snippetTag}/></div>
        </div>
        <div style={{ fontSize:13, color:'var(--muted)' }}>
          Replace <code>YOUR_KEY</code> with your tenant API key. Get one in the <strong>Tenants</strong> tab.
        </div>
      </div>

      {/* What it does */}
      <div className="card flex col gap-16">
        <h3 style={{ fontWeight:700 }}>What galui.js does automatically</h3>
        {[
          ['🔍', 'Page analysis', 'Detects page type, extracts headings, CTAs, forms, schema.org, and clean text content'],
          ['🤖', 'WebMCP tools', 'Registers your forms and interactions as WebMCP tools for Chrome AI agents (navigator.modelContext)'],
          ['📡', 'AI agent detection', 'Identifies AI crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.) and logs them for your analytics'],
          ['🔗', 'Discovery links', 'Injects <link rel="llms"> and <link rel="ai-plugin"> in your <head> for automatic discovery'],
          ['♻️', 'Smart updates', 'Only re-processes pages when content changes (SHA-256 hash comparison)'],
          ['📊', 'Score feedback', 'Returns your AI Readiness Score on every page load so you see improvements in real-time'],
        ].map(([icon, title, desc]) => (
          <div key={title} className="flex gap-16">
            <span style={{ fontSize:20, flexShrink:0 }}>{icon}</span>
            <div>
              <div style={{ fontWeight:600, fontSize:13, marginBottom:4 }}>{title}</div>
              <div style={{ fontSize:12, color:'var(--muted)' }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Debug mode */}
      <div className="card flex col gap-12">
        <h3 style={{ fontWeight:700 }}>Debug mode</h3>
        <div style={{ background:'#0f172a', borderRadius:8, padding:'14px 18px', fontFamily:'monospace', fontSize:13, color:'#e2e8f0' }}>
          {`<script src="${api.base()}/galui.js?key=${tenantKey}&debug=1" async></script>`}
        </div>
        <div style={{ fontSize:12, color:'var(--muted)' }}>
          Add <code>debug=1</code> to see detailed logs in your browser console.
        </div>
      </div>

      {/* Verify */}
      <div className="card flex col gap-12">
        <h3 style={{ fontWeight:700 }}>Verify installation</h3>
        <div style={{ fontSize:13, color:'var(--muted)' }}>After installing the snippet, check these URLs are returning data:</div>
        {[
          [`${api.base()}/registry/YOUR_DOMAIN`, 'Full JSON registry'],
          [`${api.base()}/registry/YOUR_DOMAIN/llms.txt`, 'LLM-readable text'],
          [`${api.base()}/api/v1/score/YOUR_DOMAIN`, 'AI Readiness Score'],
        ].map(([url, label]) => (
          <div key={url} className="flex center between" style={{ fontSize:12 }}>
            <span style={{ color:'var(--muted)' }}>{label}</span>
            <code style={{ color:'var(--accent2)' }}>{url}</code>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Registries page ───────────────────────────────────────────────────────────
function RegistriesPage() {
  const [registries, setRegistries] = useState([])
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [tab, setTab] = useState('overview')
  const [llmsTxt, setLlmsTxt] = useState('')
  const [liveStatus, setLiveStatus] = useState(null)

  const load = useCallback(() => {
    api.listRegistries().then(r=>setRegistries(r.registries||[])).catch(()=>{})
  }, [])
  useEffect(()=>{ load() }, [load])

  const select = async (domain) => {
    setSelected(domain); setDetail(null); setLlmsTxt(''); setLiveStatus(null); setTab('overview')
    try { setDetail(await api.getRegistry(domain)) } catch(err) { toast.error(err.message) }
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'240px 1fr', gap:16, height:'calc(100vh - 52px - 48px)' }}>
      <div className="card flex col gap-6" style={{ overflow:'auto', padding:10 }}>
        <div style={{ fontWeight:600, fontSize:12, color:'var(--muted)', padding:'4px 8px' }}>{registries.length} sites</div>
        {registries.length===0 && <div style={{ color:'var(--muted)', fontSize:13, padding:8 }}>No registries yet.</div>}
        {registries.map(r=>(
          <button key={r.domain} onClick={()=>select(r.domain)} style={{
            background:selected===r.domain?'var(--border)':'none',
            color:selected===r.domain?'var(--text)':'var(--muted)',
            padding:'7px 10px', borderRadius:6, textAlign:'left', width:'100%',
            fontSize:12, fontFamily:'monospace',
          }}>{r.domain}</button>
        ))}
      </div>
      <div style={{ overflow:'auto' }}>
        {!selected && <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--muted)' }}>Select a domain</div>}
        {selected && !detail && <div className="flex center gap-12" style={{ padding:32, color:'var(--muted)' }}><span className="spinner"/> Loading…</div>}
        {detail && (
          <div className="flex col gap-12">
            <div className="card flex center between gap-16 wrap">
              <div>
                <h2 style={{ fontSize:18, fontWeight:700 }}>{detail.metadata.name}</h2>
                <div style={{ color:'var(--muted)', marginTop:4, fontSize:13 }}>{detail.metadata.description}</div>
              </div>
              <div className="flex gap-8 center wrap">
                <ConfBar score={detail.ai_metadata.confidence_score} />
                <button className="btn btn-ghost btn-sm" onClick={()=>api.refreshRegistry(selected).then(()=>toast.info('Re-crawl queued')).catch(e=>toast.error(e.message))}>↻ Refresh</button>
                <button className="btn btn-danger btn-sm" onClick={()=>{ if(confirm(`Delete ${selected}?`)) api.deleteRegistry(selected).then(()=>{ toast.success(`Deleted ${selected}`); setSelected(null); setDetail(null); load() }).catch(e=>toast.error(e.message)) }}>Delete</button>
              </div>
            </div>
            <div className="tabs">
              {['overview','capabilities','pricing','integration','llms.txt','raw json'].map(t=>(
                <button key={t} className={`tab ${tab===t?'active':''}`}
                  onClick={()=>{ setTab(t); if(t==='llms.txt'&&!llmsTxt) api.getLlmsTxt(selected).then(setLlmsTxt) }}>
                  {t}
                </button>
              ))}
            </div>
            {tab==='overview' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div className="card flex col gap-10">
                  <h3 style={{ fontSize:12, fontWeight:600, color:'var(--muted)' }}>Service</h3>
                  {[['Domain',detail.domain],['Category',detail.metadata.category],['Founded',detail.metadata.founded_year],['HQ',detail.metadata.headquarters]].filter(([,v])=>v).map(([k,v])=>(
                    <div key={k} className="flex between" style={{ fontSize:13 }}><span style={{ color:'var(--muted)' }}>{k}</span><span>{v}</span></div>
                  ))}
                </div>
                <div className="card flex col gap-10">
                  <div className="flex between center">
                    <h3 style={{ fontSize:12, fontWeight:600, color:'var(--muted)' }}>WebMCP</h3>
                    <span className={`badge ${detail.ai_metadata.webmcp_enabled?'badge-green':'badge-gray'}`}>
                      {detail.ai_metadata.webmcp_enabled?'Active':'Pending'}
                    </span>
                  </div>
                  <div style={{ fontSize:13 }}>{detail.ai_metadata.webmcp_tools_count} tools registered</div>
                  <div style={{ fontSize:13 }}>{detail.ai_metadata.forms_exposed} forms exposed</div>
                  <div style={{ fontSize:12, color:'var(--muted)' }}>Updated: {new Date(detail.last_updated).toLocaleDateString()}</div>
                </div>
                <div className="card flex col gap-8" style={{ gridColumn:'1/-1' }}>
                  <h3 style={{ fontSize:12, fontWeight:600, color:'var(--muted)', marginBottom:4 }}>Machine-readable endpoints</h3>
                  {[['JSON',detail.ai_metadata.registry_url],['llms.txt',detail.ai_metadata.llms_txt_url],['AI Plugin',detail.ai_metadata.ai_plugin_url]].map(([label,url])=>(
                    <div key={label} className="flex center between" style={{ fontSize:12 }}>
                      <span style={{ color:'var(--muted)', width:70 }}>{label}</span>
                      <code style={{ color:'var(--accent2)', flex:1, fontSize:11 }}>{url}</code>
                      <CopyBtn text={url}/>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {tab==='capabilities' && (
              <div className="flex col gap-10">
                {detail.capabilities.map(cap=>(
                  <div key={cap.id} className="card flex col gap-10">
                    <div className="flex between center wrap gap-8">
                      <div><h3 style={{ fontWeight:600 }}>{cap.name}</h3><p style={{ color:'var(--muted)', fontSize:13, marginTop:4 }}>{cap.description}</p></div>
                      <span className="badge badge-blue">{cap.category}</span>
                    </div>
                    {cap.use_cases?.length>0&&<div className="flex wrap gap-6">{cap.use_cases.map(u=><span key={u} style={{ fontSize:11, color:'var(--muted)', background:'var(--border)', padding:'2px 8px', borderRadius:4 }}>{u}</span>)}</div>}
                  </div>
                ))}
                {detail.capabilities.length===0&&<div style={{ color:'var(--muted)' }}>No capabilities extracted.</div>}
              </div>
            )}
            {tab==='pricing' && (
              <div className="card flex col gap-14">
                <div className="flex wrap gap-16">
                  {[['Model',detail.pricing.model],['Free tier',detail.pricing.has_free_tier?'Yes':'No'],['Contact sales',detail.pricing.contact_sales_required?'Required':'Not required']].map(([k,v])=>(
                    <div key={k}><div className="label">{k}</div><div style={{ fontWeight:600 }}>{v}</div></div>
                  ))}
                </div>
                {detail.pricing.tiers?.length>0&&(
                  <table className="table">
                    <thead><tr><th>Name</th><th>Price</th><th>Unit</th><th>Notes</th></tr></thead>
                    <tbody>{detail.pricing.tiers.map((t,i)=>(
                      <tr key={i}>
                        <td style={{ fontWeight:600 }}>{t.name}</td>
                        <td>{t.contact_sales?'Contact sales':t.price_per_unit!=null?`${t.currency} ${t.price_per_unit}`:'—'}</td>
                        <td style={{ color:'var(--muted)' }}>{t.unit||'—'}</td>
                        <td style={{ color:'var(--muted)', fontSize:12 }}>{t.description||''}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
              </div>
            )}
            {tab==='integration' && (
              <div className="card flex col gap-12">
                {[['Base URL',detail.integration.api_base_url],['Version',detail.integration.api_version],['Auth',detail.integration.auth_methods?.join(', ')],['Webhooks',detail.integration.webhooks_supported?'Supported':'Not documented']].filter(([,v])=>v).map(([k,v])=>(
                  <div key={k} className="flex between gap-16" style={{ fontSize:13 }}>
                    <span style={{ color:'var(--muted)', flexShrink:0 }}>{k}</span>
                    <code style={{ color:'var(--accent2)', fontSize:12 }}>{v}</code>
                  </div>
                ))}
              </div>
            )}
            {tab==='llms.txt' && (
              <div className="card flex col gap-12">
                <div className="flex between center"><h3 style={{ fontSize:13, fontWeight:600 }}>llms.txt</h3><CopyBtn text={llmsTxt}/></div>
                {!llmsTxt&&<div className="flex center gap-8"><span className="spinner"/><span style={{ color:'var(--muted)' }}>Loading…</span></div>}
                {llmsTxt&&<pre style={{ fontSize:12 }}>{llmsTxt}</pre>}
              </div>
            )}
            {tab==='raw json' && (
              <div className="card flex col gap-12">
                <div className="flex between center"><h3 style={{ fontSize:13, fontWeight:600 }}>Raw JSON</h3><CopyBtn text={JSON.stringify(detail,null,2)}/></div>
                <pre style={{ fontSize:11 }}>{JSON.stringify(detail,null,2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Ingest page (crawl-based) ─────────────────────────────────────────────────
function IngestPage() {
  const [url, setUrl] = useState('')
  const [force, setForce] = useState(false)
  const [loading, setLoading] = useState(false)
  const [job, setJob] = useState(null)
  const [polling, setPolling] = useState(false)
  const [result, setResult] = useState(null)   // registry + score after done
  const [loadingResult, setLoadingResult] = useState(false)

  const submit = async (e) => {
    e.preventDefault(); if(!url.trim()) return
    setLoading(true); setJob(null); setResult(null)
    try {
      const res = await api.ingest(url.trim(), force)
      setJob(res)
      if(res.status==='complete') {
        toast.success(`Cached registry for ${res.domain}`)
        loadResult(res.domain)
      } else {
        toast.info(`Indexing started for ${res.domain}`)
        setPolling(true)
      }
    } catch(err) { toast.error(err.message) } finally { setLoading(false) }
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

  useEffect(()=>{
    if(!polling||!job?.job_id||job.job_id==='cached') return
    const i = setInterval(async()=>{
      try {
        const u = await api.pollJob(job.job_id)
        setJob(j=>({...j,...u}))
        if(['complete','failed'].includes(u.status)) {
          setPolling(false)
          if(u.status==='complete') {
            toast.success(`✓ Done! Registry ready for ${job.domain}`)
            loadResult(job.domain)
          } else toast.error(`Failed: ${u.error}`)
        }
      } catch {}
    }, 800)
    return ()=>clearInterval(i)
  }, [polling,job])

  const stageMap = { pending:0, crawling:1, comprehending:2, storing:3, complete:4, failed:4 }
  const priorityColor = { high:'var(--red)', medium:'var(--yellow)', low:'var(--muted)' }

  return (
    <div className="flex col gap-24" style={{ maxWidth:720 }}>
      <div>
        <h1 style={{ fontSize:26, fontWeight:800 }}>Index a site</h1>
        <p style={{ color:'var(--muted)', marginTop:4, fontSize:14 }}>
          Enter any website URL. We'll crawl it, run the AI pipeline, and show you exactly what AI agents will see.
        </p>
      </div>

      <form onSubmit={submit} className="card flex col gap-16">
        <div><label className="label">Website URL</label>
          <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://yoursite.com" disabled={loading||polling}/>
        </div>
        <div className="flex center gap-12">
          <label className="flex center gap-8" style={{ cursor:'pointer', userSelect:'none' }}>
            <input type="checkbox" checked={force} onChange={e=>setForce(e.target.checked)} style={{ width:'auto',cursor:'pointer' }}/>
            <span style={{ color:'var(--muted)', fontSize:13 }}>Force re-crawl</span>
          </label>
          <div className="grow"/>
          <button className="btn btn-primary" disabled={loading||polling||!url.trim()}>
            {loading||polling ? <><span className="spinner"/>Working…</> : '→ Index site'}
          </button>
        </div>
      </form>

      {/* Progress */}
      {job && !['complete','failed'].includes(job.status) && (
        <div className="card flex col gap-16">
          <div className="flex center between">
            <div style={{ fontWeight:600 }}>{job.domain}</div>
            <StatusBadge status={job.status}/>
          </div>
          <div className="flex col gap-10">
            {[
              ['Crawling pages',             1],
              ['AI comprehension (4 passes)', 2],
              ['Building schema',            3],
              ['Storing',                    4],
            ].map(([label, stage]) => {
              const cur = stageMap[job.status] || 0
              const done = cur > stage; const active = cur === stage
              return (
                <div key={label} className="flex center gap-12" style={{ fontSize:13 }}>
                  {done
                    ? <span style={{ color:'var(--green)', width:18 }}>✓</span>
                    : active
                      ? <span className="spinner" style={{ width:14, height:14 }}/>
                      : <span style={{ color:'var(--border)', width:18, textAlign:'center' }}>○</span>}
                  <span style={{ color: active ? 'var(--text)' : done ? 'var(--muted)' : 'var(--border)' }}>{label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Error */}
      {job?.status === 'failed' && (
        <div className="card" style={{ color:'var(--red)', background:'#ef444410', borderColor:'var(--red)' }}>
          {job.error || 'Unknown error'}
        </div>
      )}

      {/* Loading result */}
      {loadingResult && (
        <div className="flex center gap-12" style={{ padding:24, color:'var(--muted)' }}>
          <span className="spinner"/> Loading results…
        </div>
      )}

      {/* ── Results ── */}
      {result && (
        <div className="flex col gap-16">
          {/* Score hero */}
          <div className="card flex center gap-24 wrap" style={{ padding:'20px 24px', borderColor: result.score.total >= 70 ? 'var(--green)' : result.score.total >= 50 ? 'var(--yellow)' : 'var(--red)' }}>
            <ScoreRing score={result.score.total} size={100}/>
            <div className="flex col gap-8" style={{ flex:1 }}>
              <div style={{ fontSize:20, fontWeight:800 }}>{result.score.label}</div>
              <div style={{ color:'var(--muted)', fontSize:13 }}>{result.registry.domain}</div>
              <div style={{ fontSize:13, color:'var(--muted)', marginTop:4 }}>
                {result.registry.metadata.description}
              </div>
            </div>
          </div>

          {/* Score dimensions */}
          <div className="card flex col gap-12">
            <h3 style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>Score breakdown</h3>
            {Object.entries(result.score.dimensions || {}).map(([key, dim]) => {
              const labels = { content_coverage:'Content Coverage', structure_quality:'Structure Quality', freshness:'Freshness', webmcp_compliance:'WebMCP', output_formats:'Output Formats' }
              const colors = { content_coverage:'var(--accent2)', structure_quality:'var(--green)', freshness:'var(--blue)', webmcp_compliance:'var(--purple,#8b5cf6)', output_formats:'var(--yellow)' }
              return (
                <div key={key}>
                  <div className="flex between" style={{ fontSize:13, marginBottom:4 }}>
                    <span style={{ fontWeight:500 }}>{labels[key]||key}</span>
                    <span style={{ color:'var(--muted)' }}>{dim.score}/{dim.max}</span>
                  </div>
                  <div style={{ background:'var(--border)', borderRadius:4, height:7 }}>
                    <div style={{ height:7, borderRadius:4, background:colors[key]||'var(--accent2)', width:`${(dim.score/dim.max)*100}%`, transition:'width 0.5s' }}/>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Capabilities */}
          {result.registry.capabilities?.length > 0 && (
            <div className="card flex col gap-12">
              <h3 style={{ fontWeight:700, fontSize:14 }}>
                What AI agents now know about {result.registry.domain}
              </h3>
              <div style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>
                {result.registry.capabilities.length} capabilities extracted by the AI pipeline
              </div>
              {result.registry.capabilities.map(cap => (
                <div key={cap.id} style={{ borderLeft:'3px solid var(--accent2)', paddingLeft:12, paddingTop:4, paddingBottom:4 }}>
                  <div style={{ fontWeight:600, fontSize:13 }}>{cap.name}</div>
                  <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{cap.description}</div>
                  {cap.use_cases?.length > 0 && (
                    <div className="flex wrap gap-6" style={{ marginTop:6 }}>
                      {cap.use_cases.slice(0,4).map(u => (
                        <span key={u} style={{ fontSize:11, background:'var(--border)', color:'var(--muted)', padding:'2px 7px', borderRadius:4 }}>{u}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {result.score.suggestions?.length > 0 && (
            <div className="card flex col gap-12">
              <h3 style={{ fontWeight:700, fontSize:14 }}>How to improve your score</h3>
              {result.score.suggestions.map((s, i) => (
                <div key={i} style={{ borderLeft:`3px solid ${priorityColor[s.priority]||'var(--muted)'}`, paddingLeft:12 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:priorityColor[s.priority], marginBottom:2 }}>
                    {s.priority.toUpperCase()} · {s.dimension}
                  </div>
                  <div style={{ fontSize:13, marginBottom:2 }}>{s.issue}</div>
                  <div style={{ fontSize:12, color:'var(--muted)' }}>{s.fix}</div>
                </div>
              ))}
            </div>
          )}

          {/* Install snippet CTA */}
          <div className="card flex col gap-12" style={{ background:'#1e293b', borderColor:'var(--accent2)' }}>
            <h3 style={{ fontWeight:700, fontSize:14 }}>Next step: install the snippet</h3>
            <p style={{ color:'var(--muted)', fontSize:13 }}>
              Add this to your site's <code>&lt;head&gt;</code> to unlock AI agent analytics, WebMCP auto-registration, and real-time score updates:
            </p>
            <div style={{ background:'#0f172a', borderRadius:8, padding:'14px 18px', fontFamily:'monospace', fontSize:12, color:'#e2e8f0', position:'relative' }}>
              {`<script src="${api.base()}/galui.js?key=${localStorage.getItem('galui_api_key')||'YOUR_KEY'}" async></script>`}
              <div style={{ position:'absolute', top:8, right:8 }}>
                <CopyBtn text={`<script src="${api.base()}/galui.js?key=${localStorage.getItem('galui_api_key')||'YOUR_KEY'}" async></script>`}/>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tenants page ──────────────────────────────────────────────────────────────
function TenantsPage() {
  const [tenants, setTenants] = useState([])
  const [form, setForm] = useState({ name:'', email:'', plan:'free' })
  const [loading, setLoading] = useState(false)
  const [newKey, setNewKey] = useState(null)
  const load = useCallback(()=>{ api.listTenants().then(r=>setTenants(r.tenants||[])).catch(()=>{}) }, [])
  useEffect(()=>{ load() }, [load])

  const create = async (e) => {
    e.preventDefault(); setLoading(true); setNewKey(null)
    try {
      const res = await api.createTenant(form.name, form.email, form.plan)
      setNewKey(res.api_key); toast.success(`Tenant created: ${form.email}`)
      setForm({ name:'', email:'', plan:'free' }); load()
    } catch(err) { toast.error(err.message) } finally { setLoading(false) }
  }

  return (
    <div className="flex col gap-24">
      <h1 style={{ fontSize:26, fontWeight:800 }}>Tenants</h1>
      <div style={{ display:'grid', gridTemplateColumns:'360px 1fr', gap:20 }}>
        <div className="card flex col gap-16">
          <h3 style={{ fontWeight:700 }}>Create tenant</h3>
          <form onSubmit={create} className="flex col gap-12">
            <div><label className="label">Name</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Acme Corp" required/></div>
            <div><label className="label">Email</label><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="admin@acme.com" required/></div>
            <div><label className="label">Plan</label>
              <select value={form.plan} onChange={e=>setForm(f=>({...f,plan:e.target.value}))}>
                <option value="free">Free (3 sites, 10 req/min)</option>
                <option value="pro">Pro (50 sites, 60 req/min)</option>
                <option value="enterprise">Enterprise (unlimited)</option>
              </select>
            </div>
            <button className="btn btn-primary" disabled={loading}>{loading?<><span className="spinner"/>Creating…</>:'Create tenant'}</button>
          </form>
          {newKey&&(
            <div style={{ background:'#10b98110', border:'1px solid var(--green)', borderRadius:8, padding:14 }}>
              <div style={{ fontSize:12, color:'var(--green)', fontWeight:600, marginBottom:6 }}>API key — save this now</div>
              <code style={{ fontSize:11, wordBreak:'break-all' }}>{newKey}</code>
              <div style={{ marginTop:8 }}><CopyBtn text={newKey}/></div>
            </div>
          )}
        </div>
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table className="table">
            <thead><tr><th>Email</th><th>Name</th><th>Plan</th><th>Sites</th><th>Requests</th><th>Last seen</th></tr></thead>
            <tbody>
              {tenants.length===0&&<tr><td colSpan={6} style={{ textAlign:'center', color:'var(--muted)', padding:32 }}>No tenants yet</td></tr>}
              {tenants.map(t=>(
                <tr key={t.api_key}>
                  <td>{t.email}</td><td style={{ color:'var(--muted)' }}>{t.name}</td>
                  <td><span className={`badge ${t.plan==='enterprise'?'badge-blue':t.plan==='pro'?'badge-green':'badge-gray'}`}>{t.plan}</span></td>
                  <td>{t.domains_limit}</td><td>{t.requests_total}</td>
                  <td style={{ color:'var(--muted)', fontSize:12 }}>{t.last_seen?new Date(t.last_seen).toLocaleDateString():'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Settings page ─────────────────────────────────────────────────────────────
function SettingsPage() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('galui_api_key')||'')
  const [apiUrl, setApiUrl] = useState(localStorage.getItem('galui_api_url')||'http://localhost:8000')
  const save = () => {
    localStorage.setItem('galui_api_key', apiKey)
    localStorage.setItem('galui_api_url', apiUrl)
    toast.success('Settings saved — reload to apply URL change')
  }
  return (
    <div className="flex col gap-24" style={{ maxWidth:520 }}>
      <h1 style={{ fontSize:26, fontWeight:800 }}>Settings</h1>
      <div className="card flex col gap-20">
        <div><label className="label">API URL</label><input value={apiUrl} onChange={e=>setApiUrl(e.target.value)} placeholder="http://localhost:8000"/></div>
        <div>
          <label className="label">API Key (X-API-Key)</label>
          <input value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="Master key or tenant key" type="password"/>
          <p style={{ fontSize:12, color:'var(--muted)', marginTop:6 }}>Stored in localStorage.</p>
        </div>
        <button className="btn btn-primary" style={{ alignSelf:'flex-start' }} onClick={save}>Save settings</button>
      </div>
      <div className="card flex col gap-10">
        <h3 style={{ fontWeight:700, fontSize:14 }}>API quick reference</h3>
        {[
          ['Snippet','GET /galui.js?key=YOUR_KEY'],
          ['Push ingest','POST /api/v1/ingest/push'],
          ['AI Score','GET /api/v1/score/{domain}'],
          ['Badge SVG','GET /api/v1/score/{domain}/badge'],
          ['Analytics','GET /api/v1/analytics/{domain}'],
          ['JSON registry','GET /registry/{domain}'],
          ['llms.txt','GET /registry/{domain}/llms.txt'],
          ['AI Plugin','GET /registry/{domain}/ai-plugin.json'],
        ].map(([label,endpoint])=>(
          <div key={label} style={{ fontSize:12 }}>
            <span style={{ color:'var(--muted)', marginRight:8 }}>{label}</span>
            <code style={{ color:'var(--accent2)' }}>{endpoint}</code>
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
  useEffect(()=>{ api.health().then(setHealth).catch(()=>{}) }, [])

  const pages = {
    overview:   <OverviewPage setPage={setPage}/>,
    analytics:  <AnalyticsPage/>,
    score:      <ScorePage/>,
    snippet:    <SnippetPage/>,
    registries: <RegistriesPage/>,
    ingest:     <IngestPage/>,
    tenants:    <TenantsPage/>,
    settings:   <SettingsPage/>,
  }

  return (
    <>
      <Nav page={page} setPage={setPage} health={health}/>
      <main style={{ padding:'24px 28px', maxWidth:page==='registries'?'100%':1100, margin:'0 auto' }}>
        {pages[page]}
      </main>
      <ToastContainer/>
    </>
  )
}
