import { Suspense } from 'react'
import { StaticRouter } from 'react-router-dom'
import { Routes, Route } from 'react-router-dom'
import { prerender } from 'react-dom/static'
import MarketingLayout from './components/marketing/MarketingLayout'
import { marketingRouteElements } from './components/marketing/MarketingRoutes'

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

export async function renderRoute(path) {
  const { prelude } = await prerender(
    <div id="root">
      <StaticRouter location={path}>
        <Suspense fallback={null}>
          <Routes>
            <Route element={<MarketingLayout />}>{marketingRouteElements()}</Route>
          </Routes>
        </Suspense>
      </StaticRouter>
    </div>,
  )
  return streamToString(prelude)
}
