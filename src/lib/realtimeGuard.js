import { logError } from '../utils/logger'
import { showToast } from '../utils/toast'

// Show the "live updates unavailable" notice at most once per session. This
// guard can fire repeatedly — every reconnect attempt re-runs setup and can
// re-throw — and a toast on each would spam the user with the same message.
let degradedNoticeShown = false

/**
 * Realtime subscription setup can throw *synchronously* — most often when the
 * browser blocks the Supabase WebSocket (a CSP `connect-src` that omits
 * `wss://`, a corporate proxy, or `WebSocket` being unavailable). Supabase-js
 * surfaces this as a synchronous `Error: WebSocket not available` from
 * `.subscribe()`, and if that call runs inside a React effect it escapes into
 * the render cycle and white-screens the entire app.
 *
 * Realtime is an *enhancement* (live cross-device sync), never a requirement:
 * every store already persists through normal REST calls. So this guard runs
 * all channel setup in a try/catch and, on a synchronous failure, returns a
 * safe fallback instead of letting the throw reach React.
 *
 * @param {string}   label    short name for logs, e.g. 'boards' | 'notifications'
 * @param {Function} setupFn  builds + `.subscribe()`s the channel(s); may throw
 * @param {*}        fallback value to return when setup throws — must match the
 *                            shape the caller stores (e.g. `[]` for a channel
 *                            array, `null` for a single channel)
 * @returns the result of setupFn, or `fallback` if it threw
 */
export function guardRealtimeSetup(label, setupFn, fallback) {
  try {
    return setupFn()
  } catch (err) {
    logError(`Realtime setup failed (${label}) — running without live sync:`, err)
    // Tell the user once, gently. `warn` (honey, auto-dismissing) fits a
    // "degraded but fine" state — not `offline`, which is a persistent,
    // undismissable "no network" state that would misrepresent what happened:
    // the app is fully functional over REST; only live cross-device sync is off.
    if (!degradedNoticeShown) {
      degradedNoticeShown = true
      showToast.warn('Live updates are unavailable — your changes still save and sync when you refresh.')
    }
    return fallback
  }
}
