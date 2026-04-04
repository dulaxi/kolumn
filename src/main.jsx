import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/mona-sans'
import '@fontsource/spectral/400.css'
import '@fontsource/spectral/600.css'
import '@fontsource/spectral/700.css'
import '@fontsource/google-sans/latin-400.css'
import '@fontsource/google-sans/latin-500.css'
import '@fontsource/google-sans/latin-700.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import './index.css'
import App from './App.jsx'
import { useAuthStore } from './store/authStore'
import * as Sentry from '@sentry/react'
import { env } from './lib/env'
import { initAnalytics } from './lib/analytics'

// Initialize Sentry (no-op if DSN not configured)
if (env.sentryDsn) {
  Sentry.init({
    dsn: env.sentryDsn,
    environment: import.meta.env.MODE,
    sampleRate: 1.0,
  })
}

// Initialize product analytics (no-op if keys not configured)
initAnalytics()

// Global error handlers — catch unhandled errors and rejections
window.addEventListener('error', (event) => {
  console.error('[Kolumn] Unhandled error:', event.error || event.message)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Kolumn] Unhandled promise rejection:', event.reason)
})

// Register service worker for PWA (production only)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

// Initialize auth before rendering
useAuthStore.getState().initialize()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
