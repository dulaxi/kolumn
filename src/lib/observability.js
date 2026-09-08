import { env } from './env'

// One facade for both telemetry SDKs (error reporting + product analytics).
//
// WHY THIS SHAPE: every vendor SDK is pulled in with a dynamic `import()`
// wrapped in `.catch()`. A static import would make telemetry load-bearing
// for app boot — ES modules fail atomically, so a content blocker (Zen and
// Firefox shields, uBlock Origin, Brave) refusing one request stops the
// entry module executing at all and the user gets a blank page. That was a
// real bug: blockers matched `src/lib/analytics.js` in dev and the
// `sentry-<hash>.js` vendor chunk in prod, and blanked the whole app.
//
// Two rules follow, and `src/__tests__/observability.test.js` enforces both:
//   1. This file's name, and the vendor chunk names in vite.config.js, stay
//      clear of words filter lists match (analytics, sentry, tracking, …).
//   2. Nothing here may throw or reject into the caller. Telemetry going
//      missing is acceptable; telemetry taking the app down is not.

let posthog = null
let sentry = null

// Telemetry calls made before an SDK finishes loading — or while a blocker
// is quietly refusing it — land here rather than being lost outright.
const pending = []

// The queue is only unbounded in the case this whole module exists for: an
// SDK that never arrives because a content blocker refused it. Nothing is
// ever replayed then, so the cap protects memory on a long-lived tab rather
// than preserving fidelity. A slow-but-successful load flushes long before
// 50 events accumulate.
const MAX_PENDING = 50

/**
 * Hold a telemetry call whose SDK has not loaded yet.
 *
 * `run` is a zero-arg closure that performs the call. It is safe to drop:
 * losing an event costs a data point, never correctness. Whatever this
 * function pushes into `pending` is replayed by `flushPending()` as soon as
 * an SDK arrives, and is never replayed at all if none ever does.
 */
function defer(run) {
  // Keep the OLDEST entries and refuse new ones once full. If an SDK does
  // land late, the events worth having are the early ones — sign-in
  // identity and the first error — not the hundredth interaction.
  if (pending.length >= MAX_PENDING) return
  pending.push(run)
}

function flushPending() {
  // Splice first: a replayed call that defers again must not be re-run in
  // this same pass.
  const queued = pending.splice(0, pending.length)
  for (const run of queued) safely(run)
}

// Telemetry must never surface an exception into product code.
function safely(run) {
  try {
    run()
  } catch {
    /* swallowed by design — see the header comment */
  }
}

function withPosthog(use) {
  if (posthog) return safely(() => use(posthog))
  defer(() => posthog && use(posthog))
}

function withSentry(use) {
  if (sentry) return safely(() => use(sentry))
  defer(() => sentry && use(sentry))
}

/**
 * Start both SDKs. Safe to call once, at boot, before anything is
 * configured — each half no-ops when its keys are absent.
 */
export function initObservability() {
  if (env.sentryDsn) {
    import('@sentry/react')
      .then((mod) => {
        mod.init({
          dsn: env.sentryDsn,
          environment: import.meta.env.MODE,
          sampleRate: 1.0,
        })
        sentry = mod
        flushPending()
      })
      .catch(() => {})
  }

  if (env.posthogKey && env.posthogHost) {
    // posthog-js is ~71kB gzip and must never sit on the critical path —
    // first paint, especially for anonymous landing visitors, does not wait
    // on analytics.
    import('posthog-js')
      .then(({ default: ph }) => {
        ph.init(env.posthogKey, {
          api_host: env.posthogHost,
          capture_pageview: true,
          capture_pageleave: true,
          persistence: 'localStorage+cookie',
        })
        posthog = ph
        flushPending()
      })
      .catch(() => {})
  }
}

/* ---------- product analytics ---------- */

export function capture(event, properties = {}) {
  withPosthog((ph) => ph.capture(event, properties))
}

export function identifyUser(userId, properties = {}) {
  withPosthog((ph) => ph.identify(userId, properties))
}

export function resetUser() {
  withPosthog((ph) => ph.reset())
}

/* ---------- error reporting ---------- */

export function captureException(error, context) {
  withSentry((s) => s.captureException(error, context))
}

export function captureMessage(message, level = 'error', context) {
  withSentry((s) => s.captureMessage(message, { level, ...context }))
}

/** Pass `null` to clear the user on sign-out. */
export function setUser(user) {
  withSentry((s) => s.setUser(user))
}
