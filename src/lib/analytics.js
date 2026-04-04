import posthog from 'posthog-js'
import { env } from './env'

let initialized = false

export function initAnalytics() {
  if (!env.posthogKey || !env.posthogHost) return
  posthog.init(env.posthogKey, {
    api_host: env.posthogHost,
    capture_pageview: true,
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
  })
  initialized = true
}

export function identifyUser(userId, properties = {}) {
  if (!initialized) return
  posthog.identify(userId, properties)
}

export function resetUser() {
  if (!initialized) return
  posthog.reset()
}

export function capture(event, properties = {}) {
  if (!initialized) return
  posthog.capture(event, properties)
}
