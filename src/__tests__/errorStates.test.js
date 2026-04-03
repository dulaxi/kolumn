import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock supabase before importing stores
vi.mock('../lib/supabase', () => {
  const { createMockSupabase } = require('./mocks/supabase')
  return { supabase: createMockSupabase() }
})

// Mock logger to suppress test output
vi.mock('../utils/logger', () => ({
  logError: vi.fn(),
}))

// Mock toast
vi.mock('../utils/toast', () => ({
  showToast: { error: vi.fn(), warn: vi.fn(), success: vi.fn(), delete: vi.fn(), restore: vi.fn() },
}))

import { useNoteStore } from '../store/noteStore'
import { useNotificationStore } from '../store/notificationStore'
import { supabase } from '../lib/supabase'

// ─────────────────────────────────────────────
// noteStore error state
// ─────────────────────────────────────────────
describe('noteStore error state', () => {
  beforeEach(() => {
    // Reset store state
    useNoteStore.setState({ notes: {}, loading: false, error: null })
  })

  test('initial error state is null', () => {
    const state = useNoteStore.getState()
    expect(state.error).toBeNull()
  })

  test('fetchNotes sets error on failure', async () => {
    // Configure mock to return error
    const builder = supabase._createQueryBuilder({
      data: null,
      error: { message: 'Network error', code: 'PGRST301' },
    })
    supabase.from.mockReturnValue(builder)

    await useNoteStore.getState().fetchNotes()

    const state = useNoteStore.getState()
    expect(state.error).not.toBeNull()
    expect(state.error.message).toBe('Network error')
    expect(state.error.action).toBe('fetchNotes')
    expect(state.loading).toBe(false)
  })

  test('fetchNotes clears error on success', async () => {
    // Start with an error
    useNoteStore.setState({ error: { message: 'old error', action: 'fetchNotes' } })

    const builder = supabase._createQueryBuilder({ data: [], error: null })
    supabase.from.mockReturnValue(builder)

    await useNoteStore.getState().fetchNotes()

    expect(useNoteStore.getState().error).toBeNull()
  })

  test('clearError resets error to null', () => {
    useNoteStore.setState({ error: { message: 'some error', action: 'fetchNotes' } })
    useNoteStore.getState().clearError()
    expect(useNoteStore.getState().error).toBeNull()
  })
})

// ─────────────────────────────────────────────
// notificationStore error state
// ─────────────────────────────────────────────
describe('notificationStore error state', () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [], unreadCount: 0, error: null })
  })

  test('initial error state is null', () => {
    expect(useNotificationStore.getState().error).toBeNull()
  })

  test('fetchNotifications sets error on failure', async () => {
    const builder = supabase._createQueryBuilder({
      data: null,
      error: { message: 'Permission denied', code: '42501' },
    })
    supabase.from.mockReturnValue(builder)

    await useNotificationStore.getState().fetchNotifications()

    const state = useNotificationStore.getState()
    expect(state.error).not.toBeNull()
    expect(state.error.message).toBe('Permission denied')
    expect(state.error.action).toBe('fetchNotifications')
  })

  test('fetchNotifications clears error on success', async () => {
    useNotificationStore.setState({ error: { message: 'old', action: 'fetchNotifications' } })

    const builder = supabase._createQueryBuilder({ data: [], error: null })
    supabase.from.mockReturnValue(builder)

    await useNotificationStore.getState().fetchNotifications()

    expect(useNotificationStore.getState().error).toBeNull()
  })

  test('clearError resets error to null', () => {
    useNotificationStore.setState({ error: { message: 'err', action: 'fetchNotifications' } })
    useNotificationStore.getState().clearError()
    expect(useNotificationStore.getState().error).toBeNull()
  })
})
