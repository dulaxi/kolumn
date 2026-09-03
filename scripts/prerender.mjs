// Post-build: render every MARKETING_ROUTES entry into dist/<path>.html
// with its head tags, then write sitemap.xml and robots.txt.
// Runs after `vite build` (client) and `vite build --ssr` (dist-ssr).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const DIST = 'dist'
const entry = await import('../dist-ssr/prerender-entry.js')
const { MARKETING_ROUTES, SITE_URL, renderRoute, routeMeta, buildHeadTags, headTagsToHtml, injectIntoTemplate, buildSitemap, buildRobots } = entry

const template = readFileSync(join(DIST, 'index.html'), 'utf8')
const lastmod = new Date().toISOString().slice(0, 10)

for (const route of MARKETING_ROUTES) {
  const body = await renderRoute(route.path)
  const head = headTagsToHtml(buildHeadTags(routeMeta(route)))
  const html = injectIntoTemplate(template, { head, body })
  // A build-time-only regression guard, not a runtime dependency: an
  // inline <script> here would mean src/prerender-entry.jsx's
  // no-suspension setup (resolving the route module ahead of `prerender`,
  // `progressiveChunkSize: Infinity`) stopped working and React's Fizz
  // renderer fell back to its out-of-order streaming format again (a
  // <template> placeholder + the real content in a hidden sibling <div> +
  // a reveal script) — which the site's CSP (public/serve.json, no
  // 'unsafe-inline') blocks, silently leaving <main> empty for any crawler
  // that doesn't execute JS. Fail the build instead of shipping that.
  if (/<script>/.test(body)) {
    throw new Error(
      `[prerender] ${route.path} emitted an inline <script> — the page likely regressed to Fizz's ` +
        'out-of-order streaming format (a Suspense boundary suspended or grew past ' +
        'progressiveChunkSize again) and CSP will block it in production. See ' +
        'src/prerender-entry.jsx.',
    )
  }
  // Our production server (scripts/serve-prod.mjs) resolves `/pricing` by
  // checking, in order, a literal file, `pricing/index.html`, then
  // `pricing.html` — matching serve-handler's own cleanUrls candidate
  // order. Either `dist/pricing/index.html` or `dist/pricing.html` would
  // resolve correctly through it; `.html` is used here because it also
  // matches what a bare `npx serve dist` (no flags) resolves via cleanUrls
  // without any extra config.
  const file = join(DIST, `${route.path}.html`)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, html)
  console.log(`[prerender] ${route.path} → ${file} (${html.length} bytes)`)
}

writeFileSync(join(DIST, 'sitemap.xml'), buildSitemap(SITE_URL, ['/', ...MARKETING_ROUTES.map((r) => r.path)], lastmod))
writeFileSync(join(DIST, 'robots.txt'), buildRobots(SITE_URL))
console.log(`[prerender] sitemap.xml (${MARKETING_ROUTES.length + 1} urls), robots.txt`)
