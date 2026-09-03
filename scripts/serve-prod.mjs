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
//
// Hardening (fix round 1, post-review): this is now the production entry
// point for the whole site, so a bug here takes down every route, not just
// `/pricing`.
//   1. `decodeURIComponent` throws `URIError` on a malformed percent-escape
//      (e.g. a bare `%` in the path) — that's an uncaught exception inside
//      the request callback, which is fatal to the whole Node process, not
//      just the one request. `safeDecodeURIComponent` below falls back to
//      the raw pathname on failure; the decoded value only feeds the
//      real-file check, so worst case a malformed path just takes the SPA
//      fallback instead of a direct-file hit — never a crash.
//   2. The rest of the handler (serve-handler itself, our own pre/post
//      logic) is wrapped in try/catch as a backstop, responding 500 instead
//      of letting anything escape the callback.
//
// Hardening (fix round 2, post-review):
//   3. `server.on('error', ...)` catches a boot-time failure (EADDRINUSE,
//      EACCES) and exits non-zero, so Railway sees the process die and
//      restarts it — without this, that error was falling through to the
//      blanket `uncaughtException` handler below, which logged it and kept
//      the process "alive" with nothing actually listening: a silent boot
//      failure Railway would never notice or recover from.
//   4. `uncaughtException` now only logs-and-continues for errors that
//      arrive AFTER the server is listening (checked via `server.listening`)
//      — anything before that point is a genuine startup failure and must
//      crash the process (loudly) rather than be swallowed into the same
//      zombie state `server.on('error')` above exists to prevent.
//   5. `resolvesToRealFile`'s file check now explicitly confirms the
//      resolved path is still inside `DIST` before calling `statSync` —
//      previously that was only true incidentally, because `new URL(...)`
//      happens to collapse `..` segments in `pathname` on its own; this
//      makes it a real, explicit guarantee instead of a borrowed one.
//   6. The 500 fallback in the catch paths now carries the same security
//      headers (`dist/serve.json`) as every normal response, instead of
//      shipping an unprotected error page.
//   7. Missing `dist/serve.json` now fails with a clear, specific message
//      (`npm run build` hasn't been run) instead of an opaque ENOENT thrown
//      from inside a destructuring assignment.
//   8. `directoryListing: false` passed explicitly to serve-handler — this
//      site has no directories meant to be browsed.
import { createServer } from 'node:http'
import { readFileSync, statSync } from 'node:fs'
import { join, dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import handler from 'serve-handler'

const DIST = resolve(join(dirname(fileURLToPath(import.meta.url)), '..', 'dist'))
const PORT = process.env.PORT || 3000
const SERVE_JSON_PATH = join(DIST, 'serve.json')

let headers = []
try {
  ;({ headers = [] } = JSON.parse(readFileSync(SERVE_JSON_PATH, 'utf8')))
} catch (err) {
  throw new Error(
    `[serve-prod] could not read ${SERVE_JSON_PATH} — has \`npm run build\` been run? (${err.message})`,
  )
}

function isRealFile(relPath) {
  const absolute = resolve(join(DIST, relPath))
  // Explicit containment check: the resolved path must still be inside
  // DIST. In practice `new URL(...).pathname` already collapses `..`
  // segments before we ever see `relPath`, but that's a property of the
  // URL parser, not a guarantee this function makes on its own — don't
  // rely on it staying true.
  if (absolute !== DIST && !absolute.startsWith(DIST + sep)) return false
  try {
    return statSync(absolute).isFile()
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

// A malformed percent-escape (e.g. a bare `%` or `%zz`) makes
// decodeURIComponent throw. Fall back to the raw (still-encoded) pathname —
// it's only used to decide whether a real file exists, so the failure mode
// is "miss the file check, take the SPA fallback," never a crash.
function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

// Applies the same security headers every normal response gets (from
// dist/serve.json) before sending a 500. `public/serve.json` currently
// defines a single `source: "**"` rule, so applying every rule's headers
// unconditionally (skipping serve-handler's own path-matching) is
// equivalent here — this is the error path, not the place to reimplement
// serve-handler's router.
function sendServerError(res) {
  if (res.headersSent) {
    res.end()
    return
  }
  for (const rule of headers) {
    for (const h of rule.headers ?? []) {
      res.setHeader(h.key, h.value)
    }
  }
  res.statusCode = 500
  res.end('Internal Server Error')
}

const server = createServer((req, res) => {
  try {
    const pathname = safeDecodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    const spaFallback = resolvesToRealFile(pathname) ? [] : [{ source: '**', destination: '/index.html' }]

    handler(req, res, {
      public: DIST,
      cleanUrls: true,
      directoryListing: false,
      headers,
      rewrites: spaFallback,
    }).catch((err) => {
      console.error('[serve-prod] handler error', err)
      sendServerError(res)
    })
  } catch (err) {
    console.error('[serve-prod] request error', err)
    sendServerError(res)
  }
})

// A boot-time failure (EADDRINUSE, EACCES, ...) must crash the process —
// Railway needs a non-zero exit to know the deploy failed and restart it,
// not a process that stays alive with nothing listening.
server.on('error', (err) => {
  console.error('[serve-prod] fatal listen error', err)
  process.exit(1)
})

// Backstop of last resort for anything that still escapes the per-request
// try/catch above: log and keep the process (and every other in-flight
// request) alive — but only once the server is actually listening. Before
// that, an uncaught error is a genuine startup failure and must be allowed
// to crash the process (same reasoning as `server.on('error')` above);
// swallowing it here would leave a zombie process Railway never restarts.
process.on('uncaughtException', (err) => {
  if (!server.listening) {
    console.error('[serve-prod] fatal startup error', err)
    process.exit(1)
  }
  console.error('[serve-prod] uncaught exception', err)
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[serve-prod] listening on 0.0.0.0:${PORT}, serving ${DIST}`)
})
