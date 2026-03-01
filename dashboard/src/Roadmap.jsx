export function RoadmapPage({ onNavigate }) {
  const now = new Date()

  const QUARTERS = [
    {
      label: 'Q1 2026',
      status: 'shipped',
      title: 'Foundation',
      items: [
        { status: 'done', text: 'AI Readiness Score (5 dimensions, 0-100)', note: 'Shipped Jan 2025' },
        { status: 'done', text: 'GEO Score — 6 LLM breakdown (ChatGPT, Perplexity, Claude, Gemini, Grok, Llama)', note: 'Shipped Feb 2025' },
        { status: 'done', text: 'Site crawler + 4-pass AI comprehension pipeline (Claude)', note: 'Shipped Jan 2025' },
        { status: 'done', text: 'llms.txt auto-generation from crawl', note: 'Shipped Jan 2025' },
        { status: 'done', text: 'WebMCP tool registration', note: 'Shipped Jan 2025' },
        { status: 'done', text: 'AI agent traffic analytics (ChatGPT-User, ClaudeBot, PerplexityBot, etc.)', note: 'Shipped Jan 2025' },
        { status: 'done', text: 'galuli.js snippet v3.1.0 — AI agent detection, WebMCP, llms.txt setup', note: 'Shipped Feb 2025' },
        { status: 'done', text: 'Multi-tenant API key system (free signup)', note: 'Shipped Jan 2025' },
        { status: 'done', text: 'Light/dark mode dashboard', note: 'Shipped Feb 2025' },
        { status: 'done', text: 'galuli.io domain + Railway production hosting', note: 'Shipped Feb 2025' },
      ]
    },
    {
      label: 'Q2 2026',
      status: 'current',
      title: 'AI Accessibility Platform',
      items: [
        { status: 'done', text: 'Lemon Squeezy payments — Free → Starter → Pro upgrade flow', note: 'Shipped Feb 2026' },
        { status: 'done', text: 'robots.txt AI directive audit — detect blocked GPTBot, ClaudeBot, PerplexityBot', note: 'Shipped Mar 2026' },
        { status: 'done', text: 'Schema.org audit — detect missing Organization, FAQPage, HowTo JSON-LD', note: 'Shipped Mar 2026' },
        { status: 'done', text: 'Content Doctor: Information Gain scoring — flag generic content AI skips', note: 'Shipped Mar 2026' },
        { status: 'done', text: 'Content Doctor paywall — Starter plan required, auto-fills from registered domain', note: 'Shipped Mar 2026' },
        { status: 'done', text: 'AI Accessibility positioning — reframed from "GEO tool" to "AI readability platform"', note: 'Shipped Mar 2026' },
        { status: 'in-progress', text: 'Email auth — signup/login with email + magic link', note: 'In progress' },
        { status: 'in-progress', text: 'Score badge SVG — embed in your README or website', note: 'In progress' },
        { status: 'planned', text: 'Email notifications — weekly score reports, significant change alerts', note: 'Planned' },
        { status: 'planned', text: 'Competitor comparison — "How do you compare to [competitor]?"', note: 'Planned' },
      ]
    },
    {
      label: 'Q3 2026',
      status: 'upcoming',
      title: 'Deep Analysis',
      items: [
        { status: 'planned', text: 'Citation tracker — monitor when AI systems mention your brand by name', note: 'Research phase' },
        { status: 'planned', text: 'Content Availability Gap (CAG) detection — queries your site answers vs. what users ask AI', note: 'Research phase' },
        { status: 'planned', text: 'AI hallucination detection — catch when AI systems state wrong facts about you', note: 'Research phase' },
        { status: 'planned', text: 'Historical score tracking — how has your AI accessibility changed over time?', note: 'Planned' },
        { status: 'planned', text: 'Category-level GEO benchmarking — how do you rank vs. competitors in your space?', note: 'Planned' },
        { status: 'planned', text: 'Freshness alerting — notify when content is >30 days stale (76.4% of cited pages updated in 30 days)', note: 'Planned' },
        { status: 'planned', text: 'Chrome extension — instant AI Readiness scan from any page', note: 'Research phase' },
        { status: 'planned', text: 'Webhook support — get notified on score changes or crawler blocks', note: 'Planned' },
      ]
    },
    {
      label: 'Q4 2026',
      status: 'future',
      title: 'Platform & Scale',
      items: [
        { status: 'planned', text: 'White-label / agency plan — resell Galuli under your brand', note: 'Future' },
        { status: 'planned', text: 'Team access / multi-seat dashboard', note: 'Future' },
        { status: 'planned', text: 'AI visibility leaderboard — top-scoring sites by category', note: 'Future' },
        { status: 'planned', text: 'Schema.org JSON-LD auto-injection — add markup to your site without touching code', note: 'Future' },
        { status: 'planned', text: 'OpenAPI auto-generation from crawl', note: 'Future' },
        { status: 'planned', text: 'WordPress plugin — one-click Galuli integration for WP sites', note: 'Future' },
        { status: 'planned', text: 'Zapier / Make integration — trigger workflows on score changes', note: 'Future' },
        { status: 'planned', text: 'API v2 — full programmatic access for enterprise integrations', note: 'Future' },
      ]
    }
  ]

  const PRINCIPLES = [
    {
      icon: '🔭',
      title: 'Measure before recommend',
      body: 'Every feature starts with measurement. We never tell you to do something we can\'t also show you the impact of.'
    },
    {
      icon: '⚡',
      title: 'Ship weekly',
      body: 'We iterate fast. If you have an account, you\'ll see improvements every week — sometimes more often.'
    },
    {
      icon: '🗳️',
      title: 'Customers vote',
      body: 'This roadmap is shaped by what users ask for. Tweet at us, email us, or add a note when you scan — we read everything.'
    },
    {
      icon: '🔓',
      title: 'Transparent by default',
      body: 'We publish this roadmap publicly because we believe our users should know what we\'re building and why.'
    }
  ]

  const statusConfig = {
    done: { icon: '✅', color: 'var(--green)', label: 'Shipped' },
    'in-progress': { icon: '🔵', color: 'var(--blue)', label: 'In Progress' },
    planned: { icon: '⬜', color: 'var(--muted)', label: 'Planned' },
  }

  const quarterConfig = {
    shipped: { badge: 'badge-blue', label: 'Shipped ✓' },
    current: { badge: 'badge-purple', label: '● Now building' },
    upcoming: { badge: 'badge', label: 'Upcoming' },
    future: { badge: 'badge', label: 'Future' },
  }

  return (
    <div className="blog-page">
      {/* Nav */}
      <nav className="blog-nav glass-panel">
        <a href="/" className="blog-logo" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{ fontSize: 22 }}>⬡</span>
          <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--fg)' }}>galuli</span>
        </a>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <a href="/blog" onClick={e => { e.preventDefault(); onNavigate('blog') }} style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: 14 }}>Blog</a>
          <a href="/about" onClick={e => { e.preventDefault(); onNavigate('about') }} style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: 14 }}>About</a>
          <a href="/dashboard/" style={{ textDecoration: 'none' }}>
            <button className="btn btn-primary" style={{ padding: '8px 18px', fontSize: 14 }}>Dashboard →</button>
          </a>
        </div>
      </nav>

      <div className="blog-article">
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 80 }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>🗺️</div>
          <div className="badge badge-purple" style={{ marginBottom: 16 }}>Product Roadmap</div>
          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 800, marginBottom: 20, lineHeight: 1.15 }}>
            Where Galuli is going
          </h1>
          <p style={{ fontSize: 18, color: 'var(--muted)', maxWidth: 560, margin: '0 auto 32px', lineHeight: 1.7 }}>
            This is our public roadmap — what we've shipped, what we're building now, and where we're headed. We update it as we ship.
          </p>
          <p style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            Last updated: March 2026
          </p>
        </div>

        {/* Principles */}
        <section style={{ marginBottom: 80 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, color: 'var(--fg)' }}>How we build</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {PRINCIPLES.map(p => (
              <div key={p.title} className="glass-panel" style={{ padding: 24, borderRadius: 14 }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{p.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--fg)' }}>{p.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section style={{ marginBottom: 80 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 40, color: 'var(--fg)' }}>The roadmap</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
            {QUARTERS.map(quarter => {
              const qConf = quarterConfig[quarter.status]
              return (
                <div key={quarter.label}>
                  {/* Quarter header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{quarter.label}</div>
                    <span className={`badge ${qConf.badge}`} style={{ fontSize: 11 }}>{qConf.label}</span>
                    <div style={{ height: 1, flex: 1, background: 'var(--border)', minWidth: 40 }} />
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)' }}>{quarter.title}</div>
                  </div>

                  {/* Items */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 4 }}>
                    {quarter.items.map((item, i) => {
                      const conf = statusConfig[item.status] || statusConfig.planned
                      return (
                        <div key={i} className={quarter.status === 'shipped' ? 'glass-panel' : ''} style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 14,
                          padding: quarter.status === 'shipped' ? '14px 20px' : '10px 4px',
                          borderRadius: 12,
                          opacity: quarter.status === 'future' ? 0.7 : 1,
                        }}>
                          <span style={{ fontSize: 16, lineHeight: 1.4, flexShrink: 0 }}>{conf.icon}</span>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 15, color: 'var(--fg)', lineHeight: 1.5, textDecoration: item.status === 'done' ? 'none' : 'none' }}>
                              {item.text}
                            </span>
                            {item.note && (
                              <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 10 }}>— {item.note}</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Legend */}
        <section style={{ marginBottom: 80 }}>
          <div className="glass-panel" style={{ padding: '20px 24px', borderRadius: 14, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>Legend:</div>
            {Object.entries(statusConfig).map(([key, conf]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span>{conf.icon}</span>
                <span style={{ color: 'var(--muted)' }}>{conf.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Request a feature */}
        <section style={{ marginBottom: 80 }}>
          <div className="glass-panel" style={{
            padding: '40px 48px',
            borderRadius: 20,
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.08))',
            border: '1px solid rgba(99,102,241,0.2)'
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>💬</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: 'var(--fg)' }}>Have a feature request?</h2>
            <p style={{ fontSize: 16, color: 'var(--muted)', marginBottom: 28, maxWidth: 480, margin: '0 auto 28px' }}>
              We build what users need. If you have a specific feature request, use case, or problem you're trying to solve — tell us. We read every message.
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="mailto:hello@galuli.io?subject=Feature Request" style={{ textDecoration: 'none' }}>
                <button className="btn btn-primary" style={{ padding: '12px 28px' }}>✉️ Email us a request</button>
              </a>
              <a href="https://github.com/yan-yanko/galuli/issues" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                <button className="btn btn-ghost" style={{ padding: '12px 28px' }}>🐛 Open a GitHub issue</button>
              </a>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section style={{ borderTop: '1px solid var(--border)', paddingTop: 60, marginBottom: 40 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 24, textAlign: 'center' }}>
            {[
              { number: '6', label: 'AI systems scored' },
              { number: '5', label: 'Readiness dimensions' },
              { number: 'v3.1.0', label: 'Snippet version' },
              { number: '$0', label: 'To get started' },
            ].map(stat => (
              <div key={stat.label}>
                <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent)', marginBottom: 6 }}>{stat.number}</div>
                <div style={{ fontSize: 14, color: 'var(--muted)' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12, color: 'var(--fg)' }}>Ready to start?</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 28 }}>Free AI Readiness Score. No credit card required. Takes 2 minutes.</p>
          <a href="/" style={{ textDecoration: 'none' }}>
            <button className="btn btn-primary btn-lg">Scan your site →</button>
          </a>
        </div>
      </div>
    </div>
  )
}
