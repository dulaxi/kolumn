import { Suspense } from 'react'
import { StaticRouter } from 'react-router-dom'
import { Routes, Route } from 'react-router-dom'
import { prerender } from 'react-dom/static'
import MarketingLayout from './components/marketing/MarketingLayout'
import { marketingRouteElements } from './components/marketing/MarketingRoutes'
import ErrorBoundary from './components/ErrorBoundary'
import { MARKETING_ROUTES, findMarketingRoute } from './content/marketing-routes'

// Build-time renderer for marketing routes. `prerender` (React 19) waits for
// every lazy() route chunk and Suspense boundary to resolve before emitting,
// so the output is the final page, not a fallback. The tree below must match
// App.jsx's shape inside #root (Suspense → Routes → MarketingLayout → page)
// so hydrateRoot in main.jsx finds identical markup.
//
// Nothing imported here may reach src/lib/env.js (it throws without Supabase
// env vars); auth state in the chrome is loaded client-side after hydration.

export { MARKETING_ROUTES, SITE_URL } from './content/marketing-routes'
export { routeMeta, buildHeadTags, headTagsToHtml } from './lib/headMeta'
export { injectIntoTemplate, buildSitemap, buildRobots } from './lib/prerender'

async function streamToString(stream) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let out = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    out += decoder.decode(value, { stream: true })
  }
  return out + decoder.decode()
}

// Waiting for a boundary to settle and inlining it directly in the output
// are two SEPARATE things, and `prerender()` only guarantees the first one.
// MarketingLayout wraps its <Outlet/> in its own local <Suspense> (needed
// for client-side nav — see that file), and Fizz decides per-boundary
// whether to inline a resolved boundary's HTML in place or emit it as an
// out-of-order segment (a <template> placeholder + the real content sitting
// inertly in a hidden sibling <div> + a tiny inline reveal <script>) using
// TWO independent triggers, both of which applied here:
//   1. Genuine suspension. A route's `Component` is `lazy()`, which always
//      suspends on first render — Fizz can't inline something that hasn't
//      resolved yet, so it defers that boundary to a segment even though
//      `prerender()` later waits for it to finish before returning.
//   2. `progressiveChunkSize` (default 12800 bytes — react-dom-server's
//      internal streaming-chunk heuristic). Once a boundary's rendered HTML
//      exceeds this, Fizz treats it as a segment too, INDEPENDENTLY of
//      whether it ever suspended — confirmed empirically: rendering the
//      resolved (non-lazy) PricingPage directly still produced the
//      placeholder/hidden-div/reveal-script shape, because its ~50KB of
//      output is far past the 12800-byte default. A single small component
//      inlines fine; the real page doesn't, regardless of laziness.
// Both are fixed below: `load` resolves the route's module BEFORE calling
// prerender so nothing suspends, and `progressiveChunkSize: Infinity` turns
// off the byte-size segmentation entirely — appropriate here because this
// is a one-shot build-time render (not a live response), so there's no
// reason to trade off inline-vs-progressive delivery. With both, Fizz
// inlines the resolved content directly — no placeholder, no reveal script
// — so a crawler that never runs JS still sees the real page.
async function resolveRouteElements(path) {
  const route = findMarketingRoute(path)
  if (!route?.load) return marketingRouteElements()

  const mod = await route.load()
  const ResolvedComponent = mod.default

  return MARKETING_ROUTES.map((r) => (
    <Route
      key={r.path}
      path={r.path}
      element={
        <ErrorBoundary>{r.path === route.path ? <ResolvedComponent /> : <r.Component />}</ErrorBoundary>
      }
    />
  ))
}

export async function renderRoute(path) {
  const routeElements = await resolveRouteElements(path)
  const { prelude } = await prerender(
    <div id="root">
      <StaticRouter location={path}>
        <Suspense fallback={null}>
          <Routes>
            <Route element={<MarketingLayout />}>{routeElements}</Route>
          </Routes>
        </Suspense>
      </StaticRouter>
    </div>,
    { progressiveChunkSize: Infinity },
  )
  return streamToString(prelude)
}
