import { describe, test, expect, vi, beforeEach } from 'vitest'
import { useChatStore } from '../store/chatStore'
import { runChatLoop } from '../lib/chatAgentLoop'

vi.mock('../lib/chatAgentLoop', () => ({ runChatLoop: vi.fn() }))
vi.mock('../lib/aiClient', () => ({ streamChat: vi.fn().mockResolvedValue(undefined) }))

describe('stopStreaming', () => {
  beforeEach(() => {
    useChatStore.setState({ conversations: {}, messages: {}, streaming: {} })
    runChatLoop.mockReset()
  })

  const mockAbortableLoop = () =>
    runChatLoop.mockImplementation((_input, cbs, opts) => {
      cbs.onText('partial answer')
      return new Promise((resolve) => {
        opts.signal.addEventListener('abort', () =>
          resolve({ toolCardIds: [], error: null, errorCode: null, aborted: true }),
        )
      })
    })

  test('stop keeps partial text, stamps stopped, clears the flag, no error', async () => {
    mockAbortableLoop()
    const id = useChatStore.getState().createConversation()
    useChatStore.getState().addMessage(id, { role: 'user', text: 'long question' })
    const p = useChatStore.getState().sendMessage(id, 'long question')
    expect(useChatStore.getState().streaming[id]).toBe(true)
    useChatStore.getState().stopStreaming(id)
    await p
    const reply = useChatStore.getState().messages[id].at(-1)
    expect(reply.text).toBe('partial answer')
    expect(reply.stopped).toBe(true)
    expect(reply.error).toBeUndefined()
    expect(useChatStore.getState().streaming[id]).toBeUndefined()
  })

  test('deleteConversation aborts the in-flight stream', async () => {
    let sawAbort = false
    runChatLoop.mockImplementation((_input, _cbs, opts) =>
      new Promise((resolve) => {
        opts.signal.addEventListener('abort', () => {
          sawAbort = true
          resolve({ toolCardIds: [], error: null, errorCode: null, aborted: true })
        })
      }),
    )
    const id = useChatStore.getState().createConversation()
    const p = useChatStore.getState().sendMessage(id, 'q')
    useChatStore.getState().deleteConversation(id)
    await p
    expect(sawAbort).toBe(true)
    expect(useChatStore.getState().streaming[id]).toBeUndefined()
  })

  test('stopStreaming on an idle conversation is a no-op', () => {
    expect(() => useChatStore.getState().stopStreaming('nope')).not.toThrow()
  })
})
