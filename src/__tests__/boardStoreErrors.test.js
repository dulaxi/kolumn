import { describe, test, expect, vi, beforeEach } from 'vitest'

// Mock supabase before importing stores — reuses the shared chainable
// query-builder mock (see errorStates.test.js for the same pattern).
vi.mock('../lib/supabase', () => {
  const { createMockSupabase } = require('./mocks/supabase')
  return { supabase: createMockSupabase() }
})

// Mock logger to suppress expected error output during these tests
vi.mock('../utils/logger', () => ({
  logError: vi.fn(),
}))

// Mock toast so we can assert on calls without rendering react-hot-toast
vi.mock('../utils/toast', () => ({
  showToast: {
    error: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
    restore: vi.fn(),
    archive: vi.fn(),
    delete: vi.fn(),
    info: vi.fn(),
    overdue: vi.fn(),
  },
}))

import { useBoardStore } from '../store/boardStore'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { showToast } from '../utils/toast'

describe('boardStore error paths', () => {
  beforeEach(() => {
    useBoardStore.setState({
      boards: {},
      columns: {},
      cards: {},
      activeBoardId: null,
      loading: false,
      _isDragging: false,
      comments: {},
      subscriptions: [],
    })
    useAuthStore.setState({ user: { id: 'u1' }, session: null, profile: null })
    vi.clearAllMocks()
    localStorage.clear()
  })

  test('addBoard returns null and shows an error toast when the insert fails', async () => {
    const failingBuilder = supabase._createQueryBuilder({
      data: null,
      error: { message: 'insert failed' },
    })
    supabase.from.mockReturnValue(failingBuilder)

    const result = await useBoardStore.getState().addBoard('New Board', null, null)

    expect(result).toBeNull()
    expect(showToast.error).toHaveBeenCalledWith('Failed to create board')
    // No board should have been added to local state
    expect(Object.keys(useBoardStore.getState().boards)).toHaveLength(0)
  })

  test('persistCardPositions shows an error toast and refetches when a write fails', async () => {
    useBoardStore.setState({
      cards: {
        c1: { id: 'c1', board_id: 'b1', column_id: 'col1', position: 0, completed: false },
      },
      activeBoardId: 'b1',
    })

    const failingBuilder = supabase._createQueryBuilder({
      data: null,
      error: { message: 'update failed' },
    })
    supabase.from.mockReturnValue(failingBuilder)

    await useBoardStore.getState().persistCardPositions(['c1'], { movedCrossColumn: false })

    expect(showToast.error).toHaveBeenCalledWith('Some card moves failed to save — resyncing')
    // A failed write must still trigger the resync refetch even though the
    // move wasn't cross-column — this is the widened condition from Step 4.
    expect(failingBuilder.select).toHaveBeenCalledWith('*')
  })
})
