import { describe, test, expect, vi, beforeEach } from 'vitest'

// Mock supabase before importing stores
vi.mock('../lib/supabase', () => {
  const { createMockSupabase } = require('./mocks/supabase')
  return { supabase: createMockSupabase() }
})
vi.mock('../utils/logger', () => ({ logError: vi.fn() }))
vi.mock('../utils/toast', () => ({
  showToast: { error: vi.fn(), warn: vi.fn(), success: vi.fn(), delete: vi.fn(), restore: vi.fn() },
}))

import {
  selectBoardColumns,
  selectColumnCards,
  selectBoardCards,
} from '../store/selectors'
import { useBoardStore } from '../store/boardStore'

const SEED = {
  boards: {
    b1: { id: 'b1', name: 'Alpha' },
    b2: { id: 'b2', name: 'Beta' },
  },
  columns: {
    c1: { id: 'c1', board_id: 'b1', title: 'To Do', position: 1 },
    c2: { id: 'c2', board_id: 'b1', title: 'Done', position: 0 },
    c3: { id: 'c3', board_id: 'b2', title: 'Backlog', position: 0 },
  },
  cards: {
    k1: { id: 'k1', board_id: 'b1', column_id: 'c1', position: 1, title: 'Card 1' },
    k2: { id: 'k2', board_id: 'b1', column_id: 'c1', position: 0, title: 'Card 2' },
    k3: { id: 'k3', board_id: 'b1', column_id: 'c2', position: 0, title: 'Card 3' },
    k4: { id: 'k4', board_id: 'b2', column_id: 'c3', position: 0, title: 'Card 4' },
  },
}

beforeEach(() => {
  useBoardStore.setState(SEED)
})

// ─────────────────────────────────────────────
// selectBoardColumns
// ─────────────────────────────────────────────
describe('selectBoardColumns', () => {
  test('returns columns for a board sorted by position', () => {
    const selector = selectBoardColumns('b1')
    const result = selector(useBoardStore.getState())
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('c2') // position 0
    expect(result[1].id).toBe('c1') // position 1
  })

  test('returns empty array for unknown board', () => {
    const selector = selectBoardColumns('nonexistent')
    const result = selector(useBoardStore.getState())
    expect(result).toEqual([])
  })

  test('returns same reference when state has not changed', () => {
    const selector = selectBoardColumns('b1')
    const result1 = selector(useBoardStore.getState())
    const result2 = selector(useBoardStore.getState())
    expect(result1).toBe(result2) // referential equality
  })

  test('returns new reference when columns change', () => {
    const selector = selectBoardColumns('b1')
    const result1 = selector(useBoardStore.getState())

    // Mutate columns
    useBoardStore.setState({
      columns: {
        ...SEED.columns,
        c5: { id: 'c5', board_id: 'b1', title: 'New', position: 2 },
      },
    })

    const result2 = selector(useBoardStore.getState())
    expect(result1).not.toBe(result2) // different reference
    expect(result2).toHaveLength(3)
  })
})

// ─────────────────────────────────────────────
// selectColumnCards
// ─────────────────────────────────────────────
describe('selectColumnCards', () => {
  test('returns cards for a column sorted by position', () => {
    const selector = selectColumnCards('c1')
    const result = selector(useBoardStore.getState())
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('k2') // position 0
    expect(result[1].id).toBe('k1') // position 1
  })

  test('returns empty array for empty column', () => {
    const selector = selectColumnCards('nonexistent')
    const result = selector(useBoardStore.getState())
    expect(result).toEqual([])
  })

  test('returns same reference when state has not changed', () => {
    const selector = selectColumnCards('c1')
    const result1 = selector(useBoardStore.getState())
    const result2 = selector(useBoardStore.getState())
    expect(result1).toBe(result2)
  })
})

// ─────────────────────────────────────────────
// selectBoardCards
// ─────────────────────────────────────────────
describe('selectBoardCards', () => {
  test('returns all cards for a board', () => {
    const selector = selectBoardCards('b1')
    const result = selector(useBoardStore.getState())
    expect(result).toHaveLength(3)
    expect(result.map((c) => c.id).sort()).toEqual(['k1', 'k2', 'k3'])
  })

  test('returns empty array for board with no cards', () => {
    const selector = selectBoardCards('nonexistent')
    const result = selector(useBoardStore.getState())
    expect(result).toEqual([])
  })

  test('returns same reference when state has not changed', () => {
    const selector = selectBoardCards('b1')
    const result1 = selector(useBoardStore.getState())
    const result2 = selector(useBoardStore.getState())
    expect(result1).toBe(result2)
  })
})
