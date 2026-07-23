import { describe, test, expect, vi, beforeEach } from 'vitest'

// Shared chainable supabase mock (same pattern as boardStoreErrors.test.js)
vi.mock('../lib/supabase', () => {
  const { createMockSupabase } = require('./mocks/supabase')
  return { supabase: createMockSupabase() }
})
vi.mock('../utils/logger', () => ({ logError: vi.fn() }))

import { useBoardStore } from '../store/boardStore'

// Per-board card-fetch loading state: while fetchBoardCards is in flight the
// board id sits in _loadingBoardCards so BoardView can render skeletons
// instead of a false "empty board" flash.
describe('fetchBoardCards loading state', () => {
  beforeEach(() => {
    useBoardStore.setState({
      _loadedBoardCards: new Set(),
      _loadingBoardCards: new Set(),
      cards: {},
    })
  })

  test('marks the board as loading synchronously, clears it when done', async () => {
    const promise = useBoardStore.getState().fetchBoardCards('board-1')
    // The mark happens before the first await — visible synchronously.
    expect(useBoardStore.getState()._loadingBoardCards.has('board-1')).toBe(true)
    await promise
    expect(useBoardStore.getState()._loadingBoardCards.has('board-1')).toBe(false)
    expect(useBoardStore.getState()._loadedBoardCards.has('board-1')).toBe(true)
  })

  test('already-loaded boards never enter the loading set', async () => {
    useBoardStore.setState({ _loadedBoardCards: new Set(['board-1']) })
    await useBoardStore.getState().fetchBoardCards('board-1')
    expect(useBoardStore.getState()._loadingBoardCards.has('board-1')).toBe(false)
  })

  test('the __all__ pseudo-board is ignored', async () => {
    await useBoardStore.getState().fetchBoardCards('__all__')
    expect(useBoardStore.getState()._loadingBoardCards.size).toBe(0)
  })
})
