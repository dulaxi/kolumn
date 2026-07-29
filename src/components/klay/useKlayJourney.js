import { useEffect, useState } from 'react'
import useReducedMotion from '../../hooks/useReducedMotion'

// Kept tight: a full circuit is 3×(dwell+travel) ≈ 16s — the upsell step is a
// decision screen, so the whole story should land before the user clicks a CTA.
export const DWELL_MS = 4200 // one full loop of the longest scene (converse, 4.0s) + a beat
export const TRAVEL_MS = 1200 // one scurry between adjacent stations (8 × 150ms steps)

/**
 * useKlayJourney — the journey clock for the upsell step. Cycles
 * perform → travel around `stationCount` stations, forever. During
 * 'travel', `station` is the destination. Under prefers-reduced-motion the
 * journey sets no timers; if reduction turns on mid-run it freezes in place
 * (whatever station/phase it was at, not necessarily station 0).
 */
export default function useKlayJourney(stationCount, { dwellMs = DWELL_MS, travelMs = TRAVEL_MS } = {}) {
  const reduced = useReducedMotion()
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
