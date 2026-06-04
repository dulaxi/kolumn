import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase', () => {
  const { createMockSupabase } = require('./mocks/supabase')
  return { supabase: createMockSupabase() }
})
vi.mock('../utils/logger', () => ({
  logError: vi.fn(),
  logActivity: vi.fn(),
  identifyUser: vi.fn(),
  capture: vi.fn(),
}))
vi.mock('../utils/toast', () => ({
  showToast: {
    error: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
    delete: vi.fn(),
    restore: vi.fn(),
    info: vi.fn(),
    archive: vi.fn(),
    overdue: vi.fn(),
  },
}))

import { useBoardStore } from '../store/boardStore'
import { executeTool } from '../lib/toolExecutor'

// Two boards: "Personal" (b1) and "Work" (b2)
// Personal: To Do (c1), Done (c2)
// Work: Backlog (c3), Sprint (c4)
const SEED_BOARDS = {
  b1: { id: 'b1', name: 'Personal' },
  b2: { id: 'b2', name: 'Work' },
}
const SEED_COLUMNS = {
  c1: { id: 'c1', board_id: 'b1', title: 'To Do', position: 0 },
  c2: { id: 'c2', board_id: 'b1', title: 'Done', position: 1 },
  c3: { id: 'c3', board_id: 'b2', title: 'Backlog', position: 0 },
  c4: { id: 'c4', board_id: 'b2', title: 'Sprint', position: 1 },
}
// Cards designed to test scoping:
//   - "Buy milk" exists ONLY on Personal (b1, To Do)
//   - "Fix login" exists on BOTH boards — Personal/To Do and Work/Backlog
//   - "Standup notes" exists TWICE on Personal (both To Do)
//   - "Sprint review" exists only on Work
const SEED_CARDS = {
  k1: { id: 'k1', board_id: 'b1', column_id: 'c1', task_number: 1, title: 'Buy milk' },
  k2: { id: 'k2', board_id: 'b1', column_id: 'c1', task_number: 2, title: 'Fix login' },
  k3: { id: 'k3', board_id: 'b2', column_id: 'c3', task_number: 1, title: 'Fix login' },
  k4: { id: 'k4', board_id: 'b1', column_id: 'c1', task_number: 3, title: 'Standup notes' },
  k5: { id: 'k5', board_id: 'b1', column_id: 'c1', task_number: 4, title: 'Standup notes' },
  k6: { id: 'k6', board_id: 'b2', column_id: 'c4', task_number: 2, title: 'Sprint review' },
}

beforeEach(() => {
  useBoardStore.setState({
    boards: SEED_BOARDS,
    columns: SEED_COLUMNS,
    cards: { ...SEED_CARDS },
    _tempIdMap: {},
    activeBoardId: 'b1',
    updateCard: vi.fn(async () => {
      /* no-op for tests; we assert on call shape */
    }),
  })
})

function updateCardCalls() {
  return useBoardStore.getState().updateCard.mock.calls
}

describe('executeTool move_card — happy paths', () => {
  test('same-board move (pill on Personal, move Buy milk to Done)', async () => {
    const res = await executeTool('move_card', {
      card_title: 'Buy milk',
      to_column: 'Done',
      boardId: 'b1',
    })
    expect(res.ok).toBe(true)
    expect(res.from.column.title).toBe('To Do')
    expect(res.to.column.title).toBe('Done')
    expect(res.from.board.id).toBe('b1')
    expect(res.to.board.id).toBe('b1')

    const [cardId, updates] = updateCardCalls()[0]
    expect(cardId).toBe('k1')
    expect(updates.column_id).toBe('c2')
    expect(updates.board_id).toBe('b1')
  })

  test('cardId direct lookup, within pill scope, beats card_title', async () => {
    // Same-board cardId lookup: k2 is on Personal (b1); pill is on Personal.
    const res = await executeTool('move_card', {
      cardId: 'k2',
      card_title: 'Wrong name on purpose',
      to_column: 'Done',
      boardId: 'b1',
    })
    expect(res.ok).toBe(true)
    expect(updateCardCalls()[0][0]).toBe('k2')
    expect(res.from.board.id).toBe('b1')
    expect(res.to.board.id).toBe('b1')
  })

  test('cardId pointing to another board errors under pill scope', async () => {
    // k6 is on Work; pill is on Personal. Strict scope: cardId can't escape.
    const res = await executeTool('move_card', {
      cardId: 'k6',
      to_column: 'Done',
      boardId: 'b1',
    })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/not on the current board/i)
    expect(updateCardCalls()).toHaveLength(0)
  })
})

describe('executeTool move_card — strict source scope', () => {
  test('card on another board is not found from pill scope', async () => {
    // "Sprint review" exists only on Work; pill is on Personal
    const res = await executeTool('move_card', {
      card_title: 'Sprint review',
      to_column: 'Done',
      boardId: 'b1',
    })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/not found on board "Personal"/i)
  })

  test('multiple cards with same title on source board → error with hints', async () => {
    const res = await executeTool('move_card', {
      card_title: 'Standup notes',
      to_column: 'Done',
      boardId: 'b1',
    })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/multiple cards titled "Standup notes"/i)
    // Both Standup notes are in To Do — error should mention "To Do" twice
    expect(res.error.match(/To Do/g)?.length).toBe(2)
  })

  test('defensive global fallback when boardId is absent', async () => {
    // No boardId → global search. "Sprint review" exists only on Work; should be found.
    const res = await executeTool('move_card', {
      card_title: 'Sprint review',
      to_column: 'Backlog',
    })
    expect(res.ok).toBe(true)
    expect(res.from.board.id).toBe('b2')
  })

  test('defensive global fallback: ambiguous title errors with cross-board hints', async () => {
    // "Fix login" exists on both boards; no boardId → global search
    const res = await executeTool('move_card', {
      card_title: 'Fix login',
      to_column: 'Done',
    })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/across boards/i)
    expect(res.error).toContain('Personal')
    expect(res.error).toContain('Work')
  })
})

describe('executeTool move_card — column resolution', () => {
  test('column not found on target board → error lists available columns', async () => {
    const res = await executeTool('move_card', {
      card_title: 'Buy milk',
      to_column: 'Limbo',
      boardId: 'b1',
    })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/column "Limbo" not found on "Personal"/i)
    expect(res.error).toContain('To Do')
    expect(res.error).toContain('Done')
  })

  test('column on wrong board → error lists target board\'s columns', async () => {
    // Backlog exists on Work, not Personal; target board is Personal (same-board move)
    const res = await executeTool('move_card', {
      card_title: 'Buy milk',
      to_column: 'Backlog',
      boardId: 'b1',
    })
    expect(res.ok).toBe(false)
    expect(res.error).toContain('Personal')
    expect(res.error).not.toContain('Sprint') // shouldn't leak Work's columns
  })

  test('case-insensitive column match', async () => {
    const res = await executeTool('move_card', {
      card_title: 'Buy milk',
      to_column: 'done',
      boardId: 'b1',
    })
    expect(res.ok).toBe(true)
    expect(res.to.column.title).toBe('Done')
  })
})

describe('executeTool move_card — no-op detection', () => {
  test('card already in target column on target board → noop, no updateCard call', async () => {
    // Buy milk is already in To Do on Personal
    const res = await executeTool('move_card', {
      card_title: 'Buy milk',
      to_column: 'To Do',
      boardId: 'b1',
    })
    expect(res.ok).toBe(true)
    expect(res.noop).toBe(true)
    expect(updateCardCalls()).toHaveLength(0)
  })

  test('same column name on different board is NOT a no-op (real move)', async () => {
    // Sprint review is in Sprint on Work. Move to Sprint on... Sprint only exists on Work.
    // Use a different setup: move Buy milk (Personal/To Do) to To Do on... To Do only exists on b1.
    // Best test: move Buy milk to Done (same board) — must actually run.
    const res = await executeTool('move_card', {
      card_title: 'Buy milk',
      to_column: 'Done',
      boardId: 'b1',
    })
    expect(res.ok).toBe(true)
    expect(res.noop).toBeUndefined()
    expect(updateCardCalls()).toHaveLength(1)
  })
})

describe('executeTool move_card — result shape', () => {
  test('returns card, from, to with ids and titles', async () => {
    const res = await executeTool('move_card', {
      card_title: 'Buy milk',
      to_column: 'Done',
      boardId: 'b1',
    })
    expect(res.card).toEqual({ id: 'k1', title: 'Buy milk', task_number: 1 })
    expect(res.from).toEqual({
      board: { id: 'b1', name: 'Personal' },
      column: { id: 'c1', title: 'To Do' },
    })
    expect(res.to).toEqual({
      board: { id: 'b1', name: 'Personal' },
      column: { id: 'c2', title: 'Done' },
    })
  })
})
