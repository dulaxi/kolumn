import { Suspense, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import MarketingNav from './MarketingNav'
import MarketingFooter from './MarketingFooter'
import { applyTheme } from '../../utils/theme'

// Layout route for every prerendered marketing page. Owns the chrome, the
// skip link, head meta on client-side navigation (the prerender script
// writes the same tags at build time), and the light-only theme pin.
//
// The <Outlet /> gets its own local Suspense: each MARKETING_ROUTES page is
// lazy-loaded, and without a boundary here the suspend bubbles all the way
// to the root with no ancestor Suspense to catch it (App.jsx's outer one
// wraps <Routes>, but the chrome below still needs to commit immediately
// rather than blank out during page loads/navigations) — this keeps the
// nav/skip-link/footer on screen while only the main region waits.
//
// Do not "simplify" this away: a lazy route component suspending with no
// ancestor Suspense boundary withholds the ENTIRE render, not just the
// suspending subtree — nav, skip link and footer included. Verified via a
// direct render probe (see task-8-report.md); the MarketingLayout tests
// would go blank on mount without this boundary.
export default function MarketingLayout() {
  useEffect(() => {
    applyTheme('light')
  }, [])

  return (
    <div className="landing-font min-h-screen bg-[var(--surface-page)] flex flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:px-3 focus:py-2 focus:rounded-lg focus:border focus:border-[var(--border-default)] focus:bg-[var(--surface-card)] focus:text-[var(--text-primary)]"
      >
        Skip to content
      </a>
      <MarketingNav />
      <main id="main" className="flex-1">
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>
      <MarketingFooter />
    </div>
  )
}
