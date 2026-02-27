import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LandingPage, ResultsPage } from './Landing.jsx'
import { BlogListPage, BlogPostPage } from './Blog.jsx'
import { AboutPage } from './About.jsx'
import { RoadmapPage } from './Roadmap.jsx'

// Simple path-based routing — no react-router needed
// /dashboard/  → dashboard app
// /             → landing page
// /blog         → blog list
// /blog/[slug]  → individual post
// /about        → about page
// /roadmap      → product roadmap
const path = window.location.pathname

function Root() {
  const [scanData, setScanData] = useState(null)
  // For blog/about/roadmap in-app navigation (so we don't need a full page reload)
  const [contentPage, setContentPage] = useState(() => {
    if (path.startsWith('/blog/')) return { page: 'post', slug: path.replace('/blog/', '').replace(/\/$/, '') }
    if (path === '/blog' || path === '/blog/') return { page: 'blog' }
    if (path === '/about' || path === '/about/') return { page: 'about' }
    if (path === '/roadmap' || path === '/roadmap/') return { page: 'roadmap' }
    return null
  })

  const handleContentNavigate = (page, slug) => {
    setContentPage(slug ? { page, slug } : { page })
    window.scrollTo(0, 0)
    // Update browser URL without reload
    const newPath = slug ? `/${page}/${slug}` : `/${page}`
    window.history.pushState({}, '', newPath)
  }

  // Dashboard app
  if (path.startsWith('/dashboard')) {
    return <App />
  }

  // Content pages (blog, about, roadmap) — with in-app navigation
  if (contentPage) {
    if (contentPage.page === 'blog') {
      return <BlogListPage onNavigate={handleContentNavigate} />
    }
    if (contentPage.page === 'post') {
      return <BlogPostPage slug={contentPage.slug} onNavigate={handleContentNavigate} />
    }
    if (contentPage.page === 'about') {
      return <AboutPage onNavigate={handleContentNavigate} />
    }
    if (contentPage.page === 'roadmap') {
      return <RoadmapPage onNavigate={handleContentNavigate} />
    }
  }

  // Landing: show results page after scan completes
  if (scanData) {
    return <ResultsPage data={scanData} onRegistered={() => {}} />
  }

  // Default: landing page
  return <LandingPage onScanComplete={setScanData} />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
