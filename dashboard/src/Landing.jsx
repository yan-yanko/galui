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
export function LandingPage({ onScanComplete, onAuthRequired }) {
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
          <a href="/pricing" className="btn btn-ghost" style={{ fontWeight: 500, fontSize: 13 }}>Pricing</a>
          <button className="btn btn-ghost" style={{ fontWeight: 500, fontSize: 13 }} onClick={() => onAuthRequired && onAuthRequired()}>Sign in</button>
          <a href="/pricing" className="btn btn-primary" style={{ fontWeight: 700, marginLeft: 4 }}>Get started free</a>
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
              { icon: '✓', label: 'Know your AI Attention Score.', detail: 'See exactly how often, how deep, and how recently each AI system reads your content.' },
              { icon: '✓', label: 'Fix what holds you back.', detail: 'Content Doctor finds unsupported claims and structural issues AI won\'t trust — with specific rewrites.' },
              { icon: '✓', label: 'From $9/month, free scan.', detail: 'Starter plan covers 1 site with full JS monitoring. Free tier gets you the score instantly.' },
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
          {['ChatGPT', 'Claude', 'Perplexity', 'Gemini', 'Grok', 'Llama', 'WebMCP Agents'].map((name, i) => (
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
              { icon: '📊', title: 'GEO Score — per AI system', desc: 'Individual visibility scores for ChatGPT, Claude, Perplexity, Gemini, Grok, and Llama. Know exactly which AI is undervaluing your site and why.', color: 'var(--accent)' },
              { icon: '🧲', title: 'AI Attention Score', desc: 'A 0–100 composite metric: how often AI agents visit (frequency), how many pages they read (depth), how recently they crawled (recency), and how many distinct systems (diversity).', color: 'var(--green)' },
              { icon: '🩺', title: 'Content Doctor', desc: 'AI-powered audit that finds authority gaps (claims AI won\'t trust) and structural issues (dense paragraphs, missing Key Takeaways). Returns specific rewrites, not vague advice.', color: 'var(--blue)' },
              { icon: '🗺️', title: 'Topic Attention Map', desc: 'See which content areas — Blog, Product, Pricing, Docs — get the most AI crawler attention, and which specific AI bots are driving it. Know where to invest.', color: 'var(--yellow)' },
              { icon: '📄', title: 'llms.txt + AI Plugin Manifest', desc: 'Galuli auto-generates /llms.txt and /.well-known/ai-plugin.json — the standards that let AI systems read your site in their native format, not scraped HTML.', color: 'var(--red)' },
              { icon: '⬡', title: 'WebMCP + Smart Auto-refresh', desc: 'Your site\'s actions register as callable AI tools automatically. Content change detection re-indexes you when pages update — no manual rescans needed.', color: 'var(--purple)' },
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
                { term: 'AI Attention Score', color: '#818cf8', desc: 'A 0–100 composite: frequency (how often AI visits), depth (how many pages it reads), recency, and diversity of AI systems. The ROI metric for GEO.' },
                { term: 'Content Doctor', color: '#10b981', desc: 'Authority Gap Scanner + Structural Optimizer. Finds claims AI won\'t trust and paragraphs that should be tables — with specific rewrites, not vague advice.' },
                { term: 'llms.txt + ai-plugin.json', color: '#f59e0b', desc: 'The machine-readable standards AI systems check before your homepage. Galuli generates both automatically from your crawl data.' },
                { term: 'GEO Score per LLM', color: '#3b82f6', desc: 'Separate visibility scores for ChatGPT, Claude, Perplexity, Gemini, Grok, and Llama. Each weights signals differently — now you can see the gap.' },
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
          <a href="/pricing" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>Pricing</a>
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
    q: "What is the AI Attention Score?",
    a: "AI Attention Score (0–100) measures how much attention AI systems collectively pay to your site. It's a composite of four components: Frequency (how often AI crawlers visit, 40%), Depth (how many unique pages they read per visit, 35%), Recency (how recently they last crawled, 25%), and Diversity (how many distinct AI systems, up to +10 bonus points). A score of 70+ means your content is actively being read across multiple AI systems."
  },
  {
    q: "What is Content Doctor?",
    a: "Content Doctor is Galuli's AI-powered content audit tool. It runs two analyses: the Authority Gap Scanner identifies claims in your content that AI systems won't trust because they lack empirical backing (statistics without sources, comparisons without data, benefits without evidence) — and gives you specific rewrites. The Structural Optimizer finds dense paragraphs that should be tables, missing Key Takeaways sections, undefined key entities, and other formatting issues that hurt AI readability. You can paste content, analyze any URL, or run it across your whole indexed domain."
  },
  {
    q: "Is Galuli free?",
    a: "Yes — the free tier lets you scan any site instantly with no credit card required. You get the full AI Readiness Score, GEO Score across all 6 LLMs, and AI agent analytics. Starter plan ($9/month) adds continuous JS monitoring for 1 site. Pro ($29/month) covers 10 sites. Agency ($799/year) is unlimited sites."
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

// ── Results Page ──────────────────────────────────────────────────────────────
export function ResultsPage({ data, onRegistered }) {
  const { domain, score: rawScore } = data

  const score = { total: 0, grade: 'F', label: 'Poor AI Visibility', dimensions: {}, suggestions: [], ...rawScore }

  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [emailDone, setEmailDone] = useState(() => !!localStorage.getItem('galuli_user'))
  const [copied, setCopied] = useState(false)

  const gradeColor = score.total >= 70 ? '#22c55e' : score.total >= 50 ? '#f59e0b' : '#ef4444'
  const badgeUrl = `${API_BASE}/api/v1/score/${domain}/badge`
  const badgeCode = `<a href="https://galuli.io" title="AI Readiness Score">\n  <img src="${badgeUrl}" alt="Galuli AI Readiness Score" />\n</a>`

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 700))
    localStorage.setItem('galuli_user', JSON.stringify({ email, registered_at: new Date().toISOString() }))
    setEmailDone(true)
    setSubmitting(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(badgeCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const DIM_COLORS = {
    'Content Coverage': '#818cf8',
    'Structure Quality': '#60a5fa',
    'Machine Signals': '#a78bfa',
    'Authority': '#34d399',
    'Freshness': '#f59e0b',
  }

  const fallbackDims = {
    'Content Coverage': { score: 0, max: 25 },
    'Structure Quality': { score: 0, max: 20 },
    'Machine Signals': { score: 0, max: 20 },
    'Authority': { score: 0, max: 20 },
    'Freshness': { score: 0, max: 15 },
  }
  const dims = Object.keys(score.dimensions || {}).length > 0 ? score.dimensions : fallbackDims

  return (
    <div className="dark" style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', height: 58, borderBottom: '1px solid var(--border)', background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 18, color: 'var(--accent)', cursor: 'pointer' }} onClick={() => window.location.href = '/'}>
          <span style={{ fontSize: 22 }}>⬡</span> galuli
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
          AI Readiness Report ·
          <strong style={{ color: 'var(--accent)' }}>{domain}</strong>
        </div>
        <button onClick={() => { if (onRegistered) onRegistered() }} className="btn btn-primary btn-sm">
          Open Dashboard →
        </button>
      </nav>

      <div className="container" style={{ maxWidth: 860, padding: '40px 24px 80px' }}>

        {/* ── Hero score card ── */}
        <div className="card-lg" style={{ marginBottom: 28, border: `1.5px solid ${gradeColor}33`, background: 'var(--surface)', display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <ScoreRingLanding score={score.total} size={120} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>AI Readiness Score</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.4px' }}>{score.label}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>{domain}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="badge badge-blue" style={{ fontSize: 12 }}>Score: {score.total}/100</span>
              <span className="badge" style={{ color: gradeColor, border: `1px solid ${gradeColor}55`, background: `${gradeColor}15`, fontSize: 12 }}>Grade: {score.grade}</span>
              {score.total >= 70 && <span className="badge" style={{ color: '#34d399', border: '1px solid #34d39944', background: '#34d39915', fontSize: 12 }}>✓ AI-Ready</span>}
              {score.total < 40 && <span className="badge" style={{ color: '#f59e0b', border: '1px solid #f59e0b44', background: '#f59e0b15', fontSize: 12 }}>⚠ Needs Work</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--subtle)', marginBottom: 6 }}>Scanned by Galuli AI pipeline</div>
            <div style={{ fontSize: 11, color: 'var(--subtle)' }}>{score.pages_crawled || '—'} pages analysed</div>
          </div>
        </div>

        {/* ── Score Breakdown ── */}
        <div className="card" style={{ marginBottom: 28 }}>
          <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Score breakdown</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {Object.entries(dims).map(([key, dim]) => {
              const pct = dim.max > 0 ? (dim.score / dim.max) * 100 : 0
              const color = DIM_COLORS[key] || 'var(--accent)'
              return (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{key}</span>
                    <span style={{ color: 'var(--muted)' }}>{dim.score}/{dim.max}</span>
                  </div>
                  <div style={{ background: 'var(--surface2)', borderRadius: 5, height: 8 }}>
                    <div style={{ height: 8, borderRadius: 5, background: color, width: `${pct}%`, transition: 'width 1s ease 0.3s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Improvement Suggestions ── */}
        {score.suggestions && score.suggestions.length > 0 && (
          <div className="card" style={{ marginBottom: 28 }}>
            <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Top improvements</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {score.suggestions.map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>{i + 1}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, paddingTop: 2 }}>{tip}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Locked features upsell panel ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>What Starter unlocks</h3>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#6366f115', color: '#818cf8', border: '1px solid #6366f133' }}>from $9/mo</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {[
              {
                icon: '📡',
                title: 'AI Attention Score',
                desc: 'See how much attention ChatGPT, Claude, Perplexity, and 3 more AI systems actually pay to your site. Frequency, depth, recency — all in one composite score.',
                locked: true,
              },
              {
                icon: '🩺',
                title: 'Content Doctor',
                desc: 'Find every claim AI won\'t trust and every paragraph that\'s too dense to read. Authority Gap Scanner + Structural Optimizer with specific rewrites.',
                locked: true,
              },
              {
                icon: '⚡',
                title: 'Continuous Monitoring',
                desc: 'Every page change triggers an automatic rescan. Your AI Readiness Score stays current. Never go dark to AI crawlers again.',
                locked: true,
              },
              {
                icon: '🏷️',
                title: 'Embeddable Badge',
                desc: 'Show visitors you\'re AI-ready. One img tag — always live, always accurate. Updates automatically when your score changes.',
                locked: !emailDone,
              },
            ].map(({ icon, title, desc, locked }) => (
              <div key={title} style={{ position: 'relative', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)', padding: '18px 18px 16px', overflow: 'hidden' }}>
                {locked && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 14, zIndex: 2 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>🔒</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Starter plan</div>
                    </div>
                  </div>
                )}
                <div style={{ fontSize: 22, marginBottom: 10 }}>{icon}</div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA: sign up or upgrade ── */}
        {!emailDone ? (
          <div className="card-lg" style={{ marginBottom: 28, background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', border: '1.5px solid #6366f133', textAlign: 'center' }}>
            <div style={{ fontSize: 26, marginBottom: 12 }}>🚀</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.3px' }}>See {domain}'s full AI picture</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, marginBottom: 24, maxWidth: 460, margin: '0 auto 24px' }}>
              Free account — no credit card. AI Attention Score, GEO scores for 6 AI systems, and one install snippet that keeps everything up to date.
            </p>
            <form onSubmit={handleEmailSubmit} style={{ display: 'flex', gap: 10, maxWidth: 400, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                style={{ flex: 1, minWidth: 200 }}
              />
              <button type="submit" className="btn btn-primary" disabled={submitting} style={{ padding: '10px 20px', whiteSpace: 'nowrap' }}>
                {submitting ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> Creating…</> : 'Get free account →'}
              </button>
            </form>
            <p style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 14 }}>Free forever for 3 sites · No credit card · Cancel anytime</p>
          </div>
        ) : (
          <div className="card-lg" style={{ marginBottom: 28, background: 'linear-gradient(135deg, #0f172a, #052e16)', border: '1.5px solid #22c55e33', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>✅</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>You're in — open your dashboard</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, marginBottom: 24 }}>
              Your free account is ready. Add the snippet to {domain} and Galuli starts tracking AI traffic immediately.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => { if (onRegistered) onRegistered() }} className="btn btn-primary btn-lg">Open Dashboard →</button>
              <a href="/pricing" className="btn btn-outline btn-lg" style={{ textDecoration: 'none' }}>Upgrade to Starter — $9/mo</a>
            </div>
          </div>
        )}

        {/* ── Badge section (teased, unlocks after email) ── */}
        <div className="card" style={{ marginBottom: 28, position: 'relative', overflow: 'hidden' }}>
          {!emailDone && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, borderRadius: 'inherit' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>🔒</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Embeddable Score Badge</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Create a free account to unlock</div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <h4 style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Embed your score badge</h4>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, maxWidth: 380 }}>
                Show visitors your site is AI-ready. The badge links back to galuli.io and updates automatically.
              </p>
              <img src={badgeUrl} alt="AI Readiness Score badge" style={{ display: 'block', marginBottom: 16, borderRadius: 8 }} />
            </div>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>HTML snippet</div>
              <pre style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', fontSize: 11, color: 'var(--text)', overflowX: 'auto', marginBottom: 10, lineHeight: 1.6 }}>{badgeCode}</pre>
              <button onClick={handleCopy} className="btn btn-outline btn-sm" style={{ fontSize: 12 }}>
                {copied ? '✓ Copied' : 'Copy snippet'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Install snippet ── */}
        {emailDone && (
          <div className="card" style={{ background: 'linear-gradient(135deg, var(--surface2), var(--surface))', borderColor: 'var(--accent)' }}>
            <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>Start monitoring {domain}</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 18 }}>Paste this in your site's &lt;head&gt;. Galuli generates your llms.txt, registers WebMCP, and tracks AI agent visits — automatically.</p>
            <div className="code-block text-left" style={{ marginBottom: 16, fontSize: 12 }}>
              {`<script src="${API_BASE}/galuli.js" defer></script>`}
            </div>
            <button onClick={() => { if (onRegistered) onRegistered() }} className="btn btn-primary">Go to Dashboard →</button>
          </div>
        )}

      </div>
    </div>
  )
}
