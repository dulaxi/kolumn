import { describe, test, expect, beforeEach } from 'vitest'
import { useChatStore, friendlyChatError } from '../store/chatStore'

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

  test('renameConversation trims and updates the title', () => {
    const id = useChatStore.getState().createConversation('Old')
    useChatStore.getState().renameConversation(id, '  New name  ')
    expect(useChatStore.getState().conversations[id].title).toBe('New name')
  })

  test('renameConversation ignores empty titles and unknown ids', () => {
    const id = useChatStore.getState().createConversation('Keep me')
    useChatStore.getState().renameConversation(id, '   ')
    expect(useChatStore.getState().conversations[id].title).toBe('Keep me')
    useChatStore.getState().renameConversation('nope', 'x')
    expect(useChatStore.getState().conversations.nope).toBeUndefined()
  })

  test('toggleStarred flips the flag', () => {
    const id = useChatStore.getState().createConversation('Chat')
    expect(useChatStore.getState().conversations[id].starred).toBeFalsy()
    useChatStore.getState().toggleStarred(id)
    expect(useChatStore.getState().conversations[id].starred).toBe(true)
    useChatStore.getState().toggleStarred(id)
    expect(useChatStore.getState().conversations[id].starred).toBe(false)
  })

  test('generateTitle does not revert a manual rename', () => {
    const id = useChatStore.getState().createConversation('Untitled')
    useChatStore.getState().addMessage(id, { role: 'user', text: 'Create three cards for the new landing page redesign project' })
    useChatStore.getState().renameConversation(id, 'My name')
    useChatStore.getState().generateTitle(id)
    expect(useChatStore.getState().conversations[id].title).toBe('My name')
  })

  test('addMessage stores mentionedCardIds, defaulting to []', () => {
    const id = useChatStore.getState().createConversation('Chat')
    useChatStore.getState().addMessage(id, { role: 'user', text: 'hi', mentionedCardIds: ['c9'] })
    useChatStore.getState().addMessage(id, { role: 'user', text: 'again' })
    const msgs = useChatStore.getState().messages[id]
    expect(msgs[0].mentionedCardIds).toEqual(['c9'])
    expect(msgs[1].mentionedCardIds).toEqual([])
    expect(msgs[0].activities).toEqual([])
  })
})

describe('friendlyChatError', () => {
  test('flags daily-limit errors and keeps the server copy', () => {
    const res = friendlyChatError("You've reached your daily limit of 20 messages. Upgrade to Pro for unlimited access.")
    expect(res.isLimit).toBe(true)
    expect(res.message).toMatch(/daily limit/i)
  })

  test('never passes raw wire errors through', () => {
    const res = friendlyChatError('Claude API error: 529 {"type":"error","error":{"type":"overloaded_error"}}')
    expect(res.isLimit).toBe(false)
    expect(res.message).not.toContain('529')
    expect(res.message).not.toContain('{')
  })

  test('maps auth failures to a sign-in prompt', () => {
    expect(friendlyChatError('Error 401: Unauthorized').message).toMatch(/sign in/i)
    expect(friendlyChatError('Not authenticated').message).toMatch(/sign in/i)
  })

  test('maps overload and 5xx to a temporary-busy line', () => {
    expect(friendlyChatError('Claude API error: 529 overloaded').message).toMatch(/busy|moment/i)
    expect(friendlyChatError('Error 500: Internal Server Error').message).toMatch(/busy|moment/i)
  })

  test('maps network failures to a connection line', () => {
    expect(friendlyChatError('Failed to fetch').message).toMatch(/connection/i)
    expect(friendlyChatError('No response stream').message).toMatch(/connection/i)
  })

  test('friendlyChatError classifies a 5xx containing "unauthorized" as busy, not auth', () => {
    const res = friendlyChatError('Error 502: upstream said unauthorized gateway')
    expect(res.message).toMatch(/busy|moment/i)
  })
})
