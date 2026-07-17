import { describe, test, expect, vi, beforeEach } from 'vitest'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'

vi.mock('../lib/supabase', async (importOriginal) => {
  const mod = await importOriginal()
  return {
    ...mod,
    supabase: {
      ...mod.supabase,
      auth: { ...mod.supabase.auth, signOut: vi.fn().mockResolvedValue({ error: null }) },
    },
  }
})

describe('sign-out scopes', () => {
  beforeEach(() => vi.clearAllMocks())

  test('signOut is local-scope', () => {
    useAuthStore.getState().signOut()
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  test('signOutEverywhere is global-scope', () => {
    useAuthStore.getState().signOutEverywhere()
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'global' })
  })

  test('both clear the user from the store', () => {
    useAuthStore.setState({ user: { id: 'u1' }, session: {}, profile: {} })
    useAuthStore.getState().signOut()
    expect(useAuthStore.getState().user).toBeNull()
    useAuthStore.setState({ user: { id: 'u1' } })
    useAuthStore.getState().signOutEverywhere()
    expect(useAuthStore.getState().user).toBeNull()
  })
})
