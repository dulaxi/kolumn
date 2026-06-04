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
const BASE_CARDS = {
  k1: { id: 'k1', board_id: 'b1', column_id: 'c1', task_number: 1, title: 'Invest in stocks', priority: 'medium', assignee_name: 'Alice', assignees: ['Alice', 'Bob'], labels: [{ text: '/finance', color: 'blue' }], checklist: [{ text: 'Research', done: false }], description: 'desc', icon: 'currency-dollar', due_date: null, completed: false },
  k2: { id: 'k2', board_id: 'b1', column_id: 'c1', task_number: 2, title: 'Standup notes', priority: 'low' },
  k3: { id: 'k3', board_id: 'b1', column_id: 'c2', task_number: 3, title: 'Standup notes', priority: 'low' },
  k4: { id: 'k4', board_id: 'b2', column_id: 'c3', task_number: 1, title: 'Cross board card', priority: 'medium' },
}

beforeEach(() => {
  useBoardStore.setState({
    boards: SEED_BOARDS,
    columns: SEED_COLUMNS,
    cards: { ...BASE_CARDS },
    _tempIdMap: {},
    activeBoardId: 'b1',
    // Mock duplicateCard to track its call and return a deterministic id.
    // We test that it's called (with the source card's id), not the
    // store-internal logic — that's exercised by manual verify.
    duplicateCard: vi.fn(async (cardId) => {
      // The store keeps the source title verbatim (no suffix). Insert the
      // new card so the executor can read it for the result.
      const src = useBoardStore.getState().cards[cardId]
      if (!src) return null
      const newTitle = src.title
      const newId = `new-${Math.random().toString(36).slice(2)}`
      useBoardStore.setState((s) => ({
        cards: {
          ...s.cards,
          [newId]: {
            id: newId,
            board_id: src.board_id,
            column_id: src.column_id,
            task_number: 99,
            title: newTitle,
            assignees: src.assignees ? [...src.assignees] : undefined,
            assignee_name: src.assignee_name,
            labels: src.labels ? [...src.labels] : [],
            checklist: src.checklist ? src.checklist.map((i) => ({ ...i, done: false })) : [],
            priority: src.priority || 'medium',
            icon: src.icon || null,
            description: src.description || '',
            due_date: src.due_date || null,
            completed: false,
          },
        },
      }))
      return newId
    }),
    updateCard: vi.fn(async () => {}),
  })
})

function lastDuplicateCall() {
  return useBoardStore.getState().duplicateCard.mock.calls.at(-1)
}

describe('executeTool duplicate_card — resolution & scope', () => {
  test('happy path: duplicates a card on the pill board', async () => {
    const res = await executeTool('duplicate_card', {
      card_title: 'Invest in stocks',
      boardId: 'b1',
    })
    expect(res.ok).toBe(true)
    expect(lastDuplicateCall()[0]).toBe('k1')
    expect(res.source).toEqual({ cardId: 'k1', title: 'Invest in stocks' })
    expect(res.resolved.board.id).toBe('b1')
    expect(res.resolved.column.title).toBe('Economics')
    // No "(copy)" suffix — duplicate carries the source title verbatim.
    expect(res.card.title).toBe('Invest in stocks')
  })

  test('cardId direct lookup works in scope', async () => {
    const res = await executeTool('duplicate_card', {
      cardId: 'k1',
      card_title: 'Wrong title',
      boardId: 'b1',
    })
    expect(res.ok).toBe(true)
    expect(lastDuplicateCall()[0]).toBe('k1')
  })

  test('cardId pointing to another board errors under strict scope', async () => {
    const res = await executeTool('duplicate_card', {
      cardId: 'k4',
      boardId: 'b1',
    })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/not on the current board/i)
    expect(useBoardStore.getState().duplicateCard.mock.calls).toHaveLength(0)
  })

  test('card not found on current board errors with board name', async () => {
    const res = await executeTool('duplicate_card', {
      card_title: 'Cross board card',
      boardId: 'b1',
    })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/not found on board "Goals"/i)
  })

  test('multiple cards same title in scope error with column hints', async () => {
    const res = await executeTool('duplicate_card', {
      card_title: 'Standup notes',
      boardId: 'b1',
    })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/multiple cards titled "Standup notes"/i)
    expect(res.error).toContain('Economics')
    expect(res.error).toContain('Achieved')
  })
})

describe('executeTool duplicate_card — to_column', () => {
  test('to_column on current board moves duplicate after creation', async () => {
    const res = await executeTool('duplicate_card', {
      card_title: 'Invest in stocks',
      to_column: 'Achieved',
      boardId: 'b1',
    })
    expect(res.ok).toBe(true)
    // updateCard should have been called to move the duplicate to Achieved (c2)
    const updates = useBoardStore.getState().updateCard.mock.calls
    expect(updates.length).toBe(1)
    expect(updates[0][1]).toEqual({ column_id: 'c2' })
    expect(res.resolved.column.title).toBe('Achieved')
  })

  test('to_column equal to source column does NOT trigger a move', async () => {
    const res = await executeTool('duplicate_card', {
      card_title: 'Invest in stocks',
      to_column: 'Economics',
      boardId: 'b1',
    })
    expect(res.ok).toBe(true)
    expect(useBoardStore.getState().updateCard.mock.calls).toHaveLength(0)
  })

  test('to_column not found on source board errors with available columns', async () => {
    const res = await executeTool('duplicate_card', {
      card_title: 'Invest in stocks',
      to_column: 'Limbo',
      boardId: 'b1',
    })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/column "Limbo" not found on "Goals"/i)
    expect(res.error).toContain('Economics')
    expect(res.error).toContain('Achieved')
  })
})

describe('executeTool duplicate_card — title carry-over', () => {
  test('duplicate keeps the exact source title (no suffix)', async () => {
    const res = await executeTool('duplicate_card', { card_title: 'Invest in stocks', boardId: 'b1' })
    expect(res.card.title).toBe('Invest in stocks')
  })

  test('duplicating a card whose title already contains "(copy)" still keeps the verbatim title', async () => {
    // Pre-seed a card with a parenthetical token in its title; it should pass through unchanged.
    useBoardStore.setState((s) => ({
      cards: {
        ...s.cards,
        k5: { id: 'k5', board_id: 'b1', column_id: 'c1', task_number: 5, title: 'Special (legacy) card', priority: 'medium' },
      },
    }))
    const res = await executeTool('duplicate_card', { card_title: 'Special (legacy) card', boardId: 'b1' })
    expect(res.card.title).toBe('Special (legacy) card')
  })

  test('two duplicates share the same title — next title-based op will trip ambiguity', async () => {
    // First duplicate
    await executeTool('duplicate_card', { card_title: 'Invest in stocks', boardId: 'b1' })
    // Try to operate by title now — there are two "Invest in stocks" cards in scope
    const update = await executeTool('update_card', {
      card_title: 'Invest in stocks',
      updates: { priority: 'high' },
      boardId: 'b1',
    })
    expect(update.ok).toBe(false)
    expect(update.error).toMatch(/multiple cards titled "Invest in stocks"/i)
  })
})

describe('executeTool duplicate_card — assignees regression', () => {
  test('duplicate preserves the assignees array, not just legacy assignee_name', async () => {
    const res = await executeTool('duplicate_card', { card_title: 'Invest in stocks', boardId: 'b1' })
    expect(res.ok).toBe(true)
    // Find the new card by id (title is identical to source, so we can't filter by title alone)
    const newCard = useBoardStore.getState().cards[res.cardId]
    expect(newCard.assignees).toEqual(['Alice', 'Bob'])
    expect(newCard.assignee_name).toBe('Alice')
  })
})
