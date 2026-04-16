import { describe, test, expect, beforeEach } from 'vitest'
import { useChatStore } from '../store/chatStore'

beforeEach(() => {
  useChatStore.setState({
    conversations: {},
    messages: {},
    activeConversationId: null,
    streamingConversationId: null,
  })
})

describe('chatStore', () => {
  test('createConversation returns id and adds to store', () => {
    const id = useChatStore.getState().createConversation('Test chat')
    expect(id).toBeTruthy()
    const conv = useChatStore.getState().conversations[id]
    expect(conv.title).toBe('Test chat')
    expect(conv.id).toBe(id)
    expect(conv.created_at).toBeTruthy()
    expect(conv.updated_at).toBeTruthy()
  })

  test('addMessage appends to conversation messages', () => {
    const convId = useChatStore.getState().createConversation('Chat')
    useChatStore.getState().addMessage(convId, {
      role: 'user',
      text: 'Hello',
    })
    const msgs = useChatStore.getState().messages[convId]
    expect(msgs).toHaveLength(1)
    expect(msgs[0].role).toBe('user')
    expect(msgs[0].text).toBe('Hello')
    expect(msgs[0].id).toBeTruthy()
    expect(msgs[0].cardIds).toEqual([])
    expect(msgs[0].created_at).toBeTruthy()
  })

  test('addMessage with cardIds stores them', () => {
    const convId = useChatStore.getState().createConversation('Chat')
    useChatStore.getState().addMessage(convId, {
      role: 'assistant',
      text: 'Created cards',
      cardIds: ['c1', 'c2'],
    })
    const msgs = useChatStore.getState().messages[convId]
    expect(msgs[0].cardIds).toEqual(['c1', 'c2'])
  })

  test('generateTitle truncates first user message', () => {
    const convId = useChatStore.getState().createConversation('Untitled')
    useChatStore.getState().addMessage(convId, {
      role: 'user',
      text: 'Create three cards for the new landing page redesign project',
    })
    useChatStore.getState().generateTitle(convId)
    const conv = useChatStore.getState().conversations[convId]
    expect(conv.title.length).toBeLessThanOrEqual(40)
    expect(conv.title).toBe('Create three cards for the new landing…')
  })

  test('generateTitle keeps short messages as-is', () => {
    const convId = useChatStore.getState().createConversation('Untitled')
    useChatStore.getState().addMessage(convId, {
      role: 'user',
      text: 'Hello',
    })
    useChatStore.getState().generateTitle(convId)
    expect(useChatStore.getState().conversations[convId].title).toBe('Hello')
  })

  test('getConversationsSorted returns newest first', () => {
    const id1 = useChatStore.getState().createConversation('First')
    const id2 = useChatStore.getState().createConversation('Second')
    useChatStore.setState((s) => ({
      conversations: {
        ...s.conversations,
        [id1]: { ...s.conversations[id1], updated_at: '2026-01-01T00:00:00Z' },
        [id2]: { ...s.conversations[id2], updated_at: '2026-01-02T00:00:00Z' },
      },
    }))
    const sorted = useChatStore.getState().getConversationsSorted()
    expect(sorted[0].id).toBe(id2)
    expect(sorted[1].id).toBe(id1)
  })

  test('multiple messages maintain order', () => {
    const convId = useChatStore.getState().createConversation('Chat')
    useChatStore.getState().addMessage(convId, { role: 'user', text: 'First' })
    useChatStore.getState().addMessage(convId, { role: 'assistant', text: 'Second' })
    useChatStore.getState().addMessage(convId, { role: 'user', text: 'Third' })
    const msgs = useChatStore.getState().messages[convId]
    expect(msgs.map((m) => m.text)).toEqual(['First', 'Second', 'Third'])
  })
})
