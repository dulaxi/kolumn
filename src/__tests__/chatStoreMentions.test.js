import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/aiClient', () => ({ streamChat: vi.fn() }))

import { streamChat } from '../lib/aiClient'
import { useChatStore } from '../store/chatStore'
import { useBoardStore } from '../store/boardStore'

beforeEach(() => {
  useChatStore.setState({ conversations: {}, messages: {}, activeConversationId: null, streaming: {} })
  useBoardStore.setState({ cards: {} })
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

describe('addMessage centralized mention stamping', () => {
  test('auto-stamps mentionedCardIds on a user message from boardStore cards', () => {
    useBoardStore.setState({ cards: { c2: { id: 'c2', title: 'Landing page', board_id: 'b1' } } })
    const id = useChatStore.getState().createConversation('Chat')
    useChatStore.getState().addMessage(id, { role: 'user', text: 'work on Landing page' })
    const msgs = useChatStore.getState().messages[id]
    expect(msgs[0].mentionedCardIds).toEqual(['c2'])
  })

  test('an explicit mentionedCardIds argument wins over auto-stamping', () => {
    useBoardStore.setState({ cards: { c2: { id: 'c2', title: 'Landing page', board_id: 'b1' } } })
    const id = useChatStore.getState().createConversation('Chat')
    useChatStore.getState().addMessage(id, { role: 'user', text: 'work on Landing page', mentionedCardIds: ['x'] })
    const msgs = useChatStore.getState().messages[id]
    expect(msgs[0].mentionedCardIds).toEqual(['x'])
  })

  test('assistant-role messages are not auto-stamped', () => {
    useBoardStore.setState({ cards: { c2: { id: 'c2', title: 'Landing page', board_id: 'b1' } } })
    const id = useChatStore.getState().createConversation('Chat')
    useChatStore.getState().addMessage(id, { role: 'assistant', text: 'Landing page is next' })
    const msgs = useChatStore.getState().messages[id]
    expect(msgs[0].mentionedCardIds).toEqual([])
  })
})
