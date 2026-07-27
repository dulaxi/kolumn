import { describe, test, expect, vi, beforeEach } from 'vitest'
import { useChatStore } from '../store/chatStore'
import { runChatLoop } from '../lib/chatAgentLoop'

vi.mock('../lib/chatAgentLoop', () => ({ runChatLoop: vi.fn() }))
vi.mock('../lib/aiClient', () => ({ streamChat: vi.fn().mockResolvedValue(undefined) }))

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('streaming map', () => {
  beforeEach(() => {
    useChatStore.setState({ conversations: {}, messages: {}, streaming: {} })
    runChatLoop.mockReset()
  })

  test('two conversations stream independently; finishing one leaves the other busy', async () => {
    const a = useChatStore.getState().createConversation()
    const b = useChatStore.getState().createConversation()
    let resolveA, resolveB
    runChatLoop
      .mockReturnValueOnce(new Promise((r) => { resolveA = r }))
      .mockReturnValueOnce(new Promise((r) => { resolveB = r }))

    const pA = useChatStore.getState().sendMessage(a, 'question A')
    const pB = useChatStore.getState().sendMessage(b, 'question B')
    expect(useChatStore.getState().streaming[a]).toBe(true)
    expect(useChatStore.getState().streaming[b]).toBe(true)

    resolveA({ toolCardIds: [], error: null })
    await pA
    expect(useChatStore.getState().streaming[a]).toBeUndefined()
    expect(useChatStore.getState().streaming[b]).toBe(true)

    resolveB({ toolCardIds: [], error: null })
    await pB
    expect(useChatStore.getState().streaming[b]).toBeUndefined()
  })

  test('deleting the conversation mid-stream does not throw and clears its flag', async () => {
    const id = useChatStore.getState().createConversation()
    let capturedCallbacks
    let resolveLoop
    runChatLoop.mockImplementation((_input, callbacks) => {
      capturedCallbacks = callbacks
      return new Promise((r) => { resolveLoop = r })
    })

    const p = useChatStore.getState().sendMessage(id, 'doomed question')
    useChatStore.getState().deleteConversation(id)

    // Chunks arriving after deletion must not throw.
    expect(() => capturedCallbacks.onText('late chunk')).not.toThrow()

    resolveLoop({ toolCardIds: [], error: null })
    await expect(p).resolves.toBeUndefined()
    await flush()
    expect(useChatStore.getState().streaming[id]).toBeUndefined()
    expect(useChatStore.getState().messages[id]).toBeUndefined()
  })

  test('error path also clears only its own flag', async () => {
    const id = useChatStore.getState().createConversation()
    runChatLoop.mockResolvedValue({ toolCardIds: [], error: 'boom', errorCode: null })
    useChatStore.setState((s) => ({ streaming: { ...s.streaming, other: true } }))
    await useChatStore.getState().sendMessage(id, 'q')
    expect(useChatStore.getState().streaming[id]).toBeUndefined()
    expect(useChatStore.getState().streaming.other).toBe(true)
  })
})
