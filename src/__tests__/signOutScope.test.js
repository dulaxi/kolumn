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

// authStore._resetLocalState fires off `import('./boardStore').then(...)` (and
// three siblings) as fire-and-forget cleanup — never awaited by signOut /
// signOutEverywhere. Left pointed at the real store modules, those dynamic
// imports can still be settling when this file's jsdom environment tears
// down, which vitest reports as a stray `EnvironmentTeardownError` (noisy,
// harmless, but it pollutes full-suite output). Mocking the four modules
// avoids the real (much heavier) module graphs entirely, and naming the
// mock fns with the `mock` prefix lets vitest hoist them above the vi.mock
// calls that reference them. Each test then waits on these before returning,
// so the dynamic imports are always fully settled — not just probably
// settled after a fixed delay — before the file's environment tears down.
const mockBoardResetStore = vi.fn()
const mockNoteResetStore = vi.fn()
const mockWorkspacesResetStore = vi.fn()
const mockBoardSharingResetStore = vi.fn()

vi.mock('../store/boardStore', () => ({
  useBoardStore: { getState: () => ({ resetStore: mockBoardResetStore }) },
}))
vi.mock('../store/noteStore', () => ({
  useNoteStore: { getState: () => ({ resetStore: mockNoteResetStore }) },
}))
vi.mock('../store/workspacesStore', () => ({
  useWorkspacesStore: { getState: () => ({ resetStore: mockWorkspacesResetStore }) },
}))
vi.mock('../store/boardSharingStore', () => ({
  useBoardSharingStore: { getState: () => ({ resetStore: mockBoardSharingResetStore }) },
}))

// Waits until every store's mocked resetStore() has actually run, i.e. all
// four dynamic imports from _resetLocalState have resolved and their .then()
// fired — deterministic, unlike a fixed setTimeout.
const flushResets = (times) =>
  vi.waitFor(() => {
    expect(mockBoardResetStore).toHaveBeenCalledTimes(times)
    expect(mockNoteResetStore).toHaveBeenCalledTimes(times)
    expect(mockWorkspacesResetStore).toHaveBeenCalledTimes(times)
    expect(mockBoardSharingResetStore).toHaveBeenCalledTimes(times)
  }, { timeout: 1000, interval: 10 })

describe('sign-out scopes', () => {
  beforeEach(() => vi.clearAllMocks())

  test('signOut is local-scope', async () => {
    useAuthStore.getState().signOut()
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    await flushResets(1)
  })

  test('signOutEverywhere is global-scope', async () => {
    useAuthStore.getState().signOutEverywhere()
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'global' })
    await flushResets(1)
  })

  test('both clear the user from the store', async () => {
    // Flush between the two sign-outs (rather than once at the end for both)
    // so each _resetLocalState's four dynamic imports settle before the next
    // one fires. Vitest's module runner doesn't reliably resolve a second
    // concurrent `import()` of the same specifier queued before the first
    // settles, so back-to-back unflushed calls can hang this wait forever.
    useAuthStore.setState({ user: { id: 'u1' }, session: {}, profile: {} })
    useAuthStore.getState().signOut()
    expect(useAuthStore.getState().user).toBeNull()
    await flushResets(1)

    vi.clearAllMocks()
    useAuthStore.setState({ user: { id: 'u1' } })
    useAuthStore.getState().signOutEverywhere()
    expect(useAuthStore.getState().user).toBeNull()
    await flushResets(1)
  })
})
