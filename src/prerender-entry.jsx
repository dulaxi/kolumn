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
// App.jsx's shape inside #root (Suspense → Routes → MarketingLayout → page,
// or — for '/' — Suspense → Routes → LandingPage directly) so hydrateRoot in
// main.jsx finds identical markup.
//
// Every marketing page reached through resolveRouteElements() is static and
// never reaches src/lib/env.js. LandingPage ('/', see renderHome below) is
// the one exception — it reads useAuthStore, which imports the Supabase
// client, which imports env.js and throws without real env vars. See the
// __KOLUMN_EMBED__ flag below for how that's defused without touching
// LandingPage or the store.

// Marks this Node process "embedded" outside Vite/the browser, the same
// escape hatch the design-sync preview bundle uses (see
// .design-sync/embed-flag.js) — env.js substitutes inert placeholders
// instead of throwing when it sees this flag. Must be set before the
// dynamic import() of the auth-store graph in renderHome() runs; as a bare
// top-level statement here (not itself gated behind an import) it always
// does, since that import only fires later, when renderRoute('/') is
// actually called.
globalThis.__KOLUMN_EMBED__ = true

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
// '/' is excluded — it's not a MarketingLayout page (see renderHome below).
async function resolveRouteElements(path) {
  const route = findMarketingRoute(path)
  if (!route?.load) return marketingRouteElements()

  const mod = await route.load()
  const ResolvedComponent = mod.default

  return MARKETING_ROUTES.filter((r) => r.path !== '/').map((r) => (
    <Route
      key={r.path}
      path={r.path}
      element={
        <ErrorBoundary>
          {r.path === route.path ? <ResolvedComponent {...r.props} /> : <r.Component {...r.props} />}
        </ErrorBoundary>
      }
    />
  ))
}

// LandingPage renders outside MarketingLayout (it has its own nav/footer —
// see marketing-routes.js's HOME_ROUTE and MarketingRoutes.jsx), so it gets
// its own small tree instead of going through resolveRouteElements.
//
// Nothing calls the store's real initialize() during a server render (only
// main.jsx does, client-side after hydration), so useAuthStore's default
// state (`loading: true`) would otherwise make LandingPage render its
// "Loading..." gate forever in the prerendered HTML. Pin the snapshot to
// "signed out, done loading" instead — correct for an anonymous crawler or
// a first visit, and no worse than what a signed-in visitor's browser
// already does today whenever hydration's real auth check finishes a beat
// after first paint (LandingPage redirects to /dashboard once it does).
async function renderHome() {
  const { useAuthStore } = await import('./store/authStore')
  // NOT useAuthStore.setState(): zustand's React binding renders server-side
  // via useSyncExternalStore's getServerSnapshot, which reads
  // api.getInitialState() — the state object frozen at store creation —
  // not api.getState(). setState() replaces `state` with a new object and
  // never touches that frozen one, so it's invisible to a server render.
  // Since nothing has called setState yet at this point (initialize() only
  // ever runs client-side, from main.jsx), `state` and the frozen
  // `initialState` are still the same object — mutating it in place keeps
  // both getState() and getInitialState() in sync for this one-shot render.
  Object.assign(useAuthStore.getState(), { loading: false, user: null, session: null, profile: null })
  const { default: LandingPage } = await import('./pages/LandingPage')
  return (
    <Routes>
      <Route path="/" element={<ErrorBoundary><LandingPage /></ErrorBoundary>} />
    </Routes>
  )
}

export async function renderRoute(path) {
  const routes =
    path === '/' ? (
      await renderHome()
    ) : (
      <Routes>
        <Route element={<MarketingLayout />}>{await resolveRouteElements(path)}</Route>
      </Routes>
    )
  const { prelude } = await prerender(
    <div id="root">
      <StaticRouter location={path}>
        <Suspense fallback={null}>{routes}</Suspense>
      </StaticRouter>
    </div>,
    { progressiveChunkSize: Infinity },
  )
  return streamToString(prelude)
}
