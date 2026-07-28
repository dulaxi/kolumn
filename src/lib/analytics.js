import { env } from './env'

// posthog-js is ~71kB gzip. It's loaded lazily (dynamic import) so it never
// sits on the initial critical bundle — first paint, especially for anonymous
// landing visitors, must not wait on analytics. The module reference is held
// once resolved; calls made before it loads no-op (guarded by `initialized`),
// which is an acceptable tradeoff for a few hundred ms of early events.
let posthog = null
let initialized = false

export function initAnalytics() {
  if (!env.posthogKey || !env.posthogHost) return
  import('posthog-js')
    .then(({ default: ph }) => {
      ph.init(env.posthogKey, {
        api_host: env.posthogHost,
        capture_pageview: true,
        capture_pageleave: true,
        persistence: 'localStorage+cookie',
      })
      posthog = ph
      initialized = true
    })
    .catch(() => {})
}

export function identifyUser(userId, properties = {}) {
  if (!initialized || !posthog) return
  posthog.identify(userId, properties)
}

export function resetUser() {
  if (!initialized || !posthog) return
  posthog.reset()
}

export function capture(event, properties = {}) {
  if (!initialized || !posthog) return
  posthog.capture(event, properties)
}
