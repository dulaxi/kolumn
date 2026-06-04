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

const SEED_BOARDS = {
  b1: { id: 'b1', name: 'Goals' },
  b2: { id: 'b2', name: 'Work' },
}
const SEED_COLUMNS = {
  c1: { id: 'c1', board_id: 'b1', title: 'Economics', position: 0 },
  c2: { id: 'c2', board_id: 'b1', title: 'Achieved', position: 1 },
  c3: { id: 'c3', board_id: 'b2', title: 'Backlog', position: 0 },
}
// "Standup notes" exists twice on Goals to exercise ambiguity.
// "Cross board card" only on Work to exercise strict scope.
const SEED_CARDS = {
  k1: { id: 'k1', board_id: 'b1', column_id: 'c1', task_number: 1, title: 'Invest in stocks', priority: 'medium' },
  k2: { id: 'k2', board_id: 'b1', column_id: 'c1', task_number: 2, title: 'Standup notes', priority: 'low' },
  k3: { id: 'k3', board_id: 'b1', column_id: 'c2', task_number: 3, title: 'Standup notes', priority: 'low' },
  k4: { id: 'k4', board_id: 'b2', column_id: 'c3', task_number: 1, title: 'Cross board card', priority: 'medium' },
}

beforeEach(() => {
  useBoardStore.setState({
    boards: SEED_BOARDS,
    columns: SEED_COLUMNS,
    cards: { ...SEED_CARDS },
    _tempIdMap: {},
    activeBoardId: 'b1',
    // deleteCard is mocked — real one shows an undo toast which involves DOM
    // and a 5s timer. We only assert on call shape here; the undo flow is
    // exercised via manual verify.
    deleteCard: vi.fn(async () => {}),
  })
})

function lastDeleteCall() {
  return useBoardStore.getState().deleteCard.mock.calls.at(-1)
}

describe('executeTool delete_card — resolution', () => {
  test('happy path: deletes by card_title within pill scope', async () => {
    const res = await executeTool('delete_card', {
      card_title: 'Invest in stocks',
      boardId: 'b1',
    })
    expect(res.ok).toBe(true)
    expect(lastDeleteCall()[0]).toBe('k1')
    expect(res.cardId).toBe('k1')
    expect(res.card.title).toBe('Invest in stocks')
    expect(res.resolved.board.id).toBe('b1')
    expect(res.resolved.column.title).toBe('Economics')
  })

  test('cardId direct delete works in scope', async () => {
    const res = await executeTool('delete_card', {
      cardId: 'k1',
      card_title: 'Wrong title',
      boardId: 'b1',
    })
    expect(res.ok).toBe(true)
    expect(lastDeleteCall()[0]).toBe('k1')
  })

  test('cardId pointing to another board errors under strict scope', async () => {
    const res = await executeTool('delete_card', {
      cardId: 'k4',
      boardId: 'b1',
    })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/not on the current board/i)
    expect(useBoardStore.getState().deleteCard.mock.calls).toHaveLength(0)
  })

  test('card not found on current board errors with board name', async () => {
    const res = await executeTool('delete_card', {
      card_title: 'Cross board card',
      boardId: 'b1',
    })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/not found on board "Goals"/i)
    expect(useBoardStore.getState().deleteCard.mock.calls).toHaveLength(0)
  })

  test('multiple cards same title in scope error with column hints', async () => {
    const res = await executeTool('delete_card', {
      card_title: 'Standup notes',
      boardId: 'b1',
    })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/multiple cards titled "Standup notes"/i)
    // One in Economics, one in Achieved
    expect(res.error).toContain('Economics')
    expect(res.error).toContain('Achieved')
    expect(useBoardStore.getState().deleteCard.mock.calls).toHaveLength(0)
  })

  test('defensive global fallback works without boardId', async () => {
    const res = await executeTool('delete_card', {
      card_title: 'Cross board card',
    })
    expect(res.ok).toBe(true)
    expect(res.resolved.board.id).toBe('b2')
  })

  test('defensive global fallback: ambiguous across boards errors with cross-board hints', async () => {
    // Add a duplicate "Cross board card" on Goals to force cross-board ambiguity
    useBoardStore.setState({
      cards: {
        ...SEED_CARDS,
        k5: { id: 'k5', board_id: 'b1', column_id: 'c1', task_number: 5, title: 'Cross board card', priority: 'low' },
      },
    })
    const res = await executeTool('delete_card', { card_title: 'Cross board card' })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/across boards/i)
    expect(res.error).toContain('Goals')
    expect(res.error).toContain('Work')
  })
})

describe('executeTool delete_card — result shape', () => {
  test('returns full card snapshot for future tool-result-loop use', async () => {
    const res = await executeTool('delete_card', {
      card_title: 'Invest in stocks',
      boardId: 'b1',
    })
    expect(res.card).toMatchObject({
      id: 'k1',
      board_id: 'b1',
      column_id: 'c1',
      title: 'Invest in stocks',
      task_number: 1,
      priority: 'medium',
    })
    expect(res.resolved).toEqual({
      board: { id: 'b1', name: 'Goals' },
      column: { id: 'c1', title: 'Economics' },
    })
  })
})
