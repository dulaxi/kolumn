import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }) })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
  },
}))
vi.mock('../utils/logger', () => ({ logWarn: vi.fn(), logError: vi.fn() }))

import { useBoardStore } from '../store/boardStore'
import { executeTool } from '../lib/toolExecutor'

describe('executeTool result contract', () => {
  beforeEach(() => {
    useBoardStore.setState({
      boards: { b1: { id: 'b1', name: 'Alpha' } },
      columns: { col1: { id: 'col1', board_id: 'b1', title: 'To Do', position: 0 } },
      cards: { c1: { id: 'c1', board_id: 'b1', column_id: 'col1', title: 'Ship it' } },
    })
  })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  test('unknown action returns { ok: false, error }', async () => {
    const r = await executeTool('not_a_tool', {})
    expect(r.ok).toBe(false)
    expect(typeof r.error).toBe('string')
  })

  test('create_card with missing title returns { ok: false, error }', async () => {
    const r = await executeTool('create_card', { boardId: 'b1' })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/title/i)
  })

  test('delete_card resolves immediately without awaiting the undo window', async () => {
    vi.useFakeTimers()
    // deleteCard normally awaits the 5s undoableDelete; stub it slow to prove
    // executeTool no longer waits on it.
    const slowDelete = vi.fn(() => new Promise((res) => setTimeout(res, 5000)))
    useBoardStore.setState({ deleteCard: slowDelete })

    const resultPromise = executeTool('delete_card', { card_title: 'Ship it', boardId: 'b1' })
    // Resolve microtasks only — NOT the 5s timer.
    const r = await resultPromise
    expect(r.ok).toBe(true)
    expect(r.note).toMatch(/undo/i)
    expect(slowDelete).toHaveBeenCalledWith('c1')
  })
})
