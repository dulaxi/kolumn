import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useKlayJourney, { DWELL_MS, TRAVEL_MS } from '../components/klay/useKlayJourney'

afterEach(() => {
  vi.useRealTimers()
})

describe('useKlayJourney', () => {
  it('starts performing at station 0', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useKlayJourney(3))
    expect(result.current).toMatchObject({ station: 0, phase: 'perform', reduced: false })
  })

  it('cycles perform → travel → perform and wraps 2 → 0', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useKlayJourney(3))

    act(() => vi.advanceTimersByTime(DWELL_MS))
    expect(result.current).toMatchObject({ station: 1, phase: 'travel' })

    act(() => vi.advanceTimersByTime(TRAVEL_MS))
    expect(result.current).toMatchObject({ station: 1, phase: 'perform' })

    act(() => vi.advanceTimersByTime(DWELL_MS))
    expect(result.current).toMatchObject({ station: 2, phase: 'travel' })
    act(() => vi.advanceTimersByTime(TRAVEL_MS))
    act(() => vi.advanceTimersByTime(DWELL_MS))
    expect(result.current).toMatchObject({ station: 0, phase: 'travel' })
  })

  it('honors custom timing options', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useKlayJourney(3, { dwellMs: 100, travelMs: 50 }))
    act(() => vi.advanceTimersByTime(100))
    expect(result.current).toMatchObject({ station: 1, phase: 'travel' })
    act(() => vi.advanceTimersByTime(50))
    expect(result.current).toMatchObject({ station: 1, phase: 'perform' })
  })

  it('parks at station 0 with no timers under prefers-reduced-motion', () => {
    vi.useFakeTimers()
    window.matchMedia.mockImplementationOnce((query) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    const { result } = renderHook(() => useKlayJourney(3))
    expect(result.current).toMatchObject({ station: 0, phase: 'perform', reduced: true })
    act(() => vi.advanceTimersByTime(DWELL_MS * 5))
    expect(result.current).toMatchObject({ station: 0, phase: 'perform' })
  })
})
