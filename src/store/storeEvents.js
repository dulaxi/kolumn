import { logError } from '../utils/logger'

// A tiny pub/sub for cross-cutting store lifecycle events, so stores don't have
// to import one another. Previously authStore reached into boardStore /
// noteStore / workspacesStore / boardSharingStore to reset them, and
// workspacesStore reached into boardStore to refetch — but those stores import
// authStore (to read the user), so a static import would be circular. The
// workaround was dynamic import() scattered across actions.
//
// This bus imports nothing from any store — stores import the bus — so the
// dependency graph stays a one-directional DAG with no cycles and no dynamic
// imports. Emitters don't know who listens; listeners don't know who emits.
//
// Events:
//   'session:reset'  — auth was cleared or the user changed; tenant-scoped
//                      stores reset their own state.
//   'boards:refetch' — the set of accessible boards changed (workspace join /
//                      leave); the board stores reload themselves.
const listeners = new Map()

export function onStoreEvent(event, handler) {
  if (!listeners.has(event)) listeners.set(event, new Set())
  listeners.get(event).add(handler)
  return () => listeners.get(event)?.delete(handler)
}

export function emitStoreEvent(event) {
  listeners.get(event)?.forEach((handler) => {
    try {
      handler()
    } catch (err) {
      logError(`storeEvent "${event}" handler failed:`, err)
    }
  })
}
