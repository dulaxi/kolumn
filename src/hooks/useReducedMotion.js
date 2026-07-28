import { useRef, useCallback, useSyncExternalStore } from 'react'
import { useSettingsStore } from '../store/settingsStore'

const QUERY = '(prefers-reduced-motion: reduce)'

function hasMatchMedia() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
}

/**
 * useReducedMotion — the effective reduce-motion flag for JS-driven
 * animation (Klay journey, dnd-kit drop animation). The CSS side is
 * handled declaratively in index.css; this hook is only for code that
 * sets timers or configures animation in JS.
 *
 * 'reduced' | 'full' override the OS; 'system' follows the live
 * prefers-reduced-motion media query.
 *
 * The MediaQueryList is fetched from `window.matchMedia` at most once per
 * hook instance (cached in a ref) rather than on every getSnapshot/subscribe
 * call. useSyncExternalStore calls getSnapshot more than once per commit to
 * check for tearing — recomputing via a fresh matchMedia() call each time is
 * harmless in a real browser (the same query returns a stable answer), but
 * would read as a torn/changing snapshot against a test double that swaps
 * its return value between calls. Caching the MediaQueryList keeps every
 * read within a mount consistent.
 */
export default function useReducedMotion() {
  const motion = useSettingsStore((s) => s.motion)
  const mqlRef = useRef(null)

  function getMql() {
    if (mqlRef.current === null && hasMatchMedia()) {
      mqlRef.current = window.matchMedia(QUERY)
    }
    return mqlRef.current
  }

  const subscribe = useCallback((callback) => {
    const mql = getMql()
    if (!mql) return () => {}
    mql.addEventListener('change', callback)
    return () => mql.removeEventListener('change', callback)
  }, [])

  const getSnapshot = useCallback(() => {
    const mql = getMql()
    return mql ? mql.matches : false
  }, [])

  const systemReduced = useSyncExternalStore(subscribe, getSnapshot, () => false)
  if (motion === 'reduced') return true
  if (motion === 'full') return false
  return systemReduced
}
