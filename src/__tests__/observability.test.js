import { describe, test, expect, vi } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Regression guard for the "blank page behind a content blocker" bug.
//
// Zen/Firefox with shields on (and uBlock Origin, Brave, etc.) block any
// request whose URL looks like tracking. It blocked `src/lib/analytics.js`
// in dev and the `sentry-<hash>.js` vendor chunk in prod. Because both were
// STATIC imports in the entry graph, and ES modules fail atomically, one
// blocked request stopped `main.jsx` executing at all — React never mounted
// and the user saw the bare cream <body>.
//
// Two independent defences, tested separately:
//   1. Don't hand blockers a filename to match on.
//   2. Never let a telemetry SDK be load-bearing for boot.

// Vitest runs from the project root; import.meta.url is a vite-style
// bare path here, so anchor on cwd instead.
const ROOT = process.cwd()
const SRC = join(ROOT, 'src')

// Tokens common ad-block filter lists match against a URL path.
const BLOCKED_NAME = /analytics|sentry|posthog|tracking|telemetry|gtag|gtm/i

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

describe('telemetry cannot be blocked into a blank page', () => {
  test('no source module is named after a tracking keyword', () => {
    const offenders = walk(SRC)
      .filter((f) => /\.(js|jsx)$/.test(f))
      .filter((f) => !f.includes('__tests__'))
      .filter((f) => BLOCKED_NAME.test(f.split('/').pop()))
      .map((f) => f.slice(ROOT.length))

    expect(offenders).toEqual([])
  })

  test('no vite manual chunk is named after a tracking keyword', () => {
    const config = readFileSync(join(ROOT, 'vite.config.js'), 'utf8')
    const chunkBlock = config.slice(
      config.indexOf('VENDOR_CHUNKS'),
      config.indexOf('function vendorChunkOf'),
    )
    // Chunk NAMES become filenames on disk; the package names on the
    // right-hand side only ever match node_modules paths at build time and
    // never appear in a URL, so they are not a blocking risk.
    const names = [...chunkBlock.matchAll(/^\s*'?([\w-]+)'?:\s*\[/gm)].map((m) => m[1])

    expect(names.filter((n) => BLOCKED_NAME.test(n))).toEqual([])
  })

  test('a telemetry SDK that fails to load does not throw', async () => {
    vi.resetModules()
    // Without keys, initObservability() skips both import() calls and this
    // test would pass even with the .catch() handlers deleted. Force the
    // configured path so the rejections are actually raised.
    vi.doMock('../lib/env', () => ({
      env: {
        sentryDsn: 'https://k@o.ingest.sentry.io/1',
        posthogKey: 'phc_x',
        posthogHost: 'https://x',
      },
    }))
    vi.doMock('posthog-js', () => {
      throw new Error('blocked by client')
    })
    vi.doMock('@sentry/react', () => {
      throw new Error('blocked by client')
    })

    const obs = await import('../lib/observability')
    obs.initObservability()
    await new Promise((r) => setTimeout(r, 0))

    // Every exported call must survive the SDK never arriving.
    expect(() => obs.capture('board_created', { id: 1 })).not.toThrow()
    expect(() => obs.identifyUser('user-1', { email: 'a@b.c' })).not.toThrow()
    expect(() => obs.resetUser()).not.toThrow()
    expect(() => obs.captureException(new Error('boom'))).not.toThrow()
    expect(() => obs.captureMessage('hello', 'warning')).not.toThrow()
    expect(() => obs.setUser({ id: 'user-1' })).not.toThrow()
  })

  test('calls made before the SDK lands are replayed once it arrives', async () => {
    vi.resetModules()
    vi.doMock('../lib/env', () => ({
      env: { sentryDsn: null, posthogKey: 'phc_x', posthogHost: 'https://x' },
    }))
    const captured = []
    let resolveSdk
    const sdk = new Promise((r) => {
      resolveSdk = r
    })
    vi.doMock('posthog-js', () => sdk)

    const obs = await import('../lib/observability')
    obs.initObservability()

    // Fired while the SDK is still in flight — must not be lost.
    obs.capture('early_event', { n: 1 })

    resolveSdk({
      default: {
        init() {},
        capture: (event, props) => captured.push([event, props]),
        identify() {},
        reset() {},
      },
    })
    await new Promise((r) => setTimeout(r, 0))

    expect(captured).toEqual([['early_event', { n: 1 }]])
  })

  test('the pending queue is capped so a blocked SDK cannot grow it forever', async () => {
    vi.resetModules()
    vi.doMock('../lib/env', () => ({
      env: { sentryDsn: null, posthogKey: 'phc_x', posthogHost: 'https://x' },
    }))
    let resolveSdk
    const sdk = new Promise((r) => {
      resolveSdk = r
    })
    vi.doMock('posthog-js', () => sdk)

    const obs = await import('../lib/observability')
    obs.initObservability()

    // Simulates a blocked SDK: thousands of events with nothing to flush to.
    for (let i = 0; i < 5000; i++) obs.capture('spam', { i })

    const captured = []
    resolveSdk({
      default: {
        init() {},
        capture: (event, props) => captured.push(props.i),
        identify() {},
        reset() {},
      },
    })
    await new Promise((r) => setTimeout(r, 0))

    // Bounded, and the retained events are the earliest ones.
    expect(captured.length).toBeLessThanOrEqual(50)
    expect(captured[0]).toBe(0)
  })
})
