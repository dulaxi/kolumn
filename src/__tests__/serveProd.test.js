// @vitest-environment node
//
// Regression coverage for scripts/serve-prod.mjs (Railway's production
// entry point — see that file's header comment for the full hardening
// history). Spawns the real server as a child process and throws hostile
// input at it: a malformed percent-escape in the URL used to crash the
// whole Node process (decodeURIComponent throwing inside the request
// callback is an uncaught exception, which is fatal). This test proves the
// process survives that request and keeps serving the REAL prerendered page
// afterward — not just any 200 (the SPA fallback also returns 200 for an
// unmatched path, so asserting on status alone wouldn't catch a regression
// back to `serve -s` semantics, which made every prerendered page
// unreachable while still returning 200 for the SPA shell).
//
// Requires a built `dist/` (the server reads dist/serve.json and serves
// dist/*) — skips itself when that's absent (e.g. a clean checkout before
// `npm run build`) rather than failing for an unrelated reason.
import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DIST_INDEX = join(ROOT, 'dist', 'index.html')
const SERVER_SCRIPT = join(ROOT, 'scripts', 'serve-prod.mjs')
const built = existsSync(DIST_INDEX)

// Ephemeral-range port, randomized to avoid collisions with a lingering
// process from a previous interrupted run.
const PORT = 41000 + Math.floor(Math.random() * 5000)
const BASE_URL = `http://127.0.0.1:${PORT}`

let child

async function waitForServer(timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/robots.txt`)
      if (res.status) return
    } catch {
      // not up yet — keep polling
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error(`serve-prod did not start listening on ${PORT} within ${timeoutMs}ms`)
}

function isAlive(proc) {
  if (!proc || proc.exitCode !== null || proc.signalCode !== null) return false
  try {
    // Sending signal 0 doesn't kill the process — it just checks it exists.
    process.kill(proc.pid, 0)
    return true
  } catch {
    return false
  }
}

describe.runIf(built)('serve-prod hardening', () => {
  beforeAll(async () => {
    child = spawn(process.execPath, [SERVER_SCRIPT], {
      env: { ...process.env, PORT: String(PORT) },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    await waitForServer()
  }, 15000)

  afterAll(async () => {
    if (child && isAlive(child)) {
      child.kill('SIGKILL')
      await new Promise((r) => setTimeout(r, 100))
    }
  })

  test(
    'a malformed percent-escape in the path does not crash the server',
    async () => {
      // Bare `%` is an invalid percent-escape — decodeURIComponent throws
      // on it. This must not take the process down.
      await fetch(`${BASE_URL}/%`)
      expect(isAlive(child)).toBe(true)
    },
    15000,
  )

  test('the real prerendered page — not just any 200 — still serves after the hostile request', async () => {
    // Status alone can't catch a regression to `serve -s` semantics: the
    // SPA fallback also answers 200 for /pricing (it just serves the
    // generic shell instead of the prerendered file), so this has to check
    // the body actually is the prerendered page.
    const res = await fetch(`${BASE_URL}/pricing`)
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('<title>Pricing — Kolumn</title>')
    expect(body).toMatch(/<main[^>]*>[\s\S]*<h1/)
  }, 15000)
})

describe.skipIf(built)('serve-prod hardening (skipped)', () => {
  test('skipped — dist/ is not built', () => {
    expect(built).toBe(false)
  })
})
