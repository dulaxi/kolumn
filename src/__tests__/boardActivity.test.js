import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase', () => {
  const { createMockSupabase } = require('./mocks/supabase')
  return { supabase: createMockSupabase() }
})
vi.mock('../utils/logger', () => ({ logError: vi.fn() }))

import { useBoardStore } from '../store/boardStore'
import { ACTIVITY_GROUPS, VERB_PHRASES } from '../constants/activity'

describe('activity constants', () => {
  test('seven groups cover every logged action exactly once', () => {
    expect(ACTIVITY_GROUPS.map((g) => g.key)).toEqual([
      'created', 'moved', 'edited', 'completed', 'deleted', 'labels', 'files',
    ])
    const all = ACTIVITY_GROUPS.flatMap((g) => g.actions)
    expect(new Set(all).size).toBe(all.length) // no action in two groups
    // every action has a verb phrase
    all.forEach((a) => expect(VERB_PHRASES[a], a).toBeTruthy())
  })
})

describe('fetchCardActivity', () => {
  beforeEach(() => useBoardStore.setState({ cardActivityFeed: {} }))

  test('replaces the card list on a fresh fetch', async () => {
    await useBoardStore.getState().fetchCardActivity('c1')
    expect(useBoardStore.getState().cardActivityFeed.c1).toEqual([])
  })

  test('skips falsy and temp ids', async () => {
    await useBoardStore.getState().fetchCardActivity(null)
    await useBoardStore.getState().fetchCardActivity('temp-abc')
    expect(Object.keys(useBoardStore.getState().cardActivityFeed)).toHaveLength(0)
  })

  test('appends when paging with before', async () => {
    useBoardStore.setState({ cardActivityFeed: { c1: [{ id: 'x' }] } })
    await useBoardStore.getState().fetchCardActivity('c1', { before: '2026-01-01' })
    expect(useBoardStore.getState().cardActivityFeed.c1[0]).toEqual({ id: 'x' })
  })
})

describe('fetchBoardActivity', () => {
  beforeEach(() => useBoardStore.setState({ boardActivity: {} }))

  test('replaces the board list on a fresh fetch', async () => {
    await useBoardStore.getState().fetchBoardActivity('b1')
    expect(useBoardStore.getState().boardActivity.b1).toEqual([])
  })

  test('ignores the __all__ pseudo-board', async () => {
    await useBoardStore.getState().fetchBoardActivity('__all__')
    expect(useBoardStore.getState().boardActivity.__all__).toBeUndefined()
  })

  test('appends when paging with before', async () => {
    useBoardStore.setState({ boardActivity: { b1: [{ id: 'x' }] } })
    await useBoardStore.getState().fetchBoardActivity('b1', { before: '2026-01-01' })
    expect(useBoardStore.getState().boardActivity.b1[0]).toEqual({ id: 'x' })
  })
})
