import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import './fonts.css'
import './index.css'
import App from './App.jsx'
import { useAuthStore } from './store/authStore'
import { applyTheme, pickBootTheme } from './utils/theme'
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

// Register service worker for PWA (production only). In dev, actively
// unregister any stale SW left over from a prior prod/preview run on this
// origin — otherwise it intercepts and caches Vite module requests, serving
// stale/404'd module URLs (e.g. a file that was renamed or moved).
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    })
  } else {
    navigator.serviceWorker.getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {})
  }
}

// Apply persisted theme before first paint to avoid flash. Runs before the
// zustand persist migration, so resolveTheme's legacy-'default'→light
// fallback covers un-migrated values. Public/marketing routes are pinned
// light (their CSS is not dark-ready) — only app shell routes are themed.
const savedTheme = JSON.parse(localStorage.getItem('kolumn-settings') || '{}')?.state?.theme
applyTheme(pickBootTheme(window.location.pathname, savedTheme))

// Initialize auth before rendering
useAuthStore.getState().initialize()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
