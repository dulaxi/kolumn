import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase', () => {
  const { createMockSupabase } = require('./mocks/supabase')
  return { supabase: createMockSupabase() }
})
vi.mock('../utils/logger', () => ({ logError: vi.fn() }))
vi.mock('../utils/toast', () => ({
  showToast: { error: vi.fn(), warn: vi.fn(), success: vi.fn(), restore: vi.fn(), archive: vi.fn(), delete: vi.fn(), info: vi.fn(), overdue: vi.fn() },
}))

import { useBoardStore } from '../store/boardStore'
import { useAuthStore } from '../store/authStore'

describe('logCardMove records last_move', () => {
  beforeEach(() => {
    useAuthStore.setState({ profile: { id: 'u1', display_name: 'Maya', color: 'copper' } })
    useBoardStore.setState({
      columns: { 'col-a': { id: 'col-a', title: 'To do' }, 'col-b': { id: 'col-b', title: 'Doing' } },
      cards: { 'card-1': { id: 'card-1', column_id: 'col-b', position: 0, title: 'Fix bug' } },
    })
  })

  test('optimistically sets last_move on the local card', () => {
    useBoardStore.getState().logCardMove('card-1', 'col-a', 'col-b', 2, 0)
    const lm = useBoardStore.getState().cards['card-1'].last_move
    expect(lm).toMatchObject({
      from_column_id: 'col-a', from_position: 2,
      to_column_id: 'col-b', to_position: 0,
      moved_by_id: 'u1', moved_by_name: 'Maya', moved_by_color: 'copper',
    })
    expect(typeof lm.moved_at).toBe('string')
  })

  test('no-op safe when the card is missing', () => {
    expect(() => useBoardStore.getState().logCardMove('nope', 'col-a', 'col-b', 0, 0)).not.toThrow()
  })
})
