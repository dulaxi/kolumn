import { describe, test, expect } from 'vitest'
import { useChatStore } from '../store/chatStore'

const partialize = () => useChatStore.persist.getOptions().partialize(useChatStore.getState())

describe('cache trimming', () => {
  test('caps cached threads at the 30 most recent, localOnly exempt', () => {
    const conversations = {}
    const messages = {}
    for (let i = 1; i <= 31; i++) {
      const id = `t${i}`
      conversations[id] = { id, title: `T${i}`, created_at: '1', updated_at: String(i).padStart(3, '0') }
      messages[id] = []
    }
    conversations.legacy = { id: 'legacy', title: 'Old', localOnly: true, created_at: '1', updated_at: '000' }
    messages.legacy = []
    useChatStore.setState({ conversations, messages })
    const cached = partialize()
    // t1 (oldest updated_at) is dropped; the 30 newest + the localOnly stay.
    expect(cached.conversations.t1).toBeUndefined()
    expect(cached.conversations.t31).toBeDefined()
    expect(cached.conversations.legacy).toBeDefined()
    expect(Object.keys(cached.conversations)).toHaveLength(31)
    // In-memory state is untouched.
    expect(useChatStore.getState().conversations.t1).toBeDefined()
  })

  test('caps cached messages at the last 100 per thread', () => {
    const msgs = []
    for (let i = 1; i <= 101; i++) {
      msgs.push({ id: `m${i}`, role: 'user', text: `msg ${i}`, created_at: String(i) })
    }
    useChatStore.setState({
      conversations: { t1: { id: 't1', title: 'T', created_at: '1', updated_at: '1' } },
      messages: { t1: msgs },
    })
    const cached = partialize()
    expect(cached.messages.t1).toHaveLength(100)
    expect(cached.messages.t1[0].id).toBe('m2')
    expect(cached.messages.t1.at(-1).id).toBe('m101')
    expect(useChatStore.getState().messages.t1).toHaveLength(101)
  })
})
