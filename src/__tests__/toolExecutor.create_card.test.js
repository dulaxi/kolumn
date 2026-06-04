import { describe, test, expect, vi, beforeEach } from 'vitest'

// Mock supabase before importing the stores (matches selectors.test.js pattern).
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
import { useAuthStore } from '../store/authStore'
import { executeTool } from '../lib/toolExecutor'

const SEED_BOARD = { id: 'b1', name: 'Personal', next_task_number: 5 }
const SEED_COLUMNS = {
  c1: { id: 'c1', board_id: 'b1', title: 'To Do', position: 0 },
  c2: { id: 'c2', board_id: 'b1', title: 'Done', position: 1 },
}

beforeEach(() => {
  // Replace boardStore.addCard with a mock that synthesises an optimistic
  // card and resolves the temp-ID polling on the next microtask. The real
  // addCard would touch supabase via a background promise — out of scope here.
  useBoardStore.setState({
    boards: { b1: SEED_BOARD },
    columns: SEED_COLUMNS,
    cards: {},
    _tempIdMap: {},
    activeBoardId: 'b1',
    addCard: vi.fn(async (boardId, columnId, cardData) => {
      const tempId = `temp-${Math.random().toString(36).slice(2)}`
      useBoardStore.setState((s) => ({
        cards: {
          ...s.cards,
          [tempId]: {
            id: tempId,
            board_id: boardId,
            column_id: columnId,
            task_number: 42,
            ...cardData,
          },
        },
      }))
      // Resolve the polling loop on the next microtask so executeTool can find
      // the "real" id without waiting the full 4s.
      Promise.resolve().then(() => {
        useBoardStore.setState((s) => ({
          _tempIdMap: { ...s._tempIdMap, [tempId]: `real-${tempId}` },
        }))
      })
      return tempId
    }),
  })
  useAuthStore.setState({ profile: { display_name: 'Alice' } })
})

function lastAddCardCall() {
  return useBoardStore.getState().addCard.mock.calls.at(-1)
}

describe('executeTool create_card — validation', () => {
  test('errors when title is empty or whitespace', async () => {
    const res = await executeTool('create_card', { title: '   ', boardId: 'b1' })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/title is required/i)
  })

  test('errors when title exceeds 200 chars', async () => {
    const res = await executeTool('create_card', {
      title: 'x'.repeat(201),
      boardId: 'b1',
    })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/too long/i)
  })

  test('errors when boardId does not resolve to a board', async () => {
    const res = await executeTool('create_card', { title: 'Test', boardId: 'ghost' })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/board not found/i)
  })

  test('errors when board name does not resolve (fallback path)', async () => {
    const res = await executeTool('create_card', { title: 'Test', board: 'Nonexistent' })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/board "nonexistent" not found/i)
  })

  test('errors when column not found, listing available columns', async () => {
    const res = await executeTool('create_card', {
      title: 'Test',
      boardId: 'b1',
      column: 'Limbo',
    })
    expect(res.ok).toBe(false)
    expect(res.error).toContain('To Do')
    expect(res.error).toContain('Done')
  })

  test('errors when no board context is supplied at all', async () => {
    const res = await executeTool('create_card', { title: 'Test' })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/no board context/i)
  })
})

describe('executeTool create_card — defaults & path parity', () => {
  test('fast-path (only title + boardId) applies safe executor defaults', async () => {
    const res = await executeTool('create_card', { title: 'Buy milk', boardId: 'b1' })
    expect(res.ok).toBe(true)
    expect(res.applied_defaults).toContain('priority')
    // Assignee is NOT auto-defaulted — leave unassigned unless user named someone
    expect(res.applied_defaults).not.toContain('assignee')

    const cardData = lastAddCardCall()[2]
    expect(cardData.priority).toBe('medium')
    expect(cardData.assignee).toBe(null)
    expect(cardData.icon).toBe(null)
    // Labels are no longer passed through addCard — they are synced separately
    // via resolveAndSyncLabels against card_labels after the real ID is known.
    expect('labels' in cardData).toBe(false)
    expect(cardData.checklist).toEqual([])
  })

  test('LLM path: model-supplied fields are preserved', async () => {
    const res = await executeTool('create_card', {
      title: 'Fix login bug',
      boardId: 'b1',
      priority: 'high',
      assignee: 'Bob',
      icon: 'bug',
      labels: [{ text: '/frontend', color: 'blue' }],
      checklist: ['Reproduce', 'Fix', 'Test'],
    })
    expect(res.ok).toBe(true)

    const cardData = lastAddCardCall()[2]
    expect(cardData.priority).toBe('high')
    expect(cardData.assignee).toBe('Bob')
    expect(cardData.icon).toBe('bug')
    // Labels are synced separately via resolveAndSyncLabels — not in addCard payload.
    expect('labels' in cardData).toBe(false)
    expect(cardData.checklist).toEqual([
      { text: 'Reproduce', done: false },
      { text: 'Fix', done: false },
      { text: 'Test', done: false },
    ])

    expect(res.applied_defaults).not.toContain('priority')
  })

  test('assignee is null when not specified, regardless of who the current user is', async () => {
    useAuthStore.setState({ profile: { display_name: 'Anyone' } })
    const res = await executeTool('create_card', { title: 'Test', boardId: 'b1' })
    expect(res.ok).toBe(true)
    expect(lastAddCardCall()[2].assignee).toBe(null)
  })
})

describe('executeTool create_card — title capitalization', () => {
  test('lowercase first letter is capitalized (fast-path paste)', async () => {
    const res = await executeTool('create_card', { title: 'buy milk', boardId: 'b1' })
    expect(res.ok).toBe(true)
    expect(lastAddCardCall()[2].title).toBe('Buy milk')
  })

  test('already-capitalized title is unchanged', async () => {
    const res = await executeTool('create_card', { title: 'Send invoice', boardId: 'b1' })
    expect(res.ok).toBe(true)
    expect(lastAddCardCall()[2].title).toBe('Send invoice')
  })

  test('intentional casing in the first word is preserved (iPhone, macOS, API)', async () => {
    // The heuristic: skip capitalization when the first word already has any
    // uppercase letter (signals intentional casing like a brand or acronym).
    const r1 = await executeTool('create_card', { title: 'iPhone repair', boardId: 'b1' })
    expect(r1.ok).toBe(true)
    expect(lastAddCardCall()[2].title).toBe('iPhone repair')

    const r2 = await executeTool('create_card', { title: 'macOS update', boardId: 'b1' })
    expect(r2.ok).toBe(true)
    expect(lastAddCardCall()[2].title).toBe('macOS update')

    const r3 = await executeTool('create_card', { title: 'API rewrite', boardId: 'b1' })
    expect(r3.ok).toBe(true)
    expect(lastAddCardCall()[2].title).toBe('API rewrite')
  })

  test('title starting with non-letter (number, emoji) is left alone', async () => {
    const r1 = await executeTool('create_card', { title: '2024 review', boardId: 'b1' })
    expect(r1.ok).toBe(true)
    expect(lastAddCardCall()[2].title).toBe('2024 review')
  })

  test('leading/trailing whitespace is trimmed before capitalization', async () => {
    const res = await executeTool('create_card', { title: '  hello world  ', boardId: 'b1' })
    expect(res.ok).toBe(true)
    expect(lastAddCardCall()[2].title).toBe('Hello world')
  })
})

describe('executeTool create_card — description handling', () => {
  test('description ≤ 5000 chars passes through, no truncated flag', async () => {
    const desc = 'x'.repeat(5000)
    const res = await executeTool('create_card', {
      title: 'Test',
      boardId: 'b1',
      description: desc,
    })
    expect(res.ok).toBe(true)
    expect(res.truncated).toBeUndefined()
    expect(lastAddCardCall()[2].description.length).toBe(5000)
  })

  test('description > 5000 chars is truncated, flagged in result', async () => {
    const desc = 'x'.repeat(6000)
    const res = await executeTool('create_card', {
      title: 'Test',
      boardId: 'b1',
      description: desc,
    })
    expect(res.ok).toBe(true)
    expect(res.truncated).toBe(true)
    expect(lastAddCardCall()[2].description.length).toBe(5000)
  })
})

describe('executeTool create_card — icon coercion', () => {
  test('valid kebab-case icon passes through', async () => {
    const res = await executeTool('create_card', {
      title: 'Test',
      boardId: 'b1',
      icon: 'rocket',
    })
    expect(res.ok).toBe(true)
    expect(lastAddCardCall()[2].icon).toBe('rocket')
  })

  test('legacy lucide-style icon is remapped (zap → lightning)', async () => {
    const res = await executeTool('create_card', {
      title: 'Test',
      boardId: 'b1',
      icon: 'zap',
    })
    expect(res.ok).toBe(true)
    expect(lastAddCardCall()[2].icon).toBe('lightning')
  })

  test('malformed icon name is dropped silently', async () => {
    const res = await executeTool('create_card', {
      title: 'Test',
      boardId: 'b1',
      icon: 'Bad Icon Name!!',
    })
    expect(res.ok).toBe(true)
    expect(lastAddCardCall()[2].icon).toBe(null)
  })

  test('mixed-case icon is lowercased', async () => {
    const res = await executeTool('create_card', {
      title: 'Test',
      boardId: 'b1',
      icon: 'Rocket',
    })
    expect(res.ok).toBe(true)
    expect(lastAddCardCall()[2].icon).toBe('rocket')
  })
})

describe('executeTool create_card — board & column resolution', () => {
  test('boardId takes precedence when both boardId and board are passed', async () => {
    const res = await executeTool('create_card', {
      title: 'Test',
      boardId: 'b1',
      board: 'Some Other Name',
    })
    expect(res.ok).toBe(true)
    expect(res.resolved.board.id).toBe('b1')
  })

  test('falls back to board name when boardId is absent', async () => {
    const res = await executeTool('create_card', { title: 'Test', board: 'Personal' })
    expect(res.ok).toBe(true)
    expect(res.resolved.board.id).toBe('b1')
  })

  test('column defaults to first column by position', async () => {
    const res = await executeTool('create_card', { title: 'Test', boardId: 'b1' })
    expect(res.ok).toBe(true)
    expect(res.resolved.column.id).toBe('c1')
    expect(res.resolved.column.title).toBe('To Do')
  })

  test('explicit column name resolves case-insensitively', async () => {
    const res = await executeTool('create_card', {
      title: 'Test',
      boardId: 'b1',
      column: 'done',
    })
    expect(res.ok).toBe(true)
    expect(res.resolved.column.id).toBe('c2')
  })
})

describe('executeTool create_card — result shape', () => {
  test('returns task_number from the optimistic card', async () => {
    const res = await executeTool('create_card', { title: 'Test', boardId: 'b1' })
    expect(res.ok).toBe(true)
    expect(res.task_number).toBe(42)
  })

  test('returns resolved board and column with id + display label', async () => {
    const res = await executeTool('create_card', { title: 'Test', boardId: 'b1' })
    expect(res.resolved).toEqual({
      board: { id: 'b1', name: 'Personal' },
      column: { id: 'c1', title: 'To Do' },
    })
  })
})
