import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { onStoreEvent } from '../store/storeEvents'

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

// authStore._resetLocalState emits a `session:reset` event on the store bus;
// the tenant stores (board / note / workspaces / boardSharing) subscribe and
// reset themselves — no store imports another. We assert the decoupled
// contract: sign-out emits the event (synchronously, once) with the right
// Supabase scope. A real subscriber on the bus stands in for those stores.
describe('sign-out scopes', () => {
  let resetSpy
  let unsubscribe

  beforeEach(() => {
    vi.clearAllMocks()
    resetSpy = vi.fn()
    unsubscribe = onStoreEvent('session:reset', resetSpy)
  })
  afterEach(() => unsubscribe())

  test('signOut is local-scope and resets tenant stores', () => {
    useAuthStore.getState().signOut()
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(resetSpy).toHaveBeenCalledTimes(1)
  })

  test('signOutEverywhere is global-scope and resets tenant stores', () => {
    useAuthStore.getState().signOutEverywhere()
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'global' })
    expect(resetSpy).toHaveBeenCalledTimes(1)
  })

  test('clearAfterAccountDeletion is local-scope and resets tenant stores', () => {
    useAuthStore.getState().clearAfterAccountDeletion()
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(resetSpy).toHaveBeenCalledTimes(1)
  })

  test('both clear the user from the store', () => {
    useAuthStore.setState({ user: { id: 'u1' }, session: {}, profile: {} })
    useAuthStore.getState().signOut()
    expect(useAuthStore.getState().user).toBeNull()
    expect(resetSpy).toHaveBeenCalledTimes(1)

    resetSpy.mockClear()
    useAuthStore.setState({ user: { id: 'u1' } })
    useAuthStore.getState().signOutEverywhere()
    expect(useAuthStore.getState().user).toBeNull()
    expect(resetSpy).toHaveBeenCalledTimes(1)
  })
})
