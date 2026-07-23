import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { useGhostHoverStore, GHOST_HOVER_DWELL_MS } from '../store/ghostHoverStore'

describe('ghostHoverStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useGhostHoverStore.setState({ hoverCardId: null })
  })
  afterEach(() => vi.useRealTimers())

  test('hover commits only after the dwell delay (hover intent)', () => {
    useGhostHoverStore.getState().setHoverCard('card-1')
    expect(useGhostHoverStore.getState().hoverCardId).toBeNull()
    vi.advanceTimersByTime(GHOST_HOVER_DWELL_MS)
    expect(useGhostHoverStore.getState().hoverCardId).toBe('card-1')
  })

  test('sweeping across cards never commits — each enter restarts the clock', () => {
    const s = useGhostHoverStore.getState()
    s.setHoverCard('card-1')
    vi.advanceTimersByTime(GHOST_HOVER_DWELL_MS - 20)
    s.setHoverCard('card-2')
    vi.advanceTimersByTime(GHOST_HOVER_DWELL_MS - 20)
    s.setHoverCard('card-3')
    expect(useGhostHoverStore.getState().hoverCardId).toBeNull()
    vi.advanceTimersByTime(GHOST_HOVER_DWELL_MS)
    expect(useGhostHoverStore.getState().hoverCardId).toBe('card-3')
  })

  test('leaving cancels a pending hover and clears a committed one', () => {
    const s = useGhostHoverStore.getState()
    s.setHoverCard('card-1')
    s.clearHoverCard()
    vi.advanceTimersByTime(GHOST_HOVER_DWELL_MS * 2)
    expect(useGhostHoverStore.getState().hoverCardId).toBeNull()

    s.setHoverCard('card-2')
    vi.advanceTimersByTime(GHOST_HOVER_DWELL_MS)
    expect(useGhostHoverStore.getState().hoverCardId).toBe('card-2')
    s.clearHoverCard()
    expect(useGhostHoverStore.getState().hoverCardId).toBeNull()
  })
})
