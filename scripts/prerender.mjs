// Post-build: render every MARKETING_ROUTES entry into dist/<path>.html
// with its head tags, then write sitemap.xml and robots.txt.
// Runs after `vite build` (client) and `vite build --ssr` (dist-ssr).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createHash } from 'node:crypto'

const DIST = 'dist'
const entry = await import('../dist-ssr/prerender-entry.js')
const { MARKETING_ROUTES, SITE_URL, renderRoute, routeMeta, buildHeadTags, headTagsToHtml, injectIntoTemplate, buildSitemap, buildRobots } = entry

const template = readFileSync(join(DIST, 'index.html'), 'utf8')
const lastmod = new Date().toISOString().slice(0, 10)

// A prerendered page can contain a nested (non-outermost) <Suspense>
// boundary — MarketingLayout wraps its <Outlet/> in its own local boundary
// so nav/footer stay mounted across route-level Suspense — and React's Fizz
// renderer always emits ANY such boundary using its out-of-order streaming
// format (placeholder + hidden resolved segment + a tiny inline reveal
// script), even when `prerender()` has already fully resolved everything
// before returning. Without the reveal script running, the resolved content
// stays inertly hidden and hydrateRoot gives up on that boundary. CSP (see
// public/serve.json) blocks inline scripts by default, so we allow-list the
// exact script text via SHA-256 hash instead of 'unsafe-inline' — computed
// fresh per build from what React actually emitted, so it can't drift.
const inlineScriptHashes = new Set()
function collectInlineScriptHashes(html) {
  for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    const hash = createHash('sha256').update(match[1]).digest('base64')
    inlineScriptHashes.add(`'sha256-${hash}'`)
  }
}

for (const route of MARKETING_ROUTES) {
  const body = await renderRoute(route.path)
  const head = headTagsToHtml(buildHeadTags(routeMeta(route)))
  const html = injectIntoTemplate(template, { head, body })
  collectInlineScriptHashes(html)
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

if (inlineScriptHashes.size > 0) {
  const serveJsonPath = join(DIST, 'serve.json')
  const serveConfig = JSON.parse(readFileSync(serveJsonPath, 'utf8'))
  const hashList = [...inlineScriptHashes].join(' ')
  for (const rule of serveConfig.headers ?? []) {
    for (const h of rule.headers ?? []) {
      if (h.key === 'Content-Security-Policy') {
        h.value = h.value.replace(
          /script-src ([^;]*)/,
          (_m, sources) => `script-src ${sources} ${hashList}`,
        )
      }
    }
  }
  writeFileSync(serveJsonPath, JSON.stringify(serveConfig, null, 2))
  console.log(`[prerender] serve.json CSP: allow-listed ${inlineScriptHashes.size} React reveal-script hash(es)`)
}
