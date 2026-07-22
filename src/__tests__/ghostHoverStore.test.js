import { describe, test, expect, beforeEach } from 'vitest'
import { useGhostHoverStore } from '../store/ghostHoverStore'

describe('ghostHoverStore', () => {
  beforeEach(() => useGhostHoverStore.setState({ hoverCardId: null }))

  test('sets and clears the hovered card', () => {
    useGhostHoverStore.getState().setHoverCard('card-1')
    expect(useGhostHoverStore.getState().hoverCardId).toBe('card-1')
    useGhostHoverStore.getState().clearHoverCard()
    expect(useGhostHoverStore.getState().hoverCardId).toBeNull()
  })
})
