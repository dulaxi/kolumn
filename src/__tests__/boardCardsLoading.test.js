import { describe, test, expect, vi, beforeEach } from 'vitest'

// Shared chainable supabase mock (same pattern as boardStoreErrors.test.js)
vi.mock('../lib/supabase', () => {
  const { createMockSupabase } = require('./mocks/supabase')
  return { supabase: createMockSupabase() }
})
vi.mock('../utils/logger', () => ({ logError: vi.fn() }))
vi.mock('../utils/toast', () => ({
  showToast: new Proxy({}, { get: () => vi.fn() }),
}))

import { useBoardStore } from '../store/boardStore'
import { supabase } from '../lib/supabase'

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

  test('excludes archived cards from the per-board load', async () => {
    supabase._queryBuilder.eq.mockClear()
    await useBoardStore.getState().fetchBoardCards('board-9')
    expect(supabase._queryBuilder.eq.mock.calls).toContainEqual(['archived', false])
  })
})

// Archived cards no longer ride the boot/cross-board load — they're fetched on
// demand, scoped to one board, when the Archived view opens.
describe('fetchArchivedCards (on-demand archived loading)', () => {
  beforeEach(() => {
    useBoardStore.setState({ _loadedArchivedBoards: new Set(), _archivedCounts: {}, cards: {}, cardLabels: {} })
  })

  test('queries archived=true and marks the board loaded (idempotent)', async () => {
    supabase._queryBuilder.eq.mockClear()
    await useBoardStore.getState().fetchArchivedCards('board-1')
    expect(supabase._queryBuilder.eq.mock.calls).toContainEqual(['archived', true])
    expect(useBoardStore.getState()._loadedArchivedBoards.has('board-1')).toBe(true)

    // Second call is a no-op — no further query.
    supabase._queryBuilder.eq.mockClear()
    await useBoardStore.getState().fetchArchivedCards('board-1')
    expect(supabase._queryBuilder.eq.mock.calls).toHaveLength(0)
  })

  test('ignores the __all__ pseudo-board', async () => {
    await useBoardStore.getState().fetchArchivedCards('__all__')
    expect(useBoardStore.getState()._loadedArchivedBoards.size).toBe(0)
  })
})

// The Archived toggle's count must stay live when a card is archived/unarchived
// in-session, even for a board whose archived rows aren't loaded — so the
// cached head count is nudged alongside the optimistic card update.
describe('archived count tracking on in-session archive/unarchive', () => {
  test('archiveCard increments the cached count for a counted board', async () => {
    useBoardStore.setState({
      cards: { c1: { id: 'c1', board_id: 'board-1', archived: false } },
      _archivedCounts: { 'board-1': 3 },
    })
    await useBoardStore.getState().archiveCard('c1')
    expect(useBoardStore.getState().cards.c1.archived).toBe(true)
    expect(useBoardStore.getState()._archivedCounts['board-1']).toBe(4)
  })

  test('unarchiveCard decrements the cached count', async () => {
    useBoardStore.setState({
      cards: { c1: { id: 'c1', board_id: 'board-1', archived: true } },
      _archivedCounts: { 'board-1': 3 },
    })
    await useBoardStore.getState().unarchiveCard('c1')
    expect(useBoardStore.getState()._archivedCounts['board-1']).toBe(2)
  })

  test('never invents a count for an un-counted board', async () => {
    useBoardStore.setState({
      cards: { c2: { id: 'c2', board_id: 'board-2', archived: false } },
      _archivedCounts: {},
    })
    await useBoardStore.getState().archiveCard('c2')
    expect(useBoardStore.getState()._archivedCounts['board-2']).toBeUndefined()
  })
})
