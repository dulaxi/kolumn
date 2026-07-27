import { describe, test, expect, vi, beforeEach } from 'vitest'
import { useChatStore } from '../store/chatStore'
import { runChatLoop } from '../lib/chatAgentLoop'

vi.mock('../lib/chatAgentLoop', () => ({ runChatLoop: vi.fn() }))
vi.mock('../lib/aiClient', () => ({ streamChat: vi.fn().mockResolvedValue(undefined) }))

describe('retryMessage', () => {
  beforeEach(() => {
    useChatStore.setState({ conversations: {}, messages: {}, streaming: {} })
    runChatLoop.mockReset()
    runChatLoop.mockResolvedValue({ toolCardIds: [], error: null })
  })

  const seedFailedExchange = () => {
    const id = useChatStore.getState().createConversation()
    useChatStore.getState().addMessage(id, { role: 'user', text: 'the question' })
    const failedId = useChatStore.getState().addMessage(id, { role: 'assistant', text: '' })
    useChatStore.setState((s) => ({
      messages: {
        ...s.messages,
        [id]: s.messages[id].map((m) =>
          m.id === failedId ? { ...m, error: { message: 'snag', isLimit: false } } : m
        ),
      },
    }))
    return { id, failedId }
  }

  test('removes the errored message and re-sends the preceding user text', async () => {
    const { id, failedId } = seedFailedExchange()
    await useChatStore.getState().retryMessage(id, failedId)
    const msgs = useChatStore.getState().messages[id]
    expect(msgs.find((m) => m.id === failedId)).toBeUndefined()
    expect(runChatLoop).toHaveBeenCalledTimes(1)
    expect(runChatLoop.mock.calls[0][0].text).toBe('the question')
  })

  test('no-op for a message without an error', async () => {
    const id = useChatStore.getState().createConversation()
    useChatStore.getState().addMessage(id, { role: 'user', text: 'q' })
    const okId = useChatStore.getState().addMessage(id, { role: 'assistant', text: 'fine' })
    await useChatStore.getState().retryMessage(id, okId)
    expect(runChatLoop).not.toHaveBeenCalled()
    expect(useChatStore.getState().messages[id]).toHaveLength(2)
  })

  test('no-op when no preceding user message exists', async () => {
    const id = useChatStore.getState().createConversation()
    const loneId = useChatStore.getState().addMessage(id, { role: 'assistant', text: '' })
    useChatStore.setState((s) => ({
      messages: {
        ...s.messages,
        [id]: s.messages[id].map((m) => ({ ...m, error: { message: 'x', isLimit: false } })),
      },
    }))
    await useChatStore.getState().retryMessage(id, loneId)
    expect(runChatLoop).not.toHaveBeenCalled()
  })
})

describe('retryMessage streaming guard', () => {
  test('no-op while the conversation is already streaming', async () => {
    useChatStore.setState({ conversations: {}, messages: {}, streaming: {} })
    runChatLoop.mockReset()
    const id = useChatStore.getState().createConversation()
    useChatStore.getState().addMessage(id, { role: 'user', text: 'q' })
    const failedId = useChatStore.getState().addMessage(id, { role: 'assistant', text: '' })
    useChatStore.setState((s) => ({
      streaming: { ...s.streaming, [id]: true },
      messages: {
        ...s.messages,
        [id]: s.messages[id].map((m) =>
          m.id === failedId ? { ...m, error: { message: 'snag', isLimit: false } } : m
        ),
      },
    }))
    await useChatStore.getState().retryMessage(id, failedId)
    expect(runChatLoop).not.toHaveBeenCalled()
    expect(useChatStore.getState().messages[id].find((m) => m.id === failedId)).toBeDefined()
  })
})
