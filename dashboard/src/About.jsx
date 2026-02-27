export function AboutPage({ onNavigate }) {
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
          <a href="/roadmap" onClick={e => { e.preventDefault(); onNavigate('roadmap') }} style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: 14 }}>Roadmap</a>
          <a href="/dashboard/" style={{ textDecoration: 'none' }}>
            <button className="btn btn-primary" style={{ padding: '8px 18px', fontSize: 14 }}>Dashboard →</button>
          </a>
        </div>
      </nav>

      <div className="blog-article">
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 80 }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>⬡</div>
          <div className="badge badge-purple" style={{ marginBottom: 16 }}>About Galuli</div>
          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 800, marginBottom: 20, lineHeight: 1.15 }}>
            We're building the SEMrush<br />of the AI era.
          </h1>
          <p style={{ fontSize: 18, color: 'var(--muted)', maxWidth: 620, margin: '0 auto', lineHeight: 1.7 }}>
            Galuli measures how visible your website is to AI systems — ChatGPT, Claude, Perplexity, Gemini, Grok, Llama — and helps you improve that visibility. One script tag. Real data. No guesswork.
          </p>
        </div>

        {/* Origin story */}
        <section style={{ marginBottom: 80 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24, color: 'var(--fg)' }}>The problem we saw</h2>
          <div className="blog-body">
            <p style={{ fontSize: 16, lineHeight: 1.8, color: 'var(--fg)', marginBottom: 20 }}>
              It started with a simple observation: something big was happening to how people find products online, and almost nobody had the right tools to measure it.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.8, color: 'var(--fg)', marginBottom: 20 }}>
              AI systems — ChatGPT, Claude, Perplexity, Gemini — were processing billions of queries per day. They were reading websites, extracting information, synthesizing answers, and making recommendations to millions of users. But unlike Google, which showed clickable results with clear rankings that website owners could measure and optimize for, these AI systems were a black box.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.8, color: 'var(--fg)', marginBottom: 20 }}>
              If an AI system was recommending your competitor instead of you — how would you know? If ChatGPT had an outdated, inaccurate understanding of your product — where would you even see that? If your website was technically invisible to Perplexity's crawler — what would tell you?
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.8, color: 'var(--fg)', marginBottom: 20 }}>
              Nobody had the tools to answer these questions. The SEO industry had 25 years of accumulated tooling — domain authority checkers, rank trackers, technical audit tools, backlink analyzers — but none of it measured what mattered in the AI era.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.8, color: 'var(--fg)' }}>
              So we built Galuli. A platform designed from the ground up to measure and improve AI visibility — the way SEMrush and Ahrefs measure search visibility, but for the new paradigm.
            </p>
          </div>
        </section>

        {/* What we believe */}
        <section style={{ marginBottom: 80 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 32, color: 'var(--fg)' }}>What we believe</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
            {[
              {
                icon: '🎯',
                title: 'Measurement before optimization',
                body: "You can't optimize what you can't measure. Before we recommend any changes to your site, we tell you exactly where you stand across five AI Readiness dimensions and six major AI systems. Data first, always."
              },
              {
                icon: '🌐',
                title: 'AI visibility is a new discipline',
                body: "GEO (Generative Engine Optimization) is not SEO with a new name. It's a fundamentally different discipline with different signals, different mechanics, and different measurement frameworks. We're building the tooling for this new discipline from scratch."
              },
              {
                icon: '⚖️',
                title: 'Small teams deserve big-company visibility',
                body: "Enterprise companies will figure out AI visibility eventually. We want to make sure indie hackers, bootstrapped SaaS companies, and small businesses get there first — with tools that are accessible, not just for companies with dedicated AI/SEO teams."
              },
              {
                icon: '🔬',
                title: 'Standards over tricks',
                body: "There are no shortcuts in AI visibility. We teach and implement the emerging standards — llms.txt, ai-plugin.json, WebMCP, Schema.org — because these are what AI systems actually use, not gaming tricks that stop working when an algorithm updates."
              },
              {
                icon: '📊',
                title: 'Actionable, not informational',
                body: "Too many analytics tools show you dashboards that look great but don't tell you what to do next. Every metric in Galuli comes with specific, prioritized recommendations for improvement. We're obsessed with closing the gap between insight and action."
              },
              {
                icon: '🤖',
                title: 'The AI web is real and growing',
                body: "AI-mediated discovery is not a trend or a experiment. It's a fundamental shift in how information moves online. We believe every website in the world eventually needs to think about AI visibility, and we want to be the tool that helps them do it."
              }
            ].map(item => (
              <div key={item.title} className="glass-panel" style={{ padding: 28, borderRadius: 16 }}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>{item.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, color: 'var(--fg)' }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What Galuli does */}
        <section style={{ marginBottom: 80 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24, color: 'var(--fg)' }}>What Galuli actually does</h2>
          <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 40 }}>
            One script tag on your website unlocks the full Galuli platform:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              {
                step: '01',
                title: 'AI Readiness Score',
                body: 'A 0-100 score across five dimensions: Content Clarity, Structural Legibility, Machine-Readable Signals, Authority & Citation, and Freshness. You see exactly where you stand and exactly what to fix.'
              },
              {
                step: '02',
                title: 'GEO Score (6 AI systems)',
                body: 'Individual scores for ChatGPT, Perplexity, Claude, Gemini, Grok, and Llama. Each LLM weighs different signals differently — we break down what each one cares about and how you can improve.'
              },
              {
                step: '03',
                title: 'AI Agent Analytics',
                body: 'Track which AI systems are visiting your site, which pages they\'re reading, how often, and how that changes over time. See the traffic you\'ve been invisible to.'
              },
              {
                step: '04',
                title: 'Auto-generated llms.txt',
                body: 'Based on your crawl and AI analysis, we generate a production-ready llms.txt file that you can publish with one click. Structured for maximum AI comprehension.'
              },
              {
                step: '05',
                title: 'WebMCP Tool Registration',
                body: 'We automatically register your service with AI agent frameworks so AI tools can discover and interact with your capabilities directly — without guessing.'
              },
            ].map(item => (
              <div key={item.step} className="glass-panel" style={{ padding: '24px 32px', borderRadius: 16, display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                <div style={{
                  fontSize: 13, fontWeight: 800, color: 'var(--accent)',
                  fontFamily: 'var(--font-mono)', minWidth: 32, paddingTop: 2,
                  opacity: 0.7
                }}>{item.step}</div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--fg)' }}>{item.title}</h3>
                  <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tech stack / transparency */}
        <section style={{ marginBottom: 80 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24, color: 'var(--fg)' }}>Built in the open</h2>
          <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 32 }}>
            We believe in transparency about how our tools work. Galuli uses:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { label: 'Backend', value: 'Python / FastAPI' },
              { label: 'Frontend', value: 'React + Vite' },
              { label: 'AI Analysis', value: 'Anthropic Claude (4-pass)' },
              { label: 'Hosting', value: 'Railway (Docker)' },
              { label: 'Crawler', value: 'Custom Python crawler' },
              { label: 'Snippet', value: 'galuli.js v3.1.0' },
            ].map(item => (
              <div key={item.label} className="glass-panel" style={{ padding: '20px 24px', borderRadius: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Plans */}
        <section style={{ marginBottom: 80 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: 'var(--fg)' }}>Pricing that scales with you</h2>
          <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 40 }}>
            Start free. No credit card required.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
            {[
              {
                plan: 'Free',
                price: '$0',
                period: 'forever',
                features: ['3 sites', 'AI Readiness Score', 'GEO Score', 'AI Agent Analytics', '10 req/min'],
                cta: 'Get started',
                highlight: false
              },
              {
                plan: 'Pro',
                price: '$49',
                period: 'per year',
                features: ['50 sites', 'Everything in Free', 'Priority crawl', 'Automated weekly re-scan', '60 req/min', 'Badge generator'],
                cta: 'Go Pro',
                highlight: true
              },
              {
                plan: 'Enterprise',
                price: 'Custom',
                period: 'contact us',
                features: ['999 sites', 'Everything in Pro', 'SSO / team access', 'Dedicated support', 'SLA', '300 req/min'],
                cta: 'Talk to us',
                highlight: false
              },
            ].map(tier => (
              <div key={tier.plan} className="glass-panel" style={{
                padding: 28,
                borderRadius: 16,
                border: tier.highlight ? '1px solid var(--accent)' : '1px solid var(--border)',
                position: 'relative'
              }}>
                {tier.highlight && (
                  <div className="badge badge-purple" style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>Most Popular</div>
                )}
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>{tier.plan}</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--fg)', lineHeight: 1 }}>{tier.price}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>{tier.period}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tier.features.map(f => (
                    <li key={f} style={{ fontSize: 14, color: 'var(--fg)', display: 'flex', gap: 8 }}>
                      <span style={{ color: 'var(--green)' }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <a href="/dashboard/" style={{ textDecoration: 'none' }}>
                  <button className={`btn ${tier.highlight ? 'btn-primary' : 'btn-ghost'}`} style={{ width: '100%', padding: '10px 0' }}>{tier.cta}</button>
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section style={{ textAlign: 'center', padding: '60px 0', borderTop: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12, color: 'var(--fg)' }}>Get in touch</h2>
          <p style={{ fontSize: 16, color: 'var(--muted)', marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' }}>
            Questions about Galuli, GEO, or AI visibility in general? We'd love to hear from you.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="mailto:hello@galuli.io" style={{ textDecoration: 'none' }}>
              <button className="btn btn-primary" style={{ padding: '12px 28px' }}>✉️ hello@galuli.io</button>
            </a>
            <a href="https://github.com/yan-yanko/galuli" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
              <button className="btn btn-ghost" style={{ padding: '12px 28px' }}>⭐ GitHub</button>
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
