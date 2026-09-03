// Production static server for Railway (see railway.json's startCommand).
//
// Why this exists instead of `npx serve dist -s`: `serve`'s `-s`/`--single`
// flag makes serve-handler prepend an unconditional `{ source: '**',
// destination: '/index.html' }` rewrite ahead of every other rule. Once any
// rewrite matches a request path, serve-handler's cleanUrls file-existence
// guessing (the mechanism that resolves `/pricing` -> `dist/pricing.html`)
// is skipped entirely for that request — so `-s` makes prerendered marketing
// pages permanently unreachable, unconditionally serving the SPA shell
// instead. There is no `-s` config knob or serve.json rewrite ordering that
// fixes this: a blanket `**` rule matches first-pass regardless of position
// in the rewrites array (see node_modules/serve-handler/src/index.js,
// applyRewrites/findRelated), and path-to-regexp@3.3.0 (serve-handler's
// pinned version) can't compile a negative-lookahead exclusion pattern
// either (nested parens in `:param((?!pricing).*)` fail to parse). Verified
// empirically while implementing prerendering (task-12): `curl /pricing`
// under `serve -s` returned the generic index.html, not the prerendered
// file, even after writing dist/pricing.html per the documented fallback.
//
// This wrapper calls serve-handler directly (same engine `serve` uses, so
// dist/serve.json's CSP/security headers still apply) but decides whether
// to apply the SPA fallback rewrite ourselves, per request: if a real file
// already resolves the path (including cleanUrls' own `<path>.html` /
// `<path>/index.html` guesses — exactly how prerendered marketing pages are
// found), serve it as-is; only fall back to `/index.html` for genuinely
// unmatched paths (client-only routes like `/boards/:id`, `/chat/:id`).
import { createServer } from 'node:http'
import { readFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import handler from 'serve-handler'

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const PORT = process.env.PORT || 3000

const { headers = [] } = JSON.parse(readFileSync(join(DIST, 'serve.json'), 'utf8'))

function isRealFile(path) {
  try {
    return statSync(join(DIST, path)).isFile()
  } catch {
    return false
  }
}

// Mirrors serve-handler's own cleanUrls candidate order (getPossiblePaths):
// try the path itself, then `<path>/index.html`, then `<path>.html`.
function resolvesToRealFile(pathname) {
  const clean = pathname === '/' ? '/index.html' : pathname
  return (
    isRealFile(clean) ||
    isRealFile(join(clean, 'index.html')) ||
    isRealFile(`${clean}.html`)
  )
}

const server = createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  const spaFallback = resolvesToRealFile(pathname) ? [] : [{ source: '**', destination: '/index.html' }]

  return handler(req, res, {
    public: DIST,
    cleanUrls: true,
    headers,
    rewrites: spaFallback,
  })
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[serve-prod] listening on 0.0.0.0:${PORT}, serving ${DIST}`)
})
