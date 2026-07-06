import { describe, test, expect, vi, beforeEach } from 'vitest'

const streamChatMock = vi.fn().mockResolvedValue(undefined)
vi.mock('../lib/aiClient', () => ({ streamChat: (...args) => streamChatMock(...args) }))

import { useChatStore } from '../store/chatStore'

describe('chatStore mode', () => {
  beforeEach(() => {
    streamChatMock.mockClear()
    useChatStore.setState({ conversations: {}, messages: {}, tierInfo: null })
  })

  test("sendMessage requests mode 'chat' and registers no onToolCall", async () => {
    const id = useChatStore.getState().createConversation()
    useChatStore.getState().addMessage(id, { role: 'user', text: 'hello' })
    await useChatStore.getState().sendMessage(id, 'hello')

    const [request, handlers] = streamChatMock.mock.calls[0]
    expect(request.mode).toBe('chat')
    expect(request.boardId).toBeUndefined()
    expect(handlers.onToolCall).toBeUndefined()
  })

  test('tool-approval actions are gone', () => {
    expect(useChatStore.getState().approveToolCall).toBeUndefined()
    expect(useChatStore.getState().rejectToolCall).toBeUndefined()
  })
})
