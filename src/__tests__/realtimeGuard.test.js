import { describe, it, expect, vi, beforeEach } from 'vitest'

// Keep the import side-effect free and observable: the guard pulls in logger +
// toast. showToast.warn is what the degradation notice uses.
vi.mock('../utils/logger', () => ({ logError: vi.fn() }))
vi.mock('../utils/toast', () => ({ showToast: { warn: vi.fn(), offline: vi.fn() } }))

// The "notice shown once" flag lives at module scope, so reset the module (and
// the mocks) before each test to isolate cases.
async function freshGuard() {
  vi.resetModules()
  vi.clearAllMocks()
  return (await import('../lib/realtimeGuard')).guardRealtimeSetup
}

describe('guardRealtimeSetup', () => {
  let guardRealtimeSetup
  let logError
  let showToast

  beforeEach(async () => {
    guardRealtimeSetup = await freshGuard()
    ;({ logError } = await import('../utils/logger'))
    ;({ showToast } = await import('../utils/toast'))
  })

  it('returns the setup result untouched when setup succeeds', () => {
    const channel = { id: 'ch' }
    expect(guardRealtimeSetup('boards', () => channel, [])).toBe(channel)
    expect(logError).not.toHaveBeenCalled()
    expect(showToast.warn).not.toHaveBeenCalled()
  })

  it('returns the fallback and does NOT rethrow when setup throws synchronously', () => {
    // The white-screen scenario: supabase-js throws synchronously when the
    // WebSocket is blocked. The guard must swallow it so it never reaches
    // React's render cycle.
    const throwing = () => { throw new Error('WebSocket not available: ') }
    let result
    expect(() => { result = guardRealtimeSetup('boards', throwing, []) }).not.toThrow()
    expect(result).toEqual([])
    expect(logError).toHaveBeenCalledTimes(1)
  })

  it('honors the caller-specific fallback shape (null for a single channel)', () => {
    const throwing = () => { throw new Error('boom') }
    expect(guardRealtimeSetup('notifications', throwing, null)).toBeNull()
  })

  it('warns the user once, not on every repeated failure', () => {
    const throwing = () => { throw new Error('WebSocket not available: ') }
    guardRealtimeSetup('boards', throwing, [])
    guardRealtimeSetup('notifications', throwing, null)
    guardRealtimeSetup('boards', throwing, [])
    // Logged every time (diagnostics), but the user is notified only once.
    expect(logError).toHaveBeenCalledTimes(3)
    expect(showToast.warn).toHaveBeenCalledTimes(1)
  })
})
