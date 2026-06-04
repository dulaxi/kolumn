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
// Seed with intentional collisions:
//   - "Invest in stocks" on Goals only
//   - "Standup notes" twice on Goals (Economics) — ambiguity within scope
//   - "Cross board card" only on Work
const SEED_CARDS = {
  k1: { id: 'k1', board_id: 'b1', column_id: 'c1', task_number: 1, title: 'Invest in stocks', priority: 'medium', assignee_name: 'Alice', due_date: '2026-06-01', icon: 'currency-dollar', labels: [], checklist: [], completed: false },
  k2: { id: 'k2', board_id: 'b1', column_id: 'c1', task_number: 2, title: 'Standup notes', priority: 'low', completed: false },
  k3: { id: 'k3', board_id: 'b1', column_id: 'c1', task_number: 3, title: 'Standup notes', priority: 'low', completed: false },
  k4: { id: 'k4', board_id: 'b2', column_id: 'c3', task_number: 1, title: 'Cross board card', priority: 'medium', completed: false },
}

beforeEach(() => {
  useBoardStore.setState({
    boards: SEED_BOARDS,
    columns: SEED_COLUMNS,
    cards: { ...SEED_CARDS },
    _tempIdMap: {},
    activeBoardId: 'b1',
    updateCard: vi.fn(async () => {
      /* mock: assert on call shape, not real side effects */
    }),
  })
})

function lastUpdateCall() {
  return useBoardStore.getState().updateCard.mock.calls.at(-1)
}

describe('executeTool update_card — resolution & scope', () => {
  test('happy path: same-board single-field change', async () => {
    const res = await executeTool('update_card', {
      card_title: 'Invest in stocks',
      updates: { priority: 'high' },
      boardId: 'b1',
    })
    expect(res.ok).toBe(true)
    const [cardId, payload] = lastUpdateCall()
    expect(cardId).toBe('k1')
    expect(payload.priority).toBe('high')
    expect(payload.title).toBeUndefined() // didn't touch other fields
    expect(res.changed).toContain('priority')
  })

  test('cardId direct lookup works in scope', async () => {
    const res = await executeTool('update_card', {
      cardId: 'k1',
      card_title: 'Wrong name on purpose',
      updates: { priority: 'low' },
      boardId: 'b1',
    })
    expect(res.ok).toBe(true)
    expect(lastUpdateCall()[0]).toBe('k1')
  })

  test('cardId pointing to another board errors under pill scope', async () => {
    const res = await executeTool('update_card', {
      cardId: 'k4',
      updates: { priority: 'high' },
      boardId: 'b1',
    })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/not on the current board/i)
    expect(useBoardStore.getState().updateCard.mock.calls).toHaveLength(0)
  })

  test('card not found in pill scope errors with board name', async () => {
    const res = await executeTool('update_card', {
      card_title: 'Cross board card',
      updates: { priority: 'high' },
      boardId: 'b1',
    })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/not found on board "Goals"/i)
  })

  test('multiple cards with same title in scope error with column hints', async () => {
    const res = await executeTool('update_card', {
      card_title: 'Standup notes',
      updates: { priority: 'high' },
      boardId: 'b1',
    })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/multiple cards titled "Standup notes"/i)
    expect(res.error.match(/Economics/g)?.length).toBe(2)
  })

  test('defensive global fallback when boardId absent', async () => {
    const res = await executeTool('update_card', {
      card_title: 'Cross board card',
      updates: { priority: 'high' },
    })
    expect(res.ok).toBe(true)
    expect(res.resolved.board.id).toBe('b2')
  })
})

describe('executeTool update_card — validation', () => {
  test('empty updates object errors', async () => {
    const res = await executeTool('update_card', {
      card_title: 'Invest in stocks',
      updates: {},
      boardId: 'b1',
    })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/at least one field/i)
  })

  test('missing updates errors', async () => {
    const res = await executeTool('update_card', {
      card_title: 'Invest in stocks',
      boardId: 'b1',
    })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/at least one field/i)
  })

  test('title empty after trim errors', async () => {
    const res = await executeTool('update_card', {
      card_title: 'Invest in stocks',
      updates: { title: '   ' },
      boardId: 'b1',
    })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/title cannot be empty/i)
  })

  test('title too long errors', async () => {
    const res = await executeTool('update_card', {
      card_title: 'Invest in stocks',
      updates: { title: 'x'.repeat(201) },
      boardId: 'b1',
    })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/too long/i)
  })

  test('clearing title is rejected (cards must have a title)', async () => {
    const res = await executeTool('update_card', {
      card_title: 'Invest in stocks',
      updates: { title: null },
      boardId: 'b1',
    })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/title cannot be cleared/i)
  })
})

describe('executeTool update_card — normalization', () => {
  test('title is capitalized', async () => {
    const res = await executeTool('update_card', {
      card_title: 'Invest in stocks',
      updates: { title: 'buy more stocks' },
      boardId: 'b1',
    })
    expect(res.ok).toBe(true)
    expect(lastUpdateCall()[1].title).toBe('Buy more stocks')
  })

  test('title with intentional casing is preserved (iPhone)', async () => {
    const res = await executeTool('update_card', {
      card_title: 'Invest in stocks',
      updates: { title: 'iPhone budget' },
      boardId: 'b1',
    })
    expect(res.ok).toBe(true)
    expect(lastUpdateCall()[1].title).toBe('iPhone budget')
  })

  test('description over 5000 chars is truncated with flag', async () => {
    const res = await executeTool('update_card', {
      card_title: 'Invest in stocks',
      updates: { description: 'x'.repeat(6000) },
      boardId: 'b1',
    })
    expect(res.ok).toBe(true)
    expect(res.truncated).toBe(true)
    expect(lastUpdateCall()[1].description.length).toBe(5000)
  })

  test('legacy icon name is remapped (zap → lightning)', async () => {
    const res = await executeTool('update_card', {
      card_title: 'Invest in stocks',
      updates: { icon: 'zap' },
      boardId: 'b1',
    })
    expect(res.ok).toBe(true)
    expect(lastUpdateCall()[1].icon).toBe('lightning')
  })

  test('malformed icon is dropped silently', async () => {
    const res = await executeTool('update_card', {
      card_title: 'Invest in stocks',
      updates: { icon: 'Bad Icon!!' },
      boardId: 'b1',
    })
    expect(res.ok).toBe(true)
    expect(lastUpdateCall()[1].icon).toBe(null)
  })

  test('checklist of strings is normalized to {text, done:false}', async () => {
    const res = await executeTool('update_card', {
      card_title: 'Invest in stocks',
      updates: { checklist: ['Research stocks', 'Open brokerage'] },
      boardId: 'b1',
    })
    expect(res.ok).toBe(true)
    expect(lastUpdateCall()[1].checklist).toEqual([
      { text: 'Research stocks', done: false },
      { text: 'Open brokerage', done: false },
    ])
  })
})

describe('executeTool update_card — clear semantics (null)', () => {
  test('null due_date clears, lands in cleared[]', async () => {
    const res = await executeTool('update_card', {
      card_title: 'Invest in stocks',
      updates: { due_date: null },
      boardId: 'b1',
    })
    expect(res.ok).toBe(true)
    expect(lastUpdateCall()[1].due_date).toBe(null)
    expect(res.cleared).toContain('due_date')
    expect(res.changed).not.toContain('due_date')
  })

  test('null assignee clears', async () => {
    const res = await executeTool('update_card', {
      card_title: 'Invest in stocks',
      updates: { assignee: null },
      boardId: 'b1',
    })
    expect(res.ok).toBe(true)
    expect(lastUpdateCall()[1].assignee).toBe(null)
    expect(res.cleared).toContain('assignee')
  })

  test('null icon clears', async () => {
    const res = await executeTool('update_card', {
      card_title: 'Invest in stocks',
      updates: { icon: null },
      boardId: 'b1',
    })
    expect(res.ok).toBe(true)
    expect(lastUpdateCall()[1].icon).toBe(null)
    expect(res.cleared).toContain('icon')
  })

  test('null labels clears — tracked in cleared, not in store payload', async () => {
    const res = await executeTool('update_card', {
      card_title: 'Invest in stocks',
      updates: { labels: null },
      boardId: 'b1',
    })
    expect(res.ok).toBe(true)
    // Labels are synced via resolveAndSyncLabels against card_labels, not
    // included in the cards table payload passed to store.updateCard.
    expect('labels' in lastUpdateCall()[1]).toBe(false)
    expect(res.cleared).toContain('labels')
  })

  test('empty labels array also clears — tracked in cleared, not in store payload', async () => {
    const res = await executeTool('update_card', {
      card_title: 'Invest in stocks',
      updates: { labels: [] },
      boardId: 'b1',
    })
    expect(res.ok).toBe(true)
    expect('labels' in lastUpdateCall()[1]).toBe(false)
    expect(res.cleared).toContain('labels')
  })

  test('missing field is left alone (not in payload)', async () => {
    const res = await executeTool('update_card', {
      card_title: 'Invest in stocks',
      updates: { priority: 'high' },
      boardId: 'b1',
    })
    expect(res.ok).toBe(true)
    const payload = lastUpdateCall()[1]
    expect('description' in payload).toBe(false)
    expect('assignee' in payload).toBe(false)
    expect('due_date' in payload).toBe(false)
  })
})

describe('executeTool update_card — completed flag', () => {
  test('completed: true sets the flag, does not move the card', async () => {
    const res = await executeTool('update_card', {
      card_title: 'Invest in stocks',
      updates: { completed: true },
      boardId: 'b1',
    })
    expect(res.ok).toBe(true)
    const payload = lastUpdateCall()[1]
    expect(payload.completed).toBe(true)
    // Confirm no column_id in the update payload (card stays in place)
    expect('column_id' in payload).toBe(false)
  })

  test('completed: false unsets the flag', async () => {
    const res = await executeTool('update_card', {
      card_title: 'Invest in stocks',
      updates: { completed: false },
      boardId: 'b1',
    })
    expect(res.ok).toBe(true)
    expect(lastUpdateCall()[1].completed).toBe(false)
  })
})

describe('executeTool update_card — result shape', () => {
  test('returns enriched result with card, resolved, changed, cleared', async () => {
    const res = await executeTool('update_card', {
      card_title: 'Invest in stocks',
      updates: { priority: 'high', due_date: null },
      boardId: 'b1',
    })
    expect(res.ok).toBe(true)
    expect(res.cardId).toBe('k1')
    expect(res.card).toEqual({ id: 'k1', title: 'Invest in stocks', task_number: 1 })
    expect(res.resolved).toEqual({
      board: { id: 'b1', name: 'Goals' },
      column: { id: 'c1', title: 'Economics' },
    })
    expect(res.changed).toEqual(['priority'])
    expect(res.cleared).toEqual(['due_date'])
    expect(res.truncated).toBeUndefined()
  })
})
