import { useEffect, useRef, useState } from 'react'

export const DWELL_MS = 7000 // ≈ 2 loops of a station scene
export const TRAVEL_MS = 2000 // one walk between adjacent stations

/**
 * useKlayJourney — the journey clock for the upsell step. Cycles
 * perform → travel around `stationCount` stations, forever. During
 * 'travel', `station` is the destination. Under prefers-reduced-motion the
 * journey parks at station 0 ('perform') and sets no timers.
 */
export default function useKlayJourney(stationCount, { dwellMs = DWELL_MS, travelMs = TRAVEL_MS } = {}) {
  const reduced = useRef(
    typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ).current
  const [state, setState] = useState({ station: 0, phase: 'perform' })

  useEffect(() => {
    if (reduced) return undefined
    const ms = state.phase === 'perform' ? dwellMs : travelMs
    const timer = setTimeout(() => {
      setState((s) =>
        s.phase === 'perform'
          ? { station: (s.station + 1) % stationCount, phase: 'travel' }
          : { station: s.station, phase: 'perform' }
      )
    }, ms)
    return () => clearTimeout(timer)
  }, [state, stationCount, dwellMs, travelMs, reduced])

  return { ...state, reduced }
}
