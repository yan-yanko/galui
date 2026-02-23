import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LandingPage, ResultsPage } from './Landing.jsx'

// Simple path-based routing — no react-router needed
// /dashboard/  → dashboard app
// /             → landing page
// /dashboard/?scan=domain → results page
const path = window.location.pathname

function Root() {
  const [scanData, setScanData] = useState(null)

  // If we're at /dashboard/ path, show the dashboard app
  if (path.startsWith('/dashboard')) {
    return <App />
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
