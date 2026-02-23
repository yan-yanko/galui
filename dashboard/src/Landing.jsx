import { useState, useEffect, useRef } from 'react'

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : window.location.origin

async function scanSite(url) {
  const res = await fetch(`${API_BASE}/api/v1/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': 'kotleryan1984' },
    body: JSON.stringify({ url, force_refresh: false }),
  })
  if (!res.ok) throw new Error('Scan failed')
  return res.json()
}

async function pollJob(jobId) {
  const res = await fetch(`${API_BASE}/api/v1/jobs/${jobId}`, {
    headers: { 'X-API-Key': 'kotleryan1984' },
  })
  return res.json()
}

async function getScore(domain) {
  const res = await fetch(`${API_BASE}/api/v1/score/${domain}`, {
    headers: { 'X-API-Key': 'kotleryan1984' },
  })
  return res.json()
}

async function getRegistry(domain) {
  const res = await fetch(`${API_BASE}/registry/${domain}`, {
    headers: { 'X-API-Key': 'kotleryan1984' },
  })
  return res.json()
}

// ── Landing page ──────────────────────────────────────────────────────────────
export function LandingPage({ onScanComplete }) {
  const [url, setUrl] = useState('')
  const [stage, setStage] = useState('idle') // idle | scanning | done | error
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef()

  const STAGES = [
    'Crawling your pages…',
    'Running AI analysis (4 passes)…',
    'Extracting capabilities…',
    'Calculating AI Readiness Score…',
    'Almost done…',
  ]

  const handleScan = async (e) => {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return

    // normalize URL
    const fullUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`

    setStage('scanning')
    setProgress(0)
    setStatusText(STAGES[0])
    setError('')

    try {
      const job = await scanSite(fullUrl)
      const domain = job.domain

      if (job.status === 'complete') {
        // cached — load immediately
        setProgress(100)
        setStatusText('Loading results…')
        const [score, registry] = await Promise.all([getScore(domain), getRegistry(domain)])
        setStage('done')
        onScanComplete({ domain, score, registry })
        return
      }

      // poll with animated progress
      let stageIdx = 0
      let fakeProgress = 5
      const interval = setInterval(async () => {
        try {
          const updated = await pollJob(job.job_id)

          // advance fake progress
          const targetProgress = { crawling: 25, comprehending: 65, storing: 88 }[updated.status] || fakeProgress
          fakeProgress = Math.min(fakeProgress + 3, targetProgress)
          setProgress(Math.round(fakeProgress))

          // advance status text
          const newStageIdx = { crawling: 0, comprehending: 1, storing: 3 }[updated.status] ?? stageIdx
          if (newStageIdx !== stageIdx) { stageIdx = newStageIdx; setStatusText(STAGES[stageIdx]) }

          if (updated.status === 'complete') {
            clearInterval(interval)
            setProgress(95)
            setStatusText('Loading results…')
            const [score, registry] = await Promise.all([getScore(domain), getRegistry(domain)])
            setProgress(100)
            setStage('done')
            onScanComplete({ domain, score, registry })
          } else if (updated.status === 'failed') {
            clearInterval(interval)
            throw new Error(updated.error || 'Scan failed')
          }
        } catch (err) {
          clearInterval(interval)
          setStage('error')
          setError(err.message)
        }
      }, 1200)

    } catch (err) {
      setStage('error')
      setError(err.message)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#0f0f1a', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px', height: 64, borderBottom: '1px solid #e8e8f0', position: 'sticky', top: 0, background: '#ffffffee', backdropFilter: 'blur(12px)', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, fontSize: 20, color: '#6366f1', letterSpacing: '-0.5px' }}>
          <span style={{ fontSize: 22 }}>⬡</span> galui
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a href="/dashboard/" style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, color: '#64648a', textDecoration: 'none', fontWeight: 500 }}>Dashboard</a>
          <a href="/dashboard/" style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, background: '#6366f1', color: 'white', textDecoration: 'none', fontWeight: 700, boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}>Get started free</a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '88px 32px 72px' }}>

        {/* Eyebrow */}
        <p style={{ fontSize: 13, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 20 }}>
          AI Readability is Galui
        </p>

        {/* Title */}
        <h1 style={{ fontSize: 'clamp(38px, 5.5vw, 64px)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-2px', marginBottom: 24, color: '#0a0a14' }}>
          Make your website<br />
          <span style={{ color: '#6366f1' }}>visible to AI.</span>
        </h1>

        {/* Explainer */}
        <p style={{ fontSize: 18, color: '#64648a', lineHeight: 1.7, maxWidth: 540, marginBottom: 40, fontWeight: 400 }}>
          ChatGPT, Claude, and Perplexity are replacing Google. Websites that aren't AI-readable are already losing traffic. Galui fixes this automatically — one line of code.
        </p>

        {/* 3 benefits */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 44 }}>
          {[
            { icon: '✓', label: 'Affordable.', detail: 'From $49/year, free scan, no credit card required' },
            { icon: '✓', label: 'Effortless.', detail: 'One line of code for full AI readability — automated' },
            { icon: '✓', label: 'Visible.', detail: 'All major LLMs will find, read, and recommend your site' },
          ].map(({ icon, label, detail }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 16 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#6366f115', border: '1.5px solid #6366f140', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', fontWeight: 900, fontSize: 13, flexShrink: 0 }}>
                {icon}
              </div>
              <span>
                <strong style={{ color: '#0a0a14' }}>{label}</strong>{' '}
                <span style={{ color: '#64648a' }}>{detail}</span>
              </span>
            </div>
          ))}
        </div>

        {/* CTA — scan form */}
        {stage === 'idle' && (
          <form onSubmit={handleScan} style={{ display: 'flex', gap: 10, maxWidth: 560, flexWrap: 'wrap' }}>
            <input
              ref={inputRef}
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="yourwebsite.com"
              style={{
                flex: 1, minWidth: 220,
                padding: '14px 20px', borderRadius: 10,
                border: '1.5px solid #d0d0e0',
                background: '#ffffff', color: '#0a0a14', fontSize: 15,
                outline: 'none', fontFamily: 'inherit',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}
            />
            <button type="submit" style={{
              padding: '14px 28px', borderRadius: 10,
              background: '#6366f1', color: 'white',
              fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
            }}>
              Scan my site free →
            </button>
          </form>
        )}

        {/* Error */}
        {stage === 'error' && (
          <div style={{ maxWidth: 520 }}>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '14px 18px', color: '#dc2626', marginBottom: 14, fontSize: 14 }}>
              {error}
            </div>
            <button onClick={() => setStage('idle')} style={{ padding: '12px 24px', borderRadius: 10, background: '#6366f1', color: 'white', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>
              Try again
            </button>
          </div>
        )}

        {/* Scanning */}
        {stage === 'scanning' && (
          <div style={{ maxWidth: 500 }}>
            <div style={{ background: '#f8f8ff', border: '1.5px solid #e0e0f0', borderRadius: 14, padding: '28px 32px' }}>
              <div style={{ fontSize: 13, color: '#64648a', marginBottom: 14, fontWeight: 500 }}>
                Scanning <strong style={{ color: '#6366f1' }}>{url}</strong>
              </div>
              <div style={{ background: '#e8e8f8', borderRadius: 8, height: 8, overflow: 'hidden', marginBottom: 14 }}>
                <div style={{
                  height: '100%', borderRadius: 8,
                  background: 'linear-gradient(90deg, #6366f1, #a78bfa)',
                  width: `${progress}%`, transition: 'width 0.6s ease',
                  boxShadow: '0 0 8px rgba(99,102,241,0.4)',
                }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#9898b8', marginBottom: 20 }}>
                <div style={{ width: 13, height: 13, border: '2px solid #c7c7e0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.65s linear infinite', flexShrink: 0 }} />
                {statusText}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Crawling pages', done: progress > 20 },
                  { label: 'AI comprehension (4 passes)', done: progress > 60 },
                  { label: 'Extracting capabilities', done: progress > 75 },
                  { label: 'Calculating AI Readiness Score', done: progress > 90 },
                ].map(({ label, done }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: done ? '#10b981' : '#c0c0d8', transition: 'color 0.4s', fontWeight: done ? 600 : 400 }}>
                    <span style={{ fontSize: 14 }}>{done ? '✓' : '○'}</span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <p style={{ fontSize: 12, color: '#b0b0c8', marginTop: 18 }}>
          Free scan · No credit card · Results in ~60 seconds
        </p>
      </div>

      {/* ── AI agents strip ── */}
      <div style={{ borderTop: '1px solid #e8e8f0', borderBottom: '1px solid #e8e8f0', padding: '20px 48px', background: '#fafaff' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#b0b0c8', textTransform: 'uppercase', letterSpacing: '1px', flexShrink: 0 }}>
            Visible to
          </span>
          {['ChatGPT', 'Claude', 'Perplexity', 'Gemini', 'Bing AI', 'WebMCP Agents'].map(name => (
            <span key={name} style={{ fontSize: 14, color: '#64648a', fontWeight: 700 }}>{name}</span>
          ))}
        </div>
      </div>

      {/* ── How it works ── */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '80px 32px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 34, fontWeight: 900, marginBottom: 10, letterSpacing: '-0.5px', color: '#0a0a14' }}>How it works</h2>
        <p style={{ textAlign: 'center', color: '#64648a', fontSize: 15, marginBottom: 52 }}>Three steps to full AI visibility</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
          {[
            { step: '01', title: 'Scan your site', desc: 'Enter your URL. Our AI pipeline crawls your site, extracts every capability, and gives you an AI Readiness Score in under 2 minutes.', icon: '🔍' },
            { step: '02', title: 'Install one line', desc: 'Add a single <script> tag to your site\'s <head>. We handle WebMCP registration, llms.txt generation, and AI agent detection automatically.', icon: '</>' },
            { step: '03', title: 'Get discovered', desc: 'Your site is now readable and actionable by every major AI agent. Your score updates in real time as you improve.', icon: '🤖' },
          ].map(({ step, title, desc, icon }) => (
            <div key={step} style={{ background: '#f8f8ff', border: '1px solid #e8e8f0', borderRadius: 16, padding: '28px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 22 }}>{icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1px' }}>Step {step}</span>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 10, color: '#0a0a14' }}>{title}</h3>
              <p style={{ fontSize: 13, color: '#64648a', lineHeight: 1.7 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features grid ── */}
      <div style={{ background: '#f8f8ff', borderTop: '1px solid #e8e8f0', borderBottom: '1px solid #e8e8f0', padding: '72px 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 34, fontWeight: 900, marginBottom: 10, letterSpacing: '-0.5px', color: '#0a0a14' }}>Everything included. Zero configuration.</h2>
          <p style={{ textAlign: 'center', color: '#64648a', fontSize: 15, marginBottom: 48 }}>One script tag unlocks all of this</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {[
              ['🎯', 'AI Readiness Score', '0–100 score across 5 dimensions with actionable suggestions'],
              ['📡', 'AI Agent Analytics', 'See which AI crawlers visit your site and what they read'],
              ['⬡', 'WebMCP Auto-Setup', 'World-first automatic WebMCP tool registration via snippet'],
              ['📄', 'llms.txt Generation', 'Auto-generated machine-readable description of your site'],
              ['🔌', 'AI Plugin Manifest', 'OpenAI-compatible plugin manifest, generated automatically'],
              ['🔄', 'Smart Auto-refresh', 'Detects page changes and re-indexes only what changed'],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{ background: '#ffffff', border: '1px solid #e8e8f0', borderRadius: 12, padding: '20px 18px' }}>
                <span style={{ fontSize: 22, display: 'block', marginBottom: 10 }}>{icon}</span>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: '#0a0a14' }}>{title}</div>
                <div style={{ fontSize: 12, color: '#64648a', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom CTA ── */}
      <div style={{ textAlign: 'center', padding: '80px 32px' }}>
        <h2 style={{ fontSize: 38, fontWeight: 900, letterSpacing: '-1px', marginBottom: 14, color: '#0a0a14' }}>
          Ready to be found by AI?
        </h2>
        <p style={{ color: '#64648a', fontSize: 16, marginBottom: 36 }}>Free scan. See your AI Readiness Score in 60 seconds.</p>
        <form onSubmit={handleScan} style={{ display: 'flex', gap: 10, maxWidth: 480, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="yourwebsite.com"
            style={{ flex: 1, minWidth: 200, padding: '13px 18px', borderRadius: 10, border: '1.5px solid #d0d0e0', background: '#fff', color: '#0a0a14', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
          />
          <button type="submit" style={{ padding: '13px 24px', borderRadius: 10, background: '#6366f1', color: 'white', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
            Get free scan →
          </button>
        </form>
        <p style={{ fontSize: 12, color: '#b0b0c8', marginTop: 14 }}>From $49/year · Cancel anytime</p>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #e8e8f0', padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#6366f1' }}>⬡ galui</div>
        <div style={{ fontSize: 12, color: '#b0b0c8' }}>© 2026 Galui · Make every website AI-readable</div>
        <a href="/dashboard/" style={{ fontSize: 12, color: '#64648a', textDecoration: 'none' }}>Dashboard →</a>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}

// ── Results page (blurred until registered) ────────────────────────────────────
export function ResultsPage({ data, onRegistered }) {
  const { domain, score, registry } = data
  const [showModal, setShowModal] = useState(true)
  const [registered, setRegistered] = useState(() => !!localStorage.getItem('galui_user'))
  const [form, setForm] = useState({ name: '', email: '' })
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState('form') // form | confirm

  const gradeColor = score.total >= 70 ? '#10b981' : score.total >= 50 ? '#f59e0b' : '#ef4444'

  const handleRegister = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    // Simulate email confirmation delay
    await new Promise(r => setTimeout(r, 900))
    localStorage.setItem('galui_user', JSON.stringify({ name: form.name, email: form.email, registered_at: new Date().toISOString() }))
    setStep('confirm')
    setSubmitting(false)
  }

  const handleConfirm = () => {
    setRegistered(true)
    setShowModal(false)
  }

  const dimLabels = { content_coverage: 'Content Coverage', structure_quality: 'Structure Quality', freshness: 'Freshness', webmcp_compliance: 'WebMCP', output_formats: 'Output Formats' }
  const dimColors = { content_coverage: '#818cf8', structure_quality: '#10b981', freshness: '#3b82f6', webmcp_compliance: '#8b5cf6', output_formats: '#f59e0b' }

  return (
    <div style={{ minHeight: '100vh', background: '#06060f', color: '#e8e8f8', fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px', height: 60, borderBottom: '1px solid #1c1c2e', background: '#06060fdd', backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 18, color: '#818cf8' }}>
          <span style={{ fontSize: 22 }}>⬡</span> galui
        </div>
        <div style={{ fontSize: 13, color: '#64648a' }}>AI Readiness Report for <strong style={{ color: '#818cf8' }}>{domain}</strong></div>
      </nav>

      {/* Results content — blurred when not registered */}
      <div style={{ position: 'relative' }}>
        <div style={{ filter: registered ? 'none' : 'blur(6px)', pointerEvents: registered ? 'auto' : 'none', transition: 'filter 0.4s', userSelect: registered ? 'auto' : 'none' }}>
          <div style={{ maxWidth: 820, margin: '0 auto', padding: '48px 32px' }}>

            {/* Score hero */}
            <div style={{ background: '#0f0f1a', border: `1px solid ${gradeColor}40`, borderRadius: 20, padding: '36px 40px', marginBottom: 24, display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
              <ScoreRingLanding score={score.total} size={130} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.3px' }}>{score.label}</div>
                <div style={{ color: '#64648a', marginBottom: 12 }}>{domain}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ background: '#6366f120', border: '1px solid #6366f130', color: '#818cf8', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Score: {score.total}/100</span>
                  <span style={{ background: `${gradeColor}15`, border: `1px solid ${gradeColor}30`, color: gradeColor, padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Grade: {score.grade}</span>
                  <span style={{ background: '#ffffff08', border: '1px solid #252538', color: '#9898b8', padding: '3px 12px', borderRadius: 20, fontSize: 12 }}>{registry.metadata?.category || 'website'}</span>
                </div>
              </div>
            </div>

            {/* Score breakdown */}
            <div style={{ background: '#0f0f1a', border: '1px solid #1c1c2e', borderRadius: 16, padding: '24px 28px', marginBottom: 24 }}>
              <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Score breakdown</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {Object.entries(score.dimensions || {}).map(([key, dim]) => (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ fontWeight: 500 }}>{dimLabels[key] || key}</span>
                      <span style={{ color: '#64648a' }}>{dim.score}/{dim.max}</span>
                    </div>
                    <div style={{ background: '#1c1c2e', borderRadius: 4, height: 7 }}>
                      <div style={{ height: 7, borderRadius: 4, background: dimColors[key] || '#818cf8', width: `${(dim.score / dim.max) * 100}%`, transition: 'width 0.6s' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Capabilities */}
            {registry.capabilities?.length > 0 && (
              <div style={{ background: '#0f0f1a', border: '1px solid #1c1c2e', borderRadius: 16, padding: '24px 28px', marginBottom: 24 }}>
                <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>What AI agents now know about {domain}</h3>
                <p style={{ fontSize: 13, color: '#64648a', marginBottom: 20 }}>{registry.capabilities.length} capabilities extracted</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {registry.capabilities.map((cap, i) => (
                    <div key={i} style={{ borderLeft: '3px solid #6366f1', paddingLeft: 14, paddingTop: 4, paddingBottom: 4 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{cap.name}</div>
                      <div style={{ fontSize: 13, color: '#64648a', lineHeight: 1.5 }}>{cap.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {score.suggestions?.length > 0 && (
              <div style={{ background: '#0f0f1a', border: '1px solid #1c1c2e', borderRadius: 16, padding: '24px 28px', marginBottom: 24 }}>
                <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>How to improve your score</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {score.suggestions.map((s, i) => {
                    const color = { high: '#ef4444', medium: '#f59e0b', low: '#64648a' }[s.priority]
                    return (
                      <div key={i} style={{ background: '#13131f', border: '1px solid #1c1c2e', borderLeft: `3px solid ${color}`, borderRadius: 10, padding: '12px 16px' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{s.priority} · {s.dimension}</div>
                        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{s.issue}</div>
                        <div style={{ fontSize: 12, color: '#64648a', lineHeight: 1.5 }}>{s.fix}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* CTA — install snippet (only after registered) */}
            {registered && (
              <div style={{ background: 'linear-gradient(135deg, #13102a, #0f0f1a)', border: '1px solid #6366f140', borderRadius: 16, padding: '28px 32px', textAlign: 'center' }}>
                <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>Make {domain} AI-readable in 30 seconds</h3>
                <p style={{ color: '#64648a', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
                  Add one script tag to your site. Galui handles everything else — WebMCP registration,<br />
                  llms.txt generation, AI agent detection, and real-time score updates.
                </p>
                <div style={{ background: '#070710', border: '1px solid #252538', borderRadius: 10, padding: '14px 20px', fontFamily: 'monospace', fontSize: 13, color: '#a5b4fc', marginBottom: 20, textAlign: 'left', position: 'relative' }}>
                  {`<script src="${API_BASE}/galui.js?key=YOUR_KEY" async></script>`}
                </div>
                <a href="/dashboard/" style={{ display: 'inline-block', padding: '12px 28px', background: '#6366f1', color: 'white', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}>
                  Get your snippet key →
                </a>
                <div style={{ fontSize: 12, color: '#3a3a5c', marginTop: 12 }}>Snippet access requires a plan — starts at $19/mo</div>
              </div>
            )}
          </div>
        </div>

        {/* Registration overlay */}
        {!registered && showModal && (
          <div style={{
            position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(6,6,15,0.7)', backdropFilter: 'blur(4px)', zIndex: 50, padding: 24,
          }}>
            <div style={{ background: '#0f0f1a', border: '1px solid #252538', borderRadius: 20, padding: '40px 44px', maxWidth: 440, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}>

              {step === 'form' && (
                <>
                  {/* Score teaser */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, padding: '14px 18px', background: '#13131f', borderRadius: 12, border: '1px solid #1c1c2e' }}>
                    <ScoreRingLanding score={score.total} size={56} />
                    <div>
                      <div style={{ fontSize: 13, color: '#64648a', marginBottom: 2 }}>Your AI Readiness Score for</div>
                      <div style={{ fontWeight: 700, color: '#818cf8', fontSize: 14 }}>{domain}</div>
                    </div>
                  </div>

                  <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.3px' }}>
                    Your report is ready
                  </h2>
                  <p style={{ color: '#64648a', fontSize: 13, lineHeight: 1.6, marginBottom: 28 }}>
                    Create your free account to see the full breakdown, capabilities, and improvement suggestions.
                  </p>

                  <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <input
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Your name"
                      required
                      style={{ padding: '11px 16px', borderRadius: 9, border: '1px solid #252538', background: '#13131f', color: '#e8e8f8', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
                    />
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="Work email"
                      required
                      style={{ padding: '11px 16px', borderRadius: 9, border: '1px solid #252538', background: '#13131f', color: '#e8e8f8', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
                    />
                    <button type="submit" disabled={submitting} style={{ padding: '12px', borderRadius: 9, background: '#6366f1', color: 'white', fontWeight: 700, fontSize: 14, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      {submitting
                        ? <><div style={{ width: 14, height: 14, border: '2px solid white40', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.65s linear infinite' }} /> Creating account…</>
                        : 'See my full report →'}
                    </button>
                  </form>

                  <p style={{ fontSize: 11, color: '#3a3a5c', marginTop: 14, textAlign: 'center' }}>
                    Free forever for 1 site · No credit card required
                  </p>
                </>
              )}

              {step === 'confirm' && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 20 }}>📬</div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Check your inbox</h2>
                  <p style={{ color: '#64648a', fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
                    We sent a confirmation to <strong style={{ color: '#818cf8' }}>{form.email}</strong>.
                    Click the link to unlock your full report.
                  </p>
                  {/* In demo, skip email confirmation */}
                  <button onClick={handleConfirm} style={{ padding: '12px 28px', borderRadius: 10, background: '#6366f1', color: 'white', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', marginBottom: 12 }}>
                    I confirmed my email →
                  </button>
                  <div style={{ fontSize: 12, color: '#3a3a5c' }}>
                    Didn't get it? <button onClick={handleConfirm} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 12 }}>Skip for now</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Score ring (self-contained, no shared CSS) ────────────────────────────────
function ScoreRingLanding({ score, size = 80 }) {
  const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F'
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : score >= 40 ? '#f59e0b' : '#ef4444'
  const r = size / 2 - 7
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1c1c2e" strokeWidth={7} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.22, fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: size * 0.15, color: '#64648a', marginTop: 2 }}>{grade}</span>
      </div>
    </div>
  )
}
