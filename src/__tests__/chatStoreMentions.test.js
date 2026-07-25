import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/aiClient', () => ({ streamChat: vi.fn() }))

import { streamChat } from '../lib/aiClient'
import { useChatStore } from '../store/chatStore'
import { useBoardStore } from '../store/boardStore'

beforeEach(() => {
  useChatStore.setState({ conversations: {}, messages: {}, activeConversationId: null, streamingConversationId: null })
  streamChat.mockReset()
})

describe('sendMessage mention stamping', () => {
  test('onDone stamps mentionedCardIds from the streamed text', async () => {
    useBoardStore.setState({ cards: { c2: { id: 'c2', title: 'Landing page', board_id: 'b1' } } })
    streamChat.mockImplementation(async (_req, handlers) => {
      handlers.onText('You should tackle Landing page first.')
      handlers.onDone()
    })
    const id = useChatStore.getState().createConversation('Chat')
    useChatStore.getState().addMessage(id, { role: 'user', text: 'what first?' })
    await useChatStore.getState().sendMessage(id, 'what first?')
    const msgs = useChatStore.getState().messages[id]
    const assistant = msgs[msgs.length - 1]
    expect(assistant.role).toBe('assistant')
    expect(assistant.mentionedCardIds).toEqual(['c2'])
  })
})
