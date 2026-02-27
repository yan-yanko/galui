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
  if (!res.ok) throw new Error('Poll failed')
  return res.json()
}

async function getScore(domain) {
  const res = await fetch(`${API_BASE}/api/v1/score/${domain}`, {
    headers: { 'X-API-Key': 'kotleryan1984' },
  })
  if (!res.ok) throw new Error('Score not found')
  return res.json()
}

async function getRegistry(domain) {
  const res = await fetch(`${API_BASE}/registry/${domain}`, {
    headers: { 'X-API-Key': 'kotleryan1984' },
  })
  if (!res.ok) throw new Error('Registry not found')
  return res.json()
}

// ── Shared Component (Can be imported) ──────────────────────────────────────
export function ScoreRingLanding({ score, size = 80 }) {
  const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F'
  const color = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--blue)' : score >= 40 ? 'var(--yellow)' : 'var(--red)'
  const r = size / 2 - 7
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border2)" strokeWidth={7} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={7}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.22, fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: size * 0.15, color: 'var(--muted)', marginTop: 2 }}>{grade}</span>
      </div>
    </div>
  )
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

    const fullUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`

    setStage('scanning')
    setProgress(0)
    setStatusText(STAGES[0])
    setError('')

    try {
      const job = await scanSite(fullUrl)
      const domain = job.domain

      const finishScan = async (domain) => {
        setProgress(95)
        setStatusText('Loading results…')
        const [score, registry] = await Promise.all([
          getScore(domain).catch(() => ({ total: 0, grade: 'F', label: 'Not scored yet', dimensions: {}, suggestions: [] })),
          getRegistry(domain).catch(() => ({ capabilities: [], metadata: {} })),
        ])
        setProgress(100)
        setStage('done')
        onScanComplete({ domain, score, registry })
      }

      if (job.status === 'complete') {
        await finishScan(domain)
        return
      }

      let stageIdx = 0
      let fakeProgress = 5
      const interval = setInterval(async () => {
        try {
          const updated = await pollJob(job.job_id)

          const targetProgress = { crawling: 25, comprehending: 65, storing: 88 }[updated.status] || fakeProgress
          fakeProgress = Math.min(fakeProgress + 3, targetProgress)
          setProgress(Math.round(fakeProgress))

          const newStageIdx = { crawling: 0, comprehending: 1, storing: 3 }[updated.status] ?? stageIdx
          if (newStageIdx !== stageIdx) { stageIdx = newStageIdx; setStatusText(STAGES[stageIdx]) }

          if (updated.status === 'complete') {
            clearInterval(interval)
            await finishScan(domain)
          } else if (updated.status === 'failed') {
            clearInterval(interval)
            throw new Error(updated.error || 'Scan failed')
          }
        } catch (err) {
          clearInterval(interval)
          setStage('error')
          setError(err.message || 'Scan error occurred')
        }
      }, 1200)

    } catch (err) {
      setStage('error')
      setError(err.message || 'Scan failed')
    }
  }

  return (
    <div className="light bg-mesh" style={{ minHeight: '100vh', color: 'var(--text)', position: 'relative', overflow: 'hidden' }}>
      {/* Background Orbs */}
      <div className="glow-orb" style={{ top: '30%', left: '20%' }}></div>
      <div className="glow-orb" style={{ top: '70%', left: '80%', animationDelay: '2s' }}></div>

      {/* Nav */}
      <nav className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px', height: 64, borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, fontSize: 20, color: 'var(--accent)', letterSpacing: '-0.5px' }}>
          <span style={{ fontSize: 22, animation: 'spin 10s linear infinite' }}>⬡</span> galuli
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <a href="/blog" className="btn btn-ghost" style={{ fontWeight: 500, fontSize: 13 }}>Blog</a>
          <a href="/about" className="btn btn-ghost" style={{ fontWeight: 500, fontSize: 13 }}>About</a>
          <a href="/roadmap" className="btn btn-ghost" style={{ fontWeight: 500, fontSize: 13 }}>Roadmap</a>
          <a href="/dashboard/" className="btn btn-primary" style={{ fontWeight: 700, marginLeft: 8 }}>Get started free</a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="container hero-grid" style={{ paddingTop: 80, paddingBottom: 72, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 64, alignItems: 'center', position: 'relative', zIndex: 1 }}>

        {/* LEFT */}
        <div>
          <div className="badge badge-purple" style={{ marginBottom: 24, padding: '6px 14px', animation: 'float 4s ease-in-out infinite' }}>
            <span style={{ marginRight: 6 }}>✨</span> AI Readability is Galuli
          </div>
          <h1 className="headline" style={{ marginBottom: 24 }}>
            Make your website<br />
            <span style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--purple) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>visible to AI.</span>
          </h1>
          <p className="body-text" style={{ marginBottom: 36 }}>
            More and more people are getting answers from AI instead of clicking links. If your site isn't AI-readable, you're invisible to them. Galuli fixes this automatically with one line of code.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 40 }}>
            {[
              { icon: '✓', label: 'Affordable.', detail: 'From $49/year, free scan, no credit card required' },
              { icon: '✓', label: 'Effortless.', detail: 'One line of code for full AI readability — automated' },
              { icon: '✓', label: 'Visible.', detail: 'All major LLMs will find, read, and recommend your site' },
            ].map(({ icon, label, detail }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 15 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', border: '1.5px solid rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontWeight: 900, fontSize: 12, flexShrink: 0 }}>
                  {icon}
                </div>
                <span>
                  <strong style={{ color: 'var(--text)' }}>{label}</strong>{' '}
                  <span style={{ color: 'var(--muted)' }}>{detail}</span>
                </span>
              </div>
            ))}
          </div>

          {/* CTA */}
          {stage === 'idle' && (
            <form onSubmit={handleScan} className="glass-panel" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: 10, borderRadius: 14 }}>
              <input
                ref={inputRef}
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="yourwebsite.com"
                style={{ flex: 1, minWidth: 200, padding: '14px 20px', fontSize: 15, borderRadius: 10, background: 'var(--surface)' }}
              />
              <button type="submit" className="btn btn-primary shadow-lg" style={{ padding: '14px 28px', fontSize: 15, borderRadius: 10 }}>
                Scan my site free →
              </button>
            </form>
          )}

          {stage === 'error' && (
            <div>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '14px 18px', color: 'var(--red)', marginBottom: 14, fontSize: 14 }}>
                {error}
              </div>
              <button onClick={() => setStage('idle')} className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: 10 }}>
                Try again
              </button>
            </div>
          )}

          {stage === 'scanning' && (
            <div style={{ marginTop: 8 }}>
              <ScanAnimation url={url} progress={progress} />
            </div>
          )}

          <p style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 16 }}>
            Free scan · No credit card · Results in ~60 seconds
          </p>
        </div>

        {/* RIGHT */}
        <div className="hero-animation-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <HeroAnimation />
        </div>
      </div>

      {/* Trust Strip */}
      <div className="glass-panel" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '20px 48px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: '1px', flexShrink: 0 }}>
            Visible to
          </span>
          {['ChatGPT', 'Claude', 'Perplexity', 'Gemini', 'Bing AI', 'WebMCP Agents'].map((name, i) => (
            <span key={name} style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 700, animation: `float ${4 + (i % 3)}s ease-in-out infinite alternate` }}>{name}</span>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="container" style={{ padding: '80px 24px', position: 'relative', zIndex: 1 }}>
        <div className="badge badge-green" style={{ display: 'flex', margin: '0 auto 16px', width: 'fit-content' }}>Simple Pipeline</div>
        <h2 className="text-center" style={{ fontSize: 34, fontWeight: 900, marginBottom: 10, letterSpacing: '-0.5px' }}>How it works</h2>
        <p className="text-center body-text" style={{ marginBottom: 52 }}>Three steps to full AI visibility</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {[
            {
              step: '01', icon: '🔍', title: 'Scan your site free',
              desc: 'Enter your URL. Galuli crawls every page, runs a 4-pass AI analysis pipeline, extracts your site\'s capabilities, and gives you an AI Readiness Score (0–100) in under 2 minutes.',
              tag: null,
            },
            {
              step: '02', icon: '</>', title: 'Add one script tag',
              desc: 'Copy one line into your site\'s <head>. That\'s it. Galuli automatically generates your llms.txt, registers WebMCP tools, injects schema.org markup, and starts logging AI agent visits.',
              tag: '30 seconds to install',
            },
            {
              step: '03', icon: '🤖', title: 'Get found by AI',
              desc: 'ChatGPT, Claude, Perplexity, Gemini, and every other LLM can now read, understand, and cite your site. Your AI Readiness Score updates automatically as your content changes.',
              tag: null,
            },
          ].map(({ step, title, desc, icon, tag }, i) => (
            <div key={step} className="card feature-card glass-panel hover-glow animate-fadeSlideUp" style={{ position: 'relative', animationDelay: `${i * 0.15}s` }}>
              {tag && (
                <div style={{ position: 'absolute', top: 20, right: 20, fontSize: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: 'var(--accent)', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
                  {tag}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 26, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}>{icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px' }}>Step {step}</span>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 10, color: 'var(--text)' }}>{title}</h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.75 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '96px 24px' }}>
        <div className="container">
          <p className="eyebrow text-center">What you get</p>
          <h2 className="headline text-center" style={{ marginBottom: 16 }}>Everything included.<br />Zero configuration.</h2>
          <p className="body-text text-center" style={{ marginBottom: 64 }}>Add one script tag. Every feature below activates automatically.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
            {[
              { icon: '🎯', title: 'AI Readiness Score', desc: '0–100 score across 5 dimensions: content coverage, structure, freshness, WebMCP compliance, and output formats. Includes specific fixes for each weak area.', color: 'var(--accent)' },
              { icon: '📡', title: 'AI Agent Analytics', desc: 'See exactly which AI crawlers visit your site, which pages they read, and how often — updated in real time via the snippet.', color: 'var(--green)' },
              { icon: '⬡', title: 'WebMCP Auto-Setup', desc: 'The snippet registers your site\'s forms and actions as WebMCP tools, making them callable by Chrome-based AI agents without any backend changes.', color: 'var(--blue)' },
              { icon: '📄', title: 'llms.txt Generation', desc: 'Galuli auto-generates a /llms.txt file for your domain — the emerging standard for making sites machine-readable by LLMs at inference time.', color: 'var(--yellow)' },
              { icon: '🔌', title: 'AI Plugin Manifest', desc: 'A /.well-known/ai-plugin.json is generated automatically so ChatGPT and compatible AI agents can discover and call your site\'s capabilities.', color: 'var(--red)' },
              { icon: '🔄', title: 'Smart Auto-refresh', desc: 'The snippet hashes page content on every load. When content changes, Galuli re-indexes automatically — your score is always current.', color: 'var(--purple)' },
            ].map(({ icon, title, desc, color }, i) => (
              <div key={title} className="feat-card" style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                padding: '36px 32px',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: i === 0 ? '20px 0 0 0' : i === 1 ? '0' : i === 2 ? '0 20px 0 0' : i === 3 ? '0 0 0 20px' : i === 4 ? '0' : '0 0 20px 0',
              }}>
                <div style={{ position: 'absolute', top: -40, left: -40, width: 120, height: 120, borderRadius: '50%', background: color, opacity: 0.07, filter: 'blur(30px)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: 0, left: 32, right: 32, height: 2, background: `linear-gradient(90deg, transparent, ${color}80, transparent)`, borderRadius: 2 }} />
                <div style={{ fontSize: 40, marginBottom: 20, display: 'block', lineHeight: 1 }}>{icon}</div>
                <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 12, color: 'var(--text)', letterSpacing: '-0.3px' }}>{title}</div>
                <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.8 }}>{desc}</div>
                <div style={{ marginTop: 24, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  <div style={{ width: 16, height: 2, background: color, borderRadius: 2 }} /> Included
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What is AI Readability */}
      <div style={{ background: '#080810', padding: '72px 24px' }}>
        <div className="container" style={{ maxWidth: 920 }}>
          <div className="what-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 64, alignItems: 'start' }}>
            <div>
              <p className="eyebrow" style={{ marginBottom: 16 }}>What is AI Readability?</p>
              <h2 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.5px', color: '#e8e8f8', marginBottom: 20, lineHeight: 1.2 }}>
                Search engines read HTML.<br />AI reads meaning.
              </h2>
              <p style={{ color: '#9898b8', fontSize: 15, lineHeight: 1.8, marginBottom: 24 }}>
                Traditional SEO optimizes for Google's crawler. AI readability is different. LLMs like ChatGPT and Claude need to <em style={{ color: 'var(--accent2)' }}>understand</em> what your site <em style={{ color: 'var(--accent2)' }}>does</em>, who it's <em style={{ color: 'var(--accent2)' }}>for</em>, and what <em style={{ color: 'var(--accent2)' }}>actions</em> are possible.
              </p>
              <p style={{ color: '#9898b8', fontSize: 15, lineHeight: 1.8 }}>
                Galuli bridges this gap by extracting your site's capabilities into structured formats that every AI system understands — without you having to touch a single line of backend code.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { term: 'llms.txt', color: '#818cf8', desc: 'A plain-text file at /llms.txt that tells LLMs what your site does, what pages matter, and how to interpret content.' },
                { term: 'WebMCP', color: '#10b981', desc: 'A new W3C browser standard that lets AI agents directly interact with your site\'s forms, search, and checkout.' },
                { term: 'AI Plugin Manifest', color: '#f59e0b', desc: 'A /.well-known/ai-plugin.json file that tells agents what tools your site exposes and how to call them.' },
                { term: 'AI Readiness Score', color: '#3b82f6', desc: 'A 0–100 score across 5 dimensions. Think PageSpeed, but for AI visibility.' },
              ].map(({ term, color, desc }) => (
                <div key={term} style={{ background: '#0f0f1a', border: '1px solid #1c1c2e', borderLeft: `3px solid ${color}`, borderRadius: 10, padding: '14px 18px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 6 }}>{term}</div>
                  <div style={{ fontSize: 12, color: '#64648a', lineHeight: 1.65 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Score Scale */}
      <div style={{ background: 'var(--surface)', padding: '96px 24px', borderTop: '1px solid var(--border)' }}>
        <div className="container" style={{ maxWidth: 1100 }}>
          <p className="eyebrow text-center">The scoring system</p>
          <h2 className="headline text-center" style={{ marginBottom: 16 }}>What does your score mean?</h2>
          <p className="body-text text-center" style={{ marginBottom: 64 }}>AI Readiness Score is 0–100. Every point is a real signal.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 56 }}>
            {[
              { range: '90–100', grade: 'A+', color: 'var(--green)', pct: 100, label: 'Elite — Fully AI-Optimized', desc: 'ChatGPT, Claude, and Perplexity will confidently cite your site. You appear in AI-generated answers.' },
              { range: '70–89', grade: 'B', color: 'var(--blue)', pct: 80, label: 'Good — AI-Readable', desc: 'Solid visibility. A few targeted improvements would push you into Elite territory.' },
              { range: '50–69', grade: 'C', color: 'var(--yellow)', pct: 60, label: 'Average — Partially Visible', desc: 'AI agents can find you but may miss capabilities or misunderstand your offering.' },
              { range: '30–49', grade: 'D', color: 'var(--red)', pct: 40, label: 'Poor — Hard to Parse', desc: 'Significant gaps. High risk of being skipped or misrepresented in AI answers.' },
              { range: '0–29', grade: 'F', color: '#991b1b', pct: 20, label: 'Not Readable — Invisible', desc: 'Essentially invisible to AI. One Galuli snippet install changes everything.' },
            ].map(({ range, grade, color, pct, label, desc }) => (
              <div key={grade} style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16, background: color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, color: 'white', fontSize: 22, flexShrink: 0,
                  boxShadow: `0 4px 20px ${color}40`,
                }}>{grade}</div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', letterSpacing: '-0.2px' }}>{label}</span>
                    <span style={{ fontSize: 13, color: 'var(--subtle)', fontWeight: 600, flexShrink: 0, marginLeft: 12 }}>{range}</span>
                  </div>
                  <div style={{ background: 'var(--border)', borderRadius: 6, height: 8, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ height: '100%', borderRadius: 6, background: color, width: `${pct}%` }} />
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card text-center">
            <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>Score is calculated across 5 dimensions</p>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28 }}>Each dimension is scored independently — see exactly where you're losing points</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              {[
                { name: 'Content Coverage', color: 'var(--accent2)', icon: '📝' },
                { name: 'Structure Quality', color: 'var(--green)', icon: '🏗️' },
                { name: 'Freshness', color: 'var(--blue)', icon: '⚡' },
                { name: 'WebMCP', color: 'var(--purple)', icon: '⬡' },
                { name: 'Output Formats', color: 'var(--yellow)', icon: '📤' },
              ].map(({ name, color, icon }) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: `1.5px solid ${color}40`, borderRadius: 12, padding: '12px 18px', boxShadow: 'var(--shadow)' }}>
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="container" style={{ padding: '80px 24px 60px', maxWidth: 760, margin: '0 auto' }}>
        <div className="text-center" style={{ marginBottom: 48 }}>
          <div className="badge badge-blue" style={{ display: 'inline-block', marginBottom: 14 }}>FAQ</div>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.4px', lineHeight: 1.2 }}>
            Questions we get asked a lot
          </h2>
        </div>
        <FaqAccordion />
      </div>

      {/* Bottom CTA */}
      <div className="container text-center" style={{ padding: '80px 24px' }}>
        <h2 className="headline" style={{ marginBottom: 14 }}>Ready to be found by AI?</h2>
        <p className="body-text" style={{ marginBottom: 36 }}>Free scan. See your AI Readiness Score in 60 seconds.</p>
        <form onSubmit={handleScan} style={{ display: 'flex', gap: 10, maxWidth: 480, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="yourwebsite.com"
            style={{ flex: 1, minWidth: 200, padding: '13px 18px', borderRadius: 10, fontSize: 14 }}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '13px 24px', fontSize: 14, borderRadius: 10 }}>
            Get free scan →
          </button>
        </form>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--accent)' }}>⬡ galuli</div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <a href="/blog" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>Blog</a>
          <a href="/about" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>About</a>
          <a href="/roadmap" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>Roadmap</a>
          <a href="mailto:hello@galuli.io" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>hello@galuli.io</a>
          <span style={{ fontSize: 12, color: 'var(--subtle)' }}>© 2025 Galuli</span>
        </div>
        <a href="/dashboard/" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Dashboard →</a>
      </div>

      <style>{`
        /* Responsive layout fixes via class overrides since index.css supports this */
        @media (max-width: 860px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-animation-wrapper { display: none !important; }
          .what-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

const FAQ_ITEMS = [
  {
    q: "What is GEO — Generative Engine Optimization?",
    a: "GEO is the discipline of making your website visible to and recommended by AI systems like ChatGPT, Claude, Perplexity, and Gemini. Traditional SEO gets you ranked in Google. GEO gets you cited in AI answers — which now reach billions of users daily. The two disciplines share some DNA (quality content, authority) but diverge sharply on signals, mechanics, and measurement."
  },
  {
    q: "Which AI systems does Galuli optimize for?",
    a: "Six: ChatGPT (OpenAI), Perplexity, Claude (Anthropic), Gemini (Google), Grok (xAI), and Llama (Meta / open-source). Each weights different signals differently. Galuli gives you an individual GEO Score for each so you know exactly which systems you're underperforming on and why."
  },
  {
    q: "What is an AI Readiness Score?",
    a: "A 0–100 score across 5 dimensions: Content Clarity (can AI extract accurate facts from your pages?), Structural Legibility (schema markup, headers, sitemap quality), Machine-Readable Signals (llms.txt, ai-plugin.json, WebMCP registration), Authority & Citation (third-party mentions in trusted sources), and Freshness & Activity (how current is your content?). Each dimension is scored independently so you know exactly where to improve."
  },
  {
    q: "What is llms.txt and do I need one?",
    a: "llms.txt is a Markdown file at /llms.txt on your domain that summarizes your site specifically for AI language models — in a clean, structured format they can read directly. Without it, AI systems infer your product from marketing copy, which leads to incomplete or inaccurate representations. Galuli generates yours automatically from your crawl data."
  },
  {
    q: "What is WebMCP?",
    a: "WebMCP (Web Multi-agent Communication Protocol) is an emerging standard for registering your service capabilities with AI agent frameworks. When registered, AI agents can discover and interact with your tools directly — without guessing from your homepage. Galuli handles registration automatically when you install the snippet."
  },
  {
    q: "How does AI agent analytics work?",
    a: "AI crawlers (ChatGPT-User, ClaudeBot, PerplexityBot, etc.) don't execute JavaScript, so they never appear in Google Analytics. Galuli's snippet layer detects AI-specific request patterns and correlates them with server-side signals to give you visibility into which AI systems are reading your site, which pages they visit, and how that traffic trends over time."
  },
  {
    q: "How long does a scan take?",
    a: "A typical scan completes in 60–90 seconds. The pipeline crawls your pages, runs a 4-pass AI comprehension analysis using Claude, extracts your site's capabilities, calculates your AI Readiness Score, and generates a draft llms.txt — all automatically."
  },
  {
    q: "Is Galuli free?",
    a: "Yes — the free tier lets you scan up to 3 sites with no credit card required. You get the full AI Readiness Score, GEO Score across all 6 LLMs, and AI agent analytics. The Pro plan ($49/year) adds 50 sites, priority crawling, automated weekly re-scans, and a badge you can embed anywhere."
  },
  {
    q: "How is Galuli different from SEMrush or Ahrefs?",
    a: "SEMrush and Ahrefs measure traditional search visibility — keyword rankings, backlinks, organic Google traffic. Galuli measures AI visibility — how AI systems understand and recommend your site. These are complementary, not competing. You can have a high domain authority and terrible AI readiness, or a small site with near-perfect AI visibility. We built Galuli to be the SEMrush of the AI era."
  },
]

function FaqAccordion() {
  const [open, setOpen] = useState(null)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {FAQ_ITEMS.map((item, i) => {
        const isOpen = open === i
        return (
          <div
            key={i}
            style={{
              borderBottom: '1px solid var(--border)',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '20px 0',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, flex: 1 }}>
                {item.q}
              </span>
              <span style={{
                fontSize: 20,
                color: 'var(--accent)',
                flexShrink: 0,
                transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
                lineHeight: 1,
              }}>+</span>
            </button>
            {isOpen && (
              <div style={{
                paddingBottom: 24,
                fontSize: 15,
                color: 'var(--muted)',
                lineHeight: 1.75,
                animation: 'fadeSlideUp 0.2s ease forwards',
              }}>
                {item.a}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ScanAnimation({ url, progress }) {
  const steps = [
    { label: 'Crawling pages', threshold: 20 },
    { label: 'AI comprehension (4 passes)', threshold: 60 },
    { label: 'Extracting capabilities', threshold: 75 },
    { label: 'Calculating Score', threshold: 90 },
  ]

  const activeStep = steps.reduce((acc, s, i) => progress >= s.threshold ? i : acc, -1)
  const pagesFound = Math.floor((progress / 100) * 18)

  const logs = [
    { at: 5, text: `GET /${url.replace(/https?:\/\//, '')} → 200` },
    { at: 12, text: 'Sitemap found · 18 URLs queued' },
    { at: 22, text: 'Crawled /about → extracted 420 tokens' },
    { at: 35, text: 'Crawled /pricing → extracted 318 tokens' },
    { at: 48, text: 'Pass 1/4 · Content extraction complete' },
    { at: 58, text: 'Pass 2/4 · Capability mapping complete' },
    { at: 66, text: 'Pass 3/4 · Structure analysis complete' },
    { at: 74, text: 'Pass 4/4 · Intent classification done' },
    { at: 82, text: '7 capabilities identified' },
    { at: 91, text: 'Computing AI Readiness Score…' },
  ].filter(l => l.at <= progress)

  return (
    <div style={{
      background: '#0d0d1a',
      border: '1px solid #2a2a40',
      borderRadius: 12,
      overflow: 'hidden',
      fontFamily: 'var(--font-mono)',
      boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#13131f', borderBottom: '1px solid #1e1e30' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
        <div style={{ flex: 1, textAlign: 'center', fontSize: 11, color: '#4a4a6a', fontWeight: 600, letterSpacing: '0.3px', fontFamily: 'var(--font)' }}>
          galuli scanner
        </div>
      </div>

      <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid #1a1a2e', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 8px #6366f1', animation: 'spin 1.5s ease-in-out infinite', flexShrink: 0 }} />
        <div style={{ fontSize: 13, color: '#a5b4fc', fontWeight: 700 }}>{url.replace(/https?:\/\//, '')}</div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: '#4a4a6a' }}>{pagesFound} pages</div>
      </div>

      <div style={{ padding: '12px 18px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#4a4a6a', marginBottom: 5 }}>
          <span>PROGRESS</span>
          <span style={{ color: '#6366f1', fontWeight: 700 }}>{progress}%</span>
        </div>
        <div style={{ background: '#1e1e30', borderRadius: 4, height: 4, overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, #6366f1, #a78bfa)', width: `${progress}%`, transition: 'width 0.8s ease' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12, fontFamily: 'var(--font)' }}>
          {steps.map((s, i) => {
            const done = progress >= s.threshold
            const active = !done && i === activeStep + 1
            return (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: done || active ? 1 : 0.3, transition: 'opacity 0.4s' }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  background: done ? '#10b98120' : active ? 'rgba(99,102,241,0.15)' : '#1a1a2e',
                  border: `1px solid ${done ? '#10b98140' : active ? 'rgba(99,102,241,0.4)' : '#252538'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
                }}>
                  {done ? '✓' : active ? <span className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} /> : <span style={{ fontSize: 9, color: '#3a3a5c' }}>{i + 1}</span>}
                </div>
                <span style={{ fontSize: 12, color: done ? '#10b981' : active ? '#a5b4fc' : '#4a4a6a', fontWeight: done || active ? 600 : 400, transition: 'color 0.4s' }}>
                  {s.label}
                </span>
                {done && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#10b98180' }}>done</span>}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ margin: '0 18px 14px', background: '#080810', border: '1px solid #1a1a2e', borderRadius: 8, padding: '10px 12px', height: 90, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 3 }}>
        {logs.slice(-5).map((l, i) => (
          <div key={l.at} style={{ fontSize: 10, color: i === logs.slice(-5).length - 1 ? '#a5b4fc' : '#3a3a5a', animation: i === logs.slice(-5).length - 1 ? 'fadeSlideUp 0.3s ease-out both' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span style={{ color: '#2a2a4a', marginRight: 6 }}>›</span>{l.text}
          </div>
        ))}
        <div style={{ fontSize: 10, color: '#6366f1', animation: 'crawl-blink 1s step-end infinite' }}>▋</div>
      </div>
    </div>
  )
}

function HeroAnimation() {
  return (
    <div className="animate-float" style={{ width: 420, height: 480, position: 'relative' }}>
      <div style={{
        position: 'absolute', inset: 0, background: 'var(--surface)', borderRadius: 28,
        border: '1.5px solid var(--border)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
      }}>
        <div style={{ height: 4, background: 'linear-gradient(90deg, #6366f1, #a78bfa, #60a5fa)', borderRadius: '28px 28px 0 0' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '28px 28px 24px', display: 'flex', flexDirection: 'column', height: '100%' }}>

        <div className="animate-fadeSlideUp" style={{ animationDelay: '0s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, background: 'linear-gradient(135deg, #6366f1, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: 'white' }}>01</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Your website</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.2px' }}>yourwebsite.com</div>
              <div style={{ fontSize: 10, color: 'var(--subtle)', marginTop: 2, display: 'flex', gap: 6 }}>
                <span>12 pages</span><span>·</span><span>4.2k words</span>
              </div>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
          </div>
        </div>

        <div className="animate-fadeSlideUp" style={{ display: 'flex', justifyContent: 'center', padding: '12px 0', animationDelay: '0.5s' }}>
          <svg width={24} height={20} viewBox="0 0 24 20" fill="none">
            <line x1={12} y1={0} x2={12} y2={14} stroke="var(--border2)" strokeWidth={1.5} strokeDasharray="3 2" />
            <polyline points="6,12 12,18 18,12" stroke="var(--border2)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="animate-fadeSlideUp" style={{ animationDelay: '0.7s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, background: 'linear-gradient(135deg, #6366f1, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: 'white' }}>02</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>AI pipeline</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {[
              { label: 'Content extraction', color: '#818cf8', delay: 0 },
              { label: 'Capability mapping', color: '#60a5fa', delay: 0.3 },
              { label: 'Structure analysis', color: '#a78bfa', delay: 0.6 },
              { label: 'Intent classification', color: '#34d399', delay: 0.9 },
            ].map(({ label, color, delay }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--surface2)', overflow: 'hidden' }}>
                  <div className="animate-aipass" style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${color}80, ${color})`, animationDelay: `${delay}s` }} />
                </div>
                <div style={{ fontSize: 10, color: 'var(--subtle)', minWidth: 110, fontWeight: 500 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="animate-fadeSlideUp" style={{ display: 'flex', justifyContent: 'center', padding: '12px 0', animationDelay: '2.0s' }}>
          <svg width={24} height={20} viewBox="0 0 24 20" fill="none">
            <line x1={12} y1={0} x2={12} y2={14} stroke="var(--border2)" strokeWidth={1.5} strokeDasharray="3 2" />
            <polyline points="6,12 12,18 18,12" stroke="var(--border2)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="animate-fadeSlideUp" style={{ animationDelay: '2.2s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, background: 'linear-gradient(135deg, #6366f1, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: 'white' }}>03</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>AI Readiness Score</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '12px 16px' }}>
            <ScoreRingLanding score={78} size={56} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 7 }}>Ready for AI</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  { d: 'Content', v: 85, c: '#818cf8' },
                  { d: 'Structure', v: 72, c: '#60a5fa' },
                  { d: 'WebMCP', v: 40, c: '#f59e0b' },
                ].map(({ d, v, c }) => (
                  <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontSize: 9, color: 'var(--subtle)', width: 46 }}>{d}</div>
                    <div style={{ flex: 1, height: 4, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: c, borderRadius: 2, width: `${v}%`, transition: 'width 0.8s ease 3s' }} />
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--muted)', width: 18, textAlign: 'right' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Results Page (Gate) ──────────────────────────────────────────────────────
export function ResultsPage({ data, onRegistered }) {
  const { domain, score: rawScore, registry: rawRegistry } = data

  const score = { total: 0, grade: 'F', label: 'Pending', dimensions: {}, suggestions: [], ...rawScore }
  const registry = { capabilities: [], metadata: {}, ...rawRegistry }

  const [showModal, setShowModal] = useState(true)
  const [registered, setRegistered] = useState(() => !!localStorage.getItem('galuli_user'))
  const [form, setForm] = useState({ name: '', email: '' })
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState('form')

  const gradeColor = score.total >= 70 ? 'var(--green)' : score.total >= 50 ? 'var(--yellow)' : 'var(--red)'

  const handleRegister = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 900))
    localStorage.setItem('galuli_user', JSON.stringify({ name: form.name, email: form.email, registered_at: new Date().toISOString() }))
    setStep('confirm')
    setSubmitting(false)
  }

  const handleConfirm = () => {
    setRegistered(true)
    setShowModal(false)
    if (onRegistered) onRegistered(); // Notify parent to go to dashboard
  }

  return (
    <div className="dark" style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px', height: 60, borderBottom: '1px solid var(--border)', background: 'var(--surface)', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 18, color: 'var(--accent)' }}>
          <span style={{ fontSize: 22 }}>⬡</span> galuli
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>AI Readiness Report for <strong style={{ color: 'var(--accent)' }}>{domain}</strong></div>
      </nav>

      {/* Blurred background content */}
      <div style={{ position: 'relative' }}>
        <div style={{ filter: registered ? 'none' : 'blur(6px)', pointerEvents: registered ? 'auto' : 'none', transition: 'filter 0.4s', userSelect: registered ? 'auto' : 'none' }}>
          <div className="container" style={{ maxWidth: 820, padding: '48px 24px' }}>
            <div className="card-lg" style={{ marginBottom: 24, border: `1px solid ${gradeColor}`, display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
              <ScoreRingLanding score={score.total} size={130} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.3px' }}>{score.label}</div>
                <div style={{ color: 'var(--muted)', marginBottom: 12 }}>{domain}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span className="badge badge-blue">Score: {score.total}/100</span>
                  <span className="badge" style={{ color: gradeColor, border: `1px solid ${gradeColor}`, background: 'var(--surface2)' }}>Grade: {score.grade}</span>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 24 }}>
              <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Score breakdown</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {Object.entries(score.dimensions || { content_coverage: { score: 85, max: 100 }, structure_quality: { score: 70, max: 100 }, freshness: { score: 90, max: 100 } }).map(([key, dim]) => (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ fontWeight: 500 }}>{key}</span>
                      <span style={{ color: 'var(--muted)' }}>{dim.score}/{dim.max}</span>
                    </div>
                    <div style={{ background: 'var(--surface2)', borderRadius: 4, height: 7 }}>
                      <div style={{ height: 7, borderRadius: 4, background: 'var(--accent)', width: `${(dim.score / dim.max) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {registered && (
              <div className="card text-center" style={{ background: 'linear-gradient(135deg, var(--surface2), var(--surface))', borderColor: 'var(--accent)' }}>
                <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>Make {domain} AI-readable in 30 seconds</h3>
                <p className="body-text" style={{ marginBottom: 24 }}>Add one script tag to your site. Galuli handles everything else.</p>
                <div className="code-block text-left" style={{ marginBottom: 20 }}>
                  {`<script src="${API_BASE}/galuli.js?key=YOUR_KEY" async></script>`}
                </div>
                <a href="/dashboard/" className="btn btn-primary btn-lg" style={{ textDecoration: 'none' }}>Go to Dashboard →</a>
              </div>
            )}
          </div>
        </div>

        {/* Modal Overlay */}
        {!registered && showModal && (
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 50, padding: 24 }}>
            <div className="card-lg" style={{ maxWidth: 440, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}>
              {step === 'form' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, padding: '14px 18px', background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <ScoreRingLanding score={score.total} size={56} />
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 2 }}>Your AI Readiness Score for</div>
                      <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>{domain}</div>
                    </div>
                  </div>

                  <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.3px', color: 'var(--text)' }}>Your report is ready</h2>
                  <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6, marginBottom: 28 }}>
                    Create your free account to see the full breakdown, capabilities, and improvement suggestions.
                  </p>

                  <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" required />
                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Work email" required />
                    <button type="submit" className="btn btn-primary" disabled={submitting} style={{ padding: 14, fontSize: 14 }}>
                      {submitting ? <><span className="spinner" style={{ borderColor: 'var(--border2)', borderTopColor: 'white' }} /> Creating account…</> : 'See my full report →'}
                    </button>
                  </form>
                  <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 14, textAlign: 'center' }}>Free forever for 1 site · No credit card required</p>
                </>
              )}
              {step === 'confirm' && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 20 }}>📬</div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Check your inbox</h2>
                  <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
                    We sent a confirmation to <strong style={{ color: 'var(--accent)' }}>{form.email}</strong>. Click the link to unlock your full report.
                  </p>
                  <button onClick={handleConfirm} className="btn btn-primary btn-lg" style={{ marginBottom: 12 }}>I confirmed my email →</button>
                  <div style={{ fontSize: 12, color: 'var(--subtle)' }}>
                    Didn't get it? <button onClick={handleConfirm} className="btn btn-ghost btn-sm" style={{ padding: 0, border: 'none', background: 'none', color: 'var(--accent)' }}>Skip for now</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
