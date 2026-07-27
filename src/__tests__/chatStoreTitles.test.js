import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/aiClient', () => ({ streamChat: vi.fn() }))

import { streamChat } from '../lib/aiClient'
import { useChatStore, cleanTitle } from '../store/chatStore'

const seedConvo = (withAssistant = true) => {
  const id = useChatStore.getState().createConversation('New chat')
  useChatStore.getState().addMessage(id, { role: 'user', text: 'help me plan the kolumn.app launch marketing push for next month' })
  if (withAssistant) useChatStore.getState().addMessage(id, { role: 'assistant', text: 'Sure — here is a plan.' })
  return id
}

beforeEach(() => {
  useChatStore.setState({ conversations: {}, messages: {}, activeConversationId: null, streaming: {} })
  streamChat.mockReset()
})

describe('AI titles', () => {
  test('sets the AI title once and stamps aiTitled', async () => {
    streamChat.mockImplementation(async (req, h) => {
      expect(req.mode).toBe('title')
      expect(req.message).toContain('User: help me plan')
      expect(req.message).toContain('Assistant: Sure')
      h.onText('Kolumn Launch Marketing')
      h.onDone({ stopReason: 'end_turn' })
    })
    const id = seedConvo()
    await useChatStore.getState().generateTitle(id)
    const conv = useChatStore.getState().conversations[id]
    expect(conv.title).toBe('Kolumn Launch Marketing')
    expect(conv.aiTitled).toBe(true)
    await useChatStore.getState().generateTitle(id)
    expect(streamChat).toHaveBeenCalledTimes(1)
  })

  test('manual rename blocks AI titling entirely', async () => {
    const id = seedConvo()
    useChatStore.getState().renameConversation(id, 'My name')
    await useChatStore.getState().generateTitle(id)
    expect(streamChat).not.toHaveBeenCalled()
    expect(useChatStore.getState().conversations[id].title).toBe('My name')
  })

  test('a rename that lands mid-flight wins over the AI result', async () => {
    let convId
    streamChat.mockImplementation(async (_req, h) => {
      useChatStore.getState().renameConversation(convId, 'Mine')
      h.onText('AI Name')
      h.onDone({})
    })
    convId = seedConvo()
    await useChatStore.getState().generateTitle(convId)
    const conv = useChatStore.getState().conversations[convId]
    expect(conv.title).toBe('Mine')
    expect(conv.aiTitled).toBeFalsy()
  })

  test('stream error keeps the truncation fallback and allows retry', async () => {
    streamChat.mockImplementation(async (_req, h) => { h.onError('boom') })
    const id = seedConvo()
    await useChatStore.getState().generateTitle(id)
    const conv = useChatStore.getState().conversations[id]
    expect(conv.title).toBe('help me plan the kolumn.app launch mark…')
    expect(conv.aiTitled).toBeFalsy()
  })

  test('no assistant reply yet: truncation only, no call', async () => {
    const id = seedConvo(false)
    await useChatStore.getState().generateTitle(id)
    expect(streamChat).not.toHaveBeenCalled()
    expect(useChatStore.getState().conversations[id].title.endsWith('…')).toBe(true)
  })

  test('concurrent calls dedup to a single streamChat invocation', async () => {
    let release
    streamChat.mockImplementation((_req, h) => new Promise((r) => {
      release = () => {
        h.onText('Name')
        h.onDone({})
        r()
      }
    }))
    const id = seedConvo()
    const p1 = useChatStore.getState().generateTitle(id)
    const p2 = useChatStore.getState().generateTitle(id)
    release()
    await Promise.all([p1, p2])
    expect(streamChat).toHaveBeenCalledTimes(1)
  })
})

describe('cleanTitle', () => {
  test('strips quotes and trailing punctuation, collapses whitespace, clamps', () => {
    expect(cleanTitle('"Kolumn  Launch Plan."')).toBe('Kolumn Launch Plan')
    expect(cleanTitle('“Launch”')).toBe('Launch')
    expect(cleanTitle('Plan…')).toBe('Plan')
    expect(cleanTitle('  ')).toBe('')
    expect(cleanTitle('x'.repeat(80)).length).toBeLessThanOrEqual(60)
  })

  test('clamp is codepoint-safe: never splits a surrogate pair', () => {
    expect(cleanTitle('🎯'.repeat(40))).not.toMatch(/[\uD800-\uDBFF]$/)
  })
})
