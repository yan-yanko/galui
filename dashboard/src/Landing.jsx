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
        // cached — load immediately
        await finishScan(domain)
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
            await finishScan(domain)
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
      <div className="hero-grid" style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 48px 72px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>

        {/* ── LEFT: content ── */}
        <div>
          {/* Eyebrow */}
          <p style={{ fontSize: 13, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 20 }}>
            AI Readability is Galui
          </p>

          {/* Title */}
          <h1 style={{ fontSize: 'clamp(34px, 4vw, 58px)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-2px', marginBottom: 24, color: '#0a0a14' }}>
            Make your website<br />
            <span style={{ color: '#6366f1' }}>visible to AI.</span>
          </h1>

          {/* Explainer */}
          <p style={{ fontSize: 17, color: '#64648a', lineHeight: 1.75, marginBottom: 36, fontWeight: 400 }}>
            More and more people are getting answers from AI instead of clicking links. If your site isn't AI-readable, you're invisible to them. Galui fixes this automatically with one line of code.
          </p>

          {/* 3 benefits */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 40 }}>
            {[
              { icon: '✓', label: 'Affordable.', detail: 'From $49/year, free scan, no credit card required' },
              { icon: '✓', label: 'Effortless.', detail: 'One line of code for full AI readability — automated' },
              { icon: '✓', label: 'Visible.', detail: 'All major LLMs will find, read, and recommend your site' },
            ].map(({ icon, label, detail }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 15 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#6366f115', border: '1.5px solid #6366f140', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', fontWeight: 900, fontSize: 12, flexShrink: 0 }}>
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
            <form onSubmit={handleScan} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                ref={inputRef}
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="yourwebsite.com"
                style={{
                  flex: 1, minWidth: 200,
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
            <div>
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
            <ScanAnimation url={url} progress={progress} />
          )}

          <p style={{ fontSize: 12, color: '#b0b0c8', marginTop: 16 }}>
            Free scan · No credit card · Results in ~60 seconds
          </p>
        </div>

        {/* ── RIGHT: animated illustration ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <HeroAnimation />
        </div>

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
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '80px 32px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 34, fontWeight: 900, marginBottom: 10, letterSpacing: '-0.5px', color: '#0a0a14' }}>How it works</h2>
        <p style={{ textAlign: 'center', color: '#64648a', fontSize: 15, marginBottom: 52 }}>Three steps to full AI visibility</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {[
            {
              step: '01', icon: '🔍', title: 'Scan your site free',
              desc: 'Enter your URL. Galui crawls every page, runs a 4-pass AI analysis pipeline, extracts your site\'s capabilities, and gives you an AI Readiness Score (0–100) in under 2 minutes. No account needed.',
              tag: null,
            },
            {
              step: '02', icon: '</>', title: 'Add one script tag',
              desc: 'Copy one line into your site\'s <head>. That\'s it. Galui automatically generates your llms.txt, registers WebMCP tools, injects schema.org markup, and starts logging AI agent visits — with zero configuration.',
              tag: '30 seconds to install',
            },
            {
              step: '03', icon: '🤖', title: 'Get found by AI',
              desc: 'ChatGPT, Claude, Perplexity, Gemini, and every other LLM can now read, understand, and cite your site. Your AI Readiness Score updates automatically as your content changes.',
              tag: null,
            },
          ].map(({ step, title, desc, icon, tag }) => (
            <div key={step} style={{ background: '#f8f8ff', border: '1px solid #e8e8f0', borderRadius: 16, padding: '28px 24px', position: 'relative' }}>
              {tag && (
                <div style={{ position: 'absolute', top: 20, right: 20, fontSize: 10, background: '#6366f110', border: '1px solid #6366f130', color: '#6366f1', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>
                  {tag}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 22 }}>{icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1px' }}>Step {step}</span>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 10, color: '#0a0a14' }}>{title}</h3>
              <p style={{ fontSize: 13, color: '#64648a', lineHeight: 1.75 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features grid ── */}
      <div style={{ background: '#ffffff', borderTop: '1px solid #e8e8f0', padding: '96px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 18 }}>What you get</p>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, marginBottom: 16, letterSpacing: '-1px', color: '#0a0a14', lineHeight: 1.1 }}>Everything included.<br />Zero configuration.</h2>
          <p style={{ textAlign: 'center', color: '#64648a', fontSize: 17, marginBottom: 64, lineHeight: 1.6 }}>Add one script tag. Every feature below activates automatically.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
            {[
              { icon: '🎯', title: 'AI Readiness Score', desc: '0–100 score across 5 dimensions: content coverage, structure, freshness, WebMCP compliance, and output formats. Includes specific fixes for each weak area.', color: '#6366f1' },
              { icon: '📡', title: 'AI Agent Analytics', desc: 'See exactly which AI crawlers visit your site, which pages they read, and how often — updated in real time via the snippet.', color: '#10b981' },
              { icon: '⬡', title: 'WebMCP Auto-Setup', desc: 'The snippet registers your site\'s forms and actions as WebMCP tools, making them callable by Chrome-based AI agents without any backend changes.', color: '#3b82f6' },
              { icon: '📄', title: 'llms.txt Generation', desc: 'Galui auto-generates a /llms.txt file for your domain — the emerging standard for making sites machine-readable by LLMs at inference time.', color: '#f59e0b' },
              { icon: '🔌', title: 'AI Plugin Manifest', desc: 'A /.well-known/ai-plugin.json is generated automatically so ChatGPT and compatible AI agents can discover and call your site\'s capabilities.', color: '#ef4444' },
              { icon: '🔄', title: 'Smart Auto-refresh', desc: 'The snippet hashes page content on every load. When content changes, Galui re-indexes automatically — your score is always current.', color: '#8b5cf6' },
            ].map(({ icon, title, desc, color }, i) => (
              <div key={title} className="feat-card" style={{
                background: '#fafafe',
                border: '1px solid #e8e8f0',
                padding: '36px 32px',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: i === 0 ? '20px 0 0 0' : i === 1 ? '0' : i === 2 ? '0 20px 0 0' : i === 3 ? '0 0 0 20px' : i === 4 ? '0' : '0 0 20px 0',
              }}>
                {/* Glow accent */}
                <div style={{ position: 'absolute', top: -40, left: -40, width: 120, height: 120, borderRadius: '50%', background: color, opacity: 0.07, filter: 'blur(30px)', pointerEvents: 'none' }} />
                {/* Top accent line */}
                <div style={{ position: 'absolute', top: 0, left: 32, right: 32, height: 2, background: `linear-gradient(90deg, transparent, ${color}50, transparent)`, borderRadius: 2 }} />
                <div style={{ fontSize: 40, marginBottom: 20, display: 'block', lineHeight: 1 }}>{icon}</div>
                <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 12, color: '#0a0a14', letterSpacing: '-0.3px' }}>{title}</div>
                <div style={{ fontSize: 14, color: '#64648a', lineHeight: 1.8 }}>{desc}</div>
                <div style={{ marginTop: 24, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  <div style={{ width: 16, height: 2, background: color, borderRadius: 2 }} />
                  Included
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── What is AI Readability ── */}
      <div style={{ background: '#06060f', padding: '72px 32px' }}>
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'start' }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 16 }}>What is AI Readability?</p>
              <h2 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.5px', color: '#f0f0ff', marginBottom: 20, lineHeight: 1.2 }}>
                Search engines read HTML.<br />AI reads meaning.
              </h2>
              <p style={{ color: '#8888aa', fontSize: 15, lineHeight: 1.8, marginBottom: 24 }}>
                Traditional SEO optimizes for Google's crawler — keywords, backlinks, meta tags. AI readability is different. LLMs like ChatGPT and Claude need to <em style={{ color: '#a5b4fc' }}>understand</em> what your site <em style={{ color: '#a5b4fc' }}>does</em>, who it's <em style={{ color: '#a5b4fc' }}>for</em>, and what <em style={{ color: '#a5b4fc' }}>actions</em> are possible.
              </p>
              <p style={{ color: '#8888aa', fontSize: 15, lineHeight: 1.8 }}>
                Galui bridges this gap by extracting your site's capabilities into structured formats that every AI system understands — without you having to touch a single line of backend code.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { term: 'llms.txt', color: '#818cf8', desc: 'A plain-text file at /llms.txt on your domain that tells LLMs what your site does, what pages matter, and how to interpret your content. Like a sitemap, but for AI.' },
                { term: 'WebMCP', color: '#34d399', desc: 'A new W3C browser standard (shipping in Chrome) that lets AI agents directly interact with your site\'s forms, search, and checkout — without scraping. Galui registers your pages automatically.' },
                { term: 'AI Plugin Manifest', color: '#f59e0b', desc: 'A /.well-known/ai-plugin.json file that tells ChatGPT and compatible agents what tools your site exposes and how to call them.' },
                { term: 'AI Readiness Score', color: '#60a5fa', desc: 'A 0–100 score across 5 dimensions: content coverage, structure quality, freshness, WebMCP compliance, and output formats. Think PageSpeed, but for AI visibility.' },
              ].map(({ term, color, desc }) => (
                <div key={term} style={{ background: '#0f0f1a', border: '1px solid #1e1e30', borderLeft: `3px solid ${color}`, borderRadius: 10, padding: '14px 18px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 6 }}>{term}</div>
                  <div style={{ fontSize: 12, color: '#64648a', lineHeight: 1.65 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Score scale ── */}
      <div style={{ background: '#ffffff', padding: '96px 32px', borderTop: '1px solid #e8e8f0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 18 }}>The scoring system</p>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-1px', color: '#0a0a14', marginBottom: 16, lineHeight: 1.1 }}>What does your score mean?</h2>
          <p style={{ textAlign: 'center', color: '#64648a', fontSize: 17, marginBottom: 64, lineHeight: 1.6 }}>AI Readiness Score is 0–100. Every point is a real signal — here's how to read it.</p>

          {/* Score bars — horizontal stacked layout */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 56 }}>
            {[
              { range: '90–100', grade: 'A+', color: '#10b981', pct: 100, label: 'Elite — Fully AI-Optimized', desc: 'ChatGPT, Claude, and Perplexity will confidently cite your site. You appear in AI-generated answers.' },
              { range: '70–89',  grade: 'B',  color: '#3b82f6', pct: 80,  label: 'Good — AI-Readable',          desc: 'Solid visibility. A few targeted improvements would push you into Elite territory.' },
              { range: '50–69',  grade: 'C',  color: '#f59e0b', pct: 60,  label: 'Average — Partially Visible',  desc: 'AI agents can find you but may miss capabilities or misunderstand your offering.' },
              { range: '30–49',  grade: 'D',  color: '#ef4444', pct: 40,  label: 'Poor — Hard to Parse',         desc: 'Significant gaps. High risk of being skipped or misrepresented in AI answers.' },
              { range: '0–29',   grade: 'F',  color: '#991b1b', pct: 20,  label: 'Not Readable — Invisible',     desc: 'Essentially invisible to AI. One Galui snippet install changes everything.' },
            ].map(({ range, grade, color, pct, label, desc }) => (
              <div key={grade} style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                {/* Grade badge */}
                <div style={{
                  width: 64, height: 64, borderRadius: 16, background: color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, color: 'white', fontSize: 22, flexShrink: 0,
                  boxShadow: `0 4px 20px ${color}40`,
                }}>{grade}</div>
                {/* Bar + label */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 16, color: '#0a0a14', letterSpacing: '-0.2px' }}>{label}</span>
                    <span style={{ fontSize: 13, color: '#b0b0c8', fontWeight: 600, flexShrink: 0, marginLeft: 12 }}>{range}</span>
                  </div>
                  <div style={{ background: '#f0f0f8', borderRadius: 6, height: 8, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ height: '100%', borderRadius: 6, background: color, width: `${pct}%` }} />
                  </div>
                  <div style={{ fontSize: 13, color: '#64648a', lineHeight: 1.6 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 5 dimensions callout */}
          <div style={{ background: '#f8f8ff', border: '1px solid #e8e8f0', borderRadius: 20, padding: '32px 40px' }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <p style={{ fontWeight: 800, fontSize: 16, color: '#0a0a14', marginBottom: 6 }}>Score is calculated across 5 dimensions</p>
              <p style={{ fontSize: 14, color: '#64648a' }}>Each dimension is scored independently — see exactly where you're losing points</p>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              {[
                { name: 'Content Coverage', color: '#818cf8', icon: '📝' },
                { name: 'Structure Quality', color: '#10b981', icon: '🏗️' },
                { name: 'Freshness',         color: '#3b82f6', icon: '⚡' },
                { name: 'WebMCP Compliance', color: '#8b5cf6', icon: '⬡' },
                { name: 'Output Formats',    color: '#f59e0b', icon: '📤' },
              ].map(({ name, color, icon }) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#ffffff', border: `1.5px solid ${color}30`, borderRadius: 12, padding: '12px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#0a0a14' }}>{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── FAQ ── */}
      <div style={{ background: '#f8f8ff', borderTop: '1px solid #e8e8f0', padding: '72px 32px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 30, fontWeight: 900, letterSpacing: '-0.5px', color: '#0a0a14', marginBottom: 48 }}>Frequently asked questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              {
                q: 'How is this different from regular SEO?',
                a: 'SEO optimizes for Google\'s crawler — keywords, backlinks, structured metadata. AI readability is about making your site understandable to LLMs at inference time, when they\'re generating answers. Galui handles both: it improves your schema.org markup (good for SEO too) and adds AI-specific formats like llms.txt and WebMCP that search engines don\'t need but AI agents do.',
              },
              {
                q: 'What exactly does the snippet do?',
                a: 'The snippet (one <script> tag) runs in the browser when visitors load your pages. It extracts content, detects forms and CTAs, logs AI agent visits, registers WebMCP tools, and pushes updated data to Galui\'s backend. It\'s ~12KB, async (never blocks page load), and has zero impact on your Core Web Vitals.',
              },
              {
                q: 'Do I need to change my website\'s backend?',
                a: 'No. The snippet is purely client-side JavaScript. Add it to your <head> and everything works automatically — no server changes, no API integrations, no CMS plugins required.',
              },
              {
                q: 'What is WebMCP?',
                a: 'WebMCP is a new W3C standard (Chrome early preview, February 2026) that lets websites expose their interactions — forms, search, checkout — as callable "tools" for browser-based AI agents. When you install Galui, your site\'s forms are automatically registered as WebMCP tools. This means an AI agent inside Chrome can fill your contact form, search your catalog, or book a demo without any extra work from you.',
              },
              {
                q: 'What is llms.txt?',
                a: 'llms.txt is a plain-text file at /llms.txt on your domain (like robots.txt, but for LLMs). It gives AI systems a curated, machine-readable summary of what your site does and which pages are most important. Galui generates and hosts it automatically based on your indexed content.',
              },
              {
                q: 'Which AI systems will be able to find my site?',
                a: 'ChatGPT (GPTBot + ChatGPT-User), Claude (ClaudeBot), Perplexity (PerplexityBot), Gemini (Google-Extended), Bing Copilot (BingBot), Apple Intelligence (Applebot), and any WebMCP-compatible browser agent. Galui tracks all of them in your analytics dashboard.',
              },
              {
                q: 'Is the scan really free?',
                a: 'Yes — scanning any URL is free with no account required. You get the full AI Readiness Score, score breakdown across 5 dimensions, extracted capabilities, and improvement suggestions. Installing the snippet and getting live tracking requires a paid plan (from $49/year).',
              },
            ].map(({ q, a }, i) => (
              <FaqItem key={i} q={q} a={a} />
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

        /* Feature card hover */
        .feat-card { transition: background 0.2s, transform 0.2s, border-color 0.2s, box-shadow 0.2s; }
        .feat-card:hover { background: #f3f3ff !important; transform: translateY(-3px); border-color: #d0d0f0 !important; box-shadow: 0 8px 32px rgba(99,102,241,0.08); }

        /* Hero animation keyframes */
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.75); }
        }
        @keyframes flow-line {
          0%   { stroke-dashoffset: 60; opacity: 0.2; }
          50%  { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0.2; }
        }
        @keyframes score-ring-fill {
          from { stroke-dasharray: 0 220; }
          to   { stroke-dasharray: 154 220; }
        }
        @keyframes score-count {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ai-pass {
          0%   { opacity: 0.2; transform: scaleX(0.3); }
          50%  { opacity: 1;   transform: scaleX(1); }
          100% { opacity: 0.2; transform: scaleX(0.3); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes crawl-blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }

        /* Responsive hero grid */
        @media (max-width: 860px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-animation { display: none !important; }
        }
      `}</style>
    </div>
  )
}

// ── FAQ accordion item ────────────────────────────────────────────────────────
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid #e8e8f0' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left', padding: '18px 4px',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
          fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: '#0a0a14', lineHeight: 1.4 }}>{q}</span>
        <span style={{ fontSize: 18, color: '#6366f1', flexShrink: 0, fontWeight: 300, transition: 'transform 0.2s', transform: open ? 'rotate(45deg)' : 'none' }}>+</span>
      </button>
      {open && (
        <div style={{ padding: '0 4px 20px', fontSize: 14, color: '#64648a', lineHeight: 1.8 }}>
          {a}
        </div>
      )}
    </div>
  )
}

// ── Scan animation ────────────────────────────────────────────────────────────
function ScanAnimation({ url, progress }) {
  const steps = [
    { label: 'Crawling pages',               icon: '🌐', threshold: 20 },
    { label: 'AI comprehension (4 passes)',   icon: '🧠', threshold: 60 },
    { label: 'Extracting capabilities',       icon: '🔍', threshold: 75 },
    { label: 'Calculating AI Readiness Score',icon: '📊', threshold: 90 },
  ]

  const activeStep = steps.reduce((acc, s, i) => progress >= s.threshold ? i : acc, -1)

  // Fake "pages found" counter that grows with progress
  const pagesFound = Math.floor((progress / 100) * 18)

  // Fake log lines that appear as progress advances
  const logs = [
    { at: 5,  text: `GET /${url.replace(/https?:\/\//, '')} → 200` },
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
      border: '1.5px solid #2a2a40',
      borderRadius: 16,
      overflow: 'hidden',
      fontFamily: "'Inter', monospace",
    }}>
      {/* Terminal top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#13131f', borderBottom: '1px solid #1e1e30' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
        <div style={{ flex: 1, textAlign: 'center', fontSize: 11, color: '#4a4a6a', fontWeight: 600, letterSpacing: '0.3px' }}>
          galui scanner
        </div>
      </div>

      {/* Scanner URL header */}
      <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid #1a1a2e', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 8px #6366f1', animation: 'pulse-dot 1s ease-in-out infinite', flexShrink: 0 }} />
        <div style={{ fontSize: 13, color: '#a5b4fc', fontWeight: 700, fontFamily: 'monospace' }}>
          {url.replace(/https?:\/\//, '')}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: '#4a4a6a' }}>
          {pagesFound} pages
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '0 18px 0', paddingTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#4a4a6a', marginBottom: 5, fontFamily: 'monospace' }}>
          <span>PROGRESS</span>
          <span style={{ color: '#6366f1', fontWeight: 700 }}>{progress}%</span>
        </div>
        <div style={{ background: '#1e1e30', borderRadius: 4, height: 4, overflow: 'hidden', marginBottom: 14 }}>
          <div style={{
            height: '100%', borderRadius: 4,
            background: 'linear-gradient(90deg, #6366f1, #a78bfa)',
            width: `${progress}%`,
            transition: 'width 0.8s ease',
            boxShadow: '0 0 10px rgba(99,102,241,0.6)',
          }} />
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {steps.map((s, i) => {
            const done = progress >= s.threshold
            const active = !done && i === activeStep + 1
            return (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: done || active ? 1 : 0.3, transition: 'opacity 0.4s' }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  background: done ? '#10b98120' : active ? '#6366f115' : '#1a1a2e',
                  border: `1px solid ${done ? '#10b98140' : active ? '#6366f140' : '#252538'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11,
                }}>
                  {done ? '✓' : active
                    ? <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid #6366f1', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
                    : <span style={{ fontSize: 9, color: '#3a3a5c' }}>{i + 1}</span>}
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

      {/* Log output */}
      <div style={{
        margin: '0 18px 14px',
        background: '#080810',
        border: '1px solid #1a1a2e',
        borderRadius: 8,
        padding: '10px 12px',
        height: 90,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        gap: 3,
      }}>
        {logs.slice(-5).map((l, i) => (
          <div key={l.at} style={{
            fontSize: 10, fontFamily: 'monospace',
            color: i === logs.slice(-5).length - 1 ? '#a5b4fc' : '#3a3a5a',
            animation: i === logs.slice(-5).length - 1 ? 'fadeSlideUp 0.3s ease-out both' : 'none',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            <span style={{ color: '#2a2a4a', marginRight: 6 }}>›</span>{l.text}
          </div>
        ))}
        {/* Blinking cursor */}
        <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#6366f1', animation: 'crawl-blink 1s step-end infinite' }}>▋</div>
      </div>
    </div>
  )
}

// ── Hero animation ─────────────────────────────────────────────────────────────
function HeroAnimation() {
  return (
    <div className="hero-animation" style={{
      width: 420, height: 480,
      position: 'relative',
      animation: 'float 5s ease-in-out infinite',
    }}>
      {/* Card background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(145deg, #f0f0ff 0%, #fafaff 60%, #eef0ff 100%)',
        borderRadius: 28,
        border: '1.5px solid #ddddf5',
        boxShadow: '0 20px 60px rgba(99,102,241,0.12), 0 4px 20px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}>
        {/* Decorative top gradient bar */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, #6366f1, #a78bfa, #60a5fa)', borderRadius: '28px 28px 0 0' }} />
      </div>

      {/* Content layers */}
      <div style={{ position: 'relative', zIndex: 1, padding: '28px 28px 24px', display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* ── Step 1: Website URL ── */}
        <AnimStep delay={0} label="01" title="Your website">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#ffffff', border: '1.5px solid #e0e0f0', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ width: 28, height: 20, background: '#e8e8ff', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: 12, height: 2, background: '#6366f1', borderRadius: 2 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0a0a14', letterSpacing: '-0.2px' }}>yourwebsite.com</div>
              <div style={{ fontSize: 10, color: '#a0a0c0', marginTop: 2, display: 'flex', gap: 6 }}>
                <span>12 pages</span>
                <span>·</span>
                <span>4.2k words</span>
              </div>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 3px #10b98120' }} />
          </div>
        </AnimStep>

        {/* Connector arrow */}
        <FlowArrow delay={0.5} />

        {/* ── Step 2: AI pipeline ── */}
        <AnimStep delay={0.7} label="02" title="AI pipeline · 4 passes">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {[
              { label: 'Content extraction', color: '#818cf8', delay: 0.9 },
              { label: 'Capability mapping',  color: '#60a5fa', delay: 1.2 },
              { label: 'Structure analysis',  color: '#a78bfa', delay: 1.5 },
              { label: 'Intent classification', color: '#34d399', delay: 1.8 },
            ].map(({ label, color, delay }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, animation: `pulse-dot 1.8s ease-in-out ${delay}s infinite`, flexShrink: 0 }} />
                <div style={{ flex: 1, height: 5, borderRadius: 3, background: '#e8e8f8', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    background: `linear-gradient(90deg, ${color}80, ${color})`,
                    animation: `ai-pass 1.8s ease-in-out ${delay}s infinite`,
                    transformOrigin: 'left',
                  }} />
                </div>
                <div style={{ fontSize: 10, color: '#9898b8', minWidth: 110, fontWeight: 500 }}>{label}</div>
              </div>
            ))}
          </div>
        </AnimStep>

        {/* Connector arrow */}
        <FlowArrow delay={2.0} />

        {/* ── Step 3: Score result ── */}
        <AnimStep delay={2.2} label="03" title="AI Readiness Score">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#ffffff', border: '1.5px solid #e0e0f0', borderRadius: 12, padding: '12px 16px' }}>
            {/* Mini score ring */}
            <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
              <svg width={56} height={56} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={28} cy={28} r={22} fill="none" stroke="#e8e8f5" strokeWidth={6} />
                <circle cx={28} cy={28} r={22} fill="none" stroke="#6366f1" strokeWidth={6}
                  strokeLinecap="round"
                  style={{ animation: 'score-ring-fill 1.2s ease-out 2.4s both', strokeDasharray: '0 138' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'score-count 0.4s ease-out 3.4s both', opacity: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#6366f1', lineHeight: 1 }}>78</span>
                <span style={{ fontSize: 9, color: '#9898b8' }}>B+</span>
              </div>
            </div>
            {/* Score details */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 7 }}>Ready for AI</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  { d: 'Content', v: 85, c: '#818cf8' },
                  { d: 'Structure', v: 72, c: '#60a5fa' },
                  { d: 'WebMCP', v: 40, c: '#f59e0b' },
                ].map(({ d, v, c }) => (
                  <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontSize: 9, color: '#a0a0c0', width: 46 }}>{d}</div>
                    <div style={{ flex: 1, height: 4, background: '#e8e8f5', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: c, borderRadius: 2, width: `${v}%`, transition: 'width 0.8s ease 3s' }} />
                    </div>
                    <div style={{ fontSize: 9, color: '#9898b8', width: 18, textAlign: 'right' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AnimStep>

        {/* Bottom badge */}
        <div style={{
          marginTop: 'auto', paddingTop: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          animation: 'fadeSlideUp 0.5s ease-out 3.8s both', opacity: 0,
        }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {['ChatGPT', 'Claude', 'Perplexity'].map(name => (
              <span key={name} style={{ fontSize: 9, background: '#6366f110', border: '1px solid #6366f130', color: '#6366f1', padding: '3px 8px', borderRadius: 20, fontWeight: 700 }}>
                {name} ✓
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

function AnimStep({ delay, label, title, children }) {
  return (
    <div style={{ animation: `fadeSlideUp 0.45s ease-out ${delay}s both`, opacity: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
        <div style={{ width: 20, height: 20, borderRadius: 6, background: 'linear-gradient(135deg, #6366f1, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: 'white' }}>{label}</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#4a4a7a', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function FlowArrow({ delay }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      padding: '6px 0', animation: `fadeSlideUp 0.3s ease-out ${delay}s both`, opacity: 0,
    }}>
      <svg width={24} height={20} viewBox="0 0 24 20" fill="none">
        <line x1={12} y1={0} x2={12} y2={14} stroke="#c0c0e0" strokeWidth={1.5} strokeDasharray="3 2" />
        <polyline points="6,12 12,18 18,12" stroke="#c0c0e0" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

// ── Results page (blurred until registered) ────────────────────────────────────
export function ResultsPage({ data, onRegistered }) {
  const { domain, score: rawScore, registry: rawRegistry } = data

  // Defensive defaults — API may return partial data
  const score = {
    total: 0, grade: 'F', label: 'Pending', dimensions: {}, suggestions: [],
    ...rawScore,
  }
  const registry = {
    capabilities: [], metadata: {},
    ...rawRegistry,
  }

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
