import { describe, test, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// Mock stores + supabase before importing the hook
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))
vi.mock('../store/boardStore', () => ({
  useBoardStore: (selector) => selector({
    boards: {
      'board-1': { id: 'board-1', workspace_id: null },
      'board-2': { id: 'board-2', workspace_id: 'ws-1' },
    },
  }),
}))
vi.mock('../store/workspacesStore', () => {
  const state = { members: { 'ws-1': [{ display_name: 'Alice' }, { display_name: 'Bob' }] } }
  return {
    useWorkspacesStore: Object.assign(
      (selector) => selector(state),
      { getState: () => ({ fetchMembers: vi.fn() }) },
    ),
  }
})

import { supabase } from '../lib/supabase'
import { useBoardMemberNames } from '../hooks/useBoardMemberNames'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useBoardMemberNames', () => {
  test('returns empty array when card is null', () => {
    const { result } = renderHook(() => useBoardMemberNames(null))
    expect(result.current).toEqual([])
  })

  test('returns workspace member names for workspace boards', async () => {
    const card = { board_id: 'board-2' }
    const { result } = renderHook(() => useBoardMemberNames(card))
    await waitFor(() => {
      expect(result.current).toEqual(['Alice', 'Bob'])
    })
  })

  test('fetches board_members then profiles for personal boards', async () => {
    const card = { board_id: 'board-1' }
    const membersChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [{ user_id: 'u1' }, { user_id: 'u2' }], error: null }),
    }
    const profilesChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [{ display_name: 'Carol' }, { display_name: 'Dan' }], error: null }),
    }
    supabase.from.mockImplementation((table) => {
      if (table === 'board_members') return membersChain
      if (table === 'profiles') return profilesChain
    })

    const { result } = renderHook(() => useBoardMemberNames(card))
    await waitFor(() => {
      expect(result.current).toEqual(['Carol', 'Dan'])
    })
  })
})
