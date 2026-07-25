import { describe, test, expect, vi, beforeEach } from 'vitest'

const streamChatMock = vi.fn()
vi.mock('../lib/aiClient', () => ({ streamChat: (...args) => streamChatMock(...args) }))

import { useChatStore } from '../store/chatStore'

describe('chatStore mode', () => {
  beforeEach(() => {
    streamChatMock.mockReset()
    streamChatMock.mockImplementation(async (_req, handlers) => {
      handlers.onText('ok')
      handlers.onDone({ stopReason: 'end_turn' })
    })
    useChatStore.setState({ conversations: {}, messages: {}, tierInfo: null })
  })

  test("sendMessage requests mode 'chat' with the tool-loop handlers wired", async () => {
    const id = useChatStore.getState().createConversation()
    useChatStore.getState().addMessage(id, { role: 'user', text: 'hello' })
    await useChatStore.getState().sendMessage(id, 'hello')

    const [request, handlers] = streamChatMock.mock.calls[0]
    expect(request.mode).toBe('chat')
    expect(request.boardId).toBeUndefined()
    // The chat loop registers onToolCall to capture tool_use blocks for its
    // read-tool rounds — its presence is the new architecture's invariant.
    expect(typeof handlers.onToolCall).toBe('function')
  })

  test('tool-approval actions are gone', () => {
    expect(useChatStore.getState().approveToolCall).toBeUndefined()
    expect(useChatStore.getState().rejectToolCall).toBeUndefined()
  })
})
