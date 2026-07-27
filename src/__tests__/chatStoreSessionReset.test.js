import { describe, test, expect, vi, beforeEach } from 'vitest'
import { useChatStore, _syncedIds, _resetChatState } from '../store/chatStore'
import { emitStoreEvent } from '../store/storeEvents'

vi.mock('../lib/chatSync', () => ({
  fetchThreads: vi.fn(),
  fetchMessages: vi.fn(),
  upsertThread: vi.fn().mockResolvedValue({ ok: true }),
  upsertMessage: vi.fn().mockResolvedValue({ ok: true }),
  deleteThread: vi.fn().mockResolvedValue({ ok: true }),
}))
vi.mock('../lib/chatAgentLoop', () => ({ runChatLoop: vi.fn() }))
vi.mock('../lib/aiClient', () => ({ streamChat: vi.fn().mockResolvedValue(undefined) }))

// chatStore must reset on session:reset (sign-out / account switch on a
// shared device) exactly like boardStore / noteStore / boardSharingStore /
// workspacesStore already do — otherwise the next signed-in user briefly
// sees (and could overwrite) the previous user's chat history.
describe('chatStore session:reset', () => {
  beforeEach(() => {
    useChatStore.setState({
      conversations: {
        a: { id: 'a', title: 'Cached A', created_at: '1', updated_at: '1' },
      },
      messages: { a: [{ id: 'm1', role: 'user', text: 'hi', created_at: '1' }] },
      activeConversationId: 'a',
      streaming: { a: true },
      tierInfo: { tier: 'pro' },
    })
    _syncedIds.add('x')
    localStorage.setItem('kolumn-chat', 'stale')
  })

  test('clears store state, module bookkeeping, and the persisted cache', () => {
    _resetChatState()

    expect(useChatStore.getState().conversations).toEqual({})
    expect(useChatStore.getState().messages).toEqual({})
    expect(useChatStore.getState().activeConversationId).toBeNull()
    expect(useChatStore.getState().streaming).toEqual({})
    expect(useChatStore.getState().tierInfo).toBeNull()
    expect(_syncedIds.size).toBe(0)
    expect(localStorage.getItem('kolumn-chat')).toBeNull()
  })

  test('aborts in-flight streams', async () => {
    const abortSpy = vi.spyOn(AbortController.prototype, 'abort')
    const { runChatLoop } = await import('../lib/chatAgentLoop')
    // Never resolves on its own — sendMessage awaits it, so the stream stays
    // "in flight" (and its controller registered) until we resolve manually.
    let resolveLoop
    runChatLoop.mockImplementation(() => new Promise((resolve) => { resolveLoop = resolve }))

    const id = useChatStore.getState().createConversation()
    const sendPromise = useChatStore.getState().sendMessage(id, 'hello')

    _resetChatState()
    expect(abortSpy).toHaveBeenCalled()

    // Let sendMessage's await settle so it doesn't leak into the next test.
    resolveLoop({ toolCardIds: [], error: null, errorCode: null, aborted: true })
    await sendPromise
    abortSpy.mockRestore()
  })

  test('triggered via the real session:reset event bus', () => {
    emitStoreEvent('session:reset')
    expect(useChatStore.getState().conversations).toEqual({})
    expect(_syncedIds.size).toBe(0)
    expect(localStorage.getItem('kolumn-chat')).toBeNull()
  })
})
