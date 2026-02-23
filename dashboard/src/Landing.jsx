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
    <div style={{ minHeight: '100vh', background: '#06060f', color: '#e8e8f8', fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px', height: 60, borderBottom: '1px solid #1c1c2e', position: 'sticky', top: 0, background: '#06060fdd', backdropFilter: 'blur(12px)', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 18, color: '#818cf8', letterSpacing: '-0.5px' }}>
          <span style={{ fontSize: 22 }}>⬡</span> galui
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/dashboard/" style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, color: '#64648a', textDecoration: 'none' }}>Dashboard</a>
          <a href="/dashboard/" style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, background: '#6366f1', color: 'white', textDecoration: 'none', fontWeight: 600 }}>Get started free</a>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '96px 32px 80px', textAlign: 'center' }}>

        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#6366f115', border: '1px solid #6366f130', borderRadius: 20, padding: '5px 14px', fontSize: 12, color: '#818cf8', fontWeight: 600, marginBottom: 28, letterSpacing: '0.3px' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', display: 'inline-block' }} />
          NEW · WebMCP auto-implementation — first in the world
        </div>

        <h1 style={{ fontSize: 'clamp(36px, 6vw, 68px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-2px', marginBottom: 24 }}>
          Is your website{' '}
          <span style={{ background: 'linear-gradient(135deg, #818cf8, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            invisible to AI?
          </span>
        </h1>

        <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: '#9898b8', lineHeight: 1.7, maxWidth: 600, margin: '0 auto 48px', fontWeight: 400 }}>
          As AI replaces search, websites that aren't AI-readable lose traffic, visibility, and customers.
          Galui fixes this automatically — one script tag, zero configuration.
        </p>

        {/* Scan form */}
        {stage === 'idle' && (
          <form onSubmit={handleScan} style={{ display: 'flex', gap: 10, maxWidth: 600, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
            <input
              ref={inputRef}
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="yourwebsite.com"
              style={{
                flex: 1, minWidth: 240,
                padding: '14px 20px', borderRadius: 12, border: '1px solid #252538',
                background: '#0f0f1a', color: '#e8e8f8', fontSize: 15,
                outline: 'none', fontFamily: 'inherit',
              }}
            />
            <button type="submit" style={{
              padding: '14px 28px', borderRadius: 12, background: '#6366f1', color: 'white',
              fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
              transition: 'all 0.2s',
            }}>
              Scan my site free →
            </button>
          </form>
        )}

        {/* Error state */}
        {stage === 'error' && (
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <div style={{ background: '#ef444412', border: '1px solid #ef444430', borderRadius: 12, padding: '16px 20px', color: '#f87171', marginBottom: 16, fontSize: 14 }}>
              {error}
            </div>
            <button onClick={() => setStage('idle')} style={{ padding: '12px 24px', borderRadius: 10, background: '#6366f1', color: 'white', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>
              Try again
            </button>
          </div>
        )}

        {/* Scanning state */}
        {stage === 'scanning' && (
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <div style={{ background: '#0f0f1a', border: '1px solid #1c1c2e', borderRadius: 16, padding: '32px 36px' }}>
              <div style={{ fontSize: 13, color: '#64648a', marginBottom: 16, fontWeight: 500 }}>
                Scanning <strong style={{ color: '#818cf8' }}>{url}</strong>
              </div>

              {/* Progress bar */}
              <div style={{ background: '#1c1c2e', borderRadius: 8, height: 8, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{
                  height: '100%', borderRadius: 8,
                  background: 'linear-gradient(90deg, #6366f1, #a78bfa)',
                  width: `${progress}%`,
                  transition: 'width 0.6s ease',
                  boxShadow: '0 0 10px rgba(99,102,241,0.5)',
                }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#9898b8' }}>
                <div style={{ width: 14, height: 14, border: '2px solid #252538', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.65s linear infinite', flexShrink: 0 }} />
                {statusText}
              </div>

              {/* Animated steps */}
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Crawling pages', done: progress > 20 },
                  { label: 'AI comprehension (4 passes)', done: progress > 60 },
                  { label: 'Extracting capabilities', done: progress > 75 },
                  { label: 'Calculating AI Readiness Score', done: progress > 90 },
                ].map(({ label, done }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: done ? '#10b981' : '#252538', transition: 'color 0.4s' }}>
                    <span>{done ? '✓' : '○'}</span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <p style={{ fontSize: 12, color: '#3a3a5c', marginTop: 20 }}>
          Free scan · No credit card · Results in ~60 seconds
        </p>
      </div>

      {/* Social proof / logos */}
      <div style={{ borderTop: '1px solid #1c1c2e', borderBottom: '1px solid #1c1c2e', padding: '24px 48px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: '#3a3a5c', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>AI agents that will read your site after installing Galui</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
          {['ChatGPT', 'Claude', 'Perplexity', 'Gemini', 'Bing AI', 'WebMCP'].map(name => (
            <span key={name} style={{ fontSize: 14, color: '#3a3a5c', fontWeight: 600 }}>{name}</span>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '80px 32px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.5px' }}>How it works</h2>
        <p style={{ textAlign: 'center', color: '#64648a', fontSize: 15, marginBottom: 56 }}>Three steps to full AI visibility</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
          {[
            { step: '01', title: 'Scan your site', desc: 'Enter your URL. Our AI pipeline crawls your site and extracts every capability, pricing tier, and integration — automatically.', icon: '🔍' },
            { step: '02', title: 'Install one script', desc: 'Add a single <script> tag to your site\'s <head>. That\'s it. We handle WebMCP registration, AI agent detection, and llms.txt generation.', icon: '⟨/⟩' },
            { step: '03', title: 'Become AI-readable', desc: 'Your site is now visible to ChatGPT, Claude, Perplexity, and every AI agent. Your AI Readiness Score improves in real time.', icon: '🤖' },
          ].map(({ step, title, desc, icon }) => (
            <div key={step} style={{ background: '#0f0f1a', border: '1px solid #1c1c2e', borderRadius: 16, padding: '28px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 24 }}>{icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1px' }}>Step {step}</span>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{title}</h3>
              <p style={{ fontSize: 13, color: '#64648a', lineHeight: 1.7 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* What you get */}
      <div style={{ background: '#0a0a14', borderTop: '1px solid #1c1c2e', borderBottom: '1px solid #1c1c2e', padding: '72px 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 32, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.5px' }}>Everything included. Zero configuration.</h2>
          <p style={{ textAlign: 'center', color: '#64648a', fontSize: 15, marginBottom: 52 }}>One script tag unlocks all of this</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              ['🤖', 'AI Readiness Score', '0–100 score across 5 dimensions with improvement suggestions'],
              ['📡', 'AI Agent Analytics', 'See which AI agents visit your site and what they read'],
              ['⬡', 'WebMCP Auto-Setup', 'First-in-world automatic WebMCP tool registration'],
              ['📄', 'llms.txt Generation', 'Auto-generated machine-readable site description'],
              ['🔌', 'AI Plugin Manifest', 'OpenAI plugin manifest generated automatically'],
              ['🔄', 'Auto-updates', 'Registry stays fresh — detects page changes automatically'],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{ background: '#0f0f1a', border: '1px solid #1c1c2e', borderRadius: 12, padding: '20px 18px' }}>
                <span style={{ fontSize: 22, display: 'block', marginBottom: 10 }}>{icon}</span>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 12, color: '#64648a', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ textAlign: 'center', padding: '80px 32px' }}>
        <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-1px', marginBottom: 16 }}>
          Ready to be found by AI?
        </h2>
        <p style={{ color: '#64648a', fontSize: 16, marginBottom: 36 }}>Free scan. See your score in 60 seconds.</p>
        <form onSubmit={handleScan} style={{ display: 'flex', gap: 10, maxWidth: 520, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="yourwebsite.com"
            style={{ flex: 1, minWidth: 200, padding: '13px 18px', borderRadius: 10, border: '1px solid #252538', background: '#0f0f1a', color: '#e8e8f8', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
          />
          <button type="submit" style={{ padding: '13px 24px', borderRadius: 10, background: '#6366f1', color: 'white', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}>
            Get free scan →
          </button>
        </form>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
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
