import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/chatAgentLoop', () => ({ runChatLoop: vi.fn() }))

import { runChatLoop } from '../lib/chatAgentLoop'
import { useChatStore } from '../store/chatStore'
import { useBoardStore } from '../store/boardStore'

beforeEach(() => {
  useChatStore.setState({ conversations: {}, messages: {}, activeConversationId: null, streaming: {} })
  useBoardStore.setState({ cards: {} })
  runChatLoop.mockReset()
})

describe('sendMessage via runChatLoop', () => {
  test('streams text, records activities at round boundaries, unions mentions', async () => {
    useBoardStore.setState({ cards: { c2: { id: 'c2', title: 'Landing page', board_id: 'b1' } } })
    runChatLoop.mockImplementation(async (_args, { onText, onActivity }) => {
      onText('Looking… ')
      onActivity({ icon: 'search', label: 'Searched cards · 1 result' })
      onText('Landing page is in To do.')
      return { fullText: 'Looking… Landing page is in To do.', toolCardIds: ['c7'], error: null, errorCode: null }
    })
    const id = useChatStore.getState().createConversation('Chat')
    useChatStore.getState().addMessage(id, { role: 'user', text: 'where is it?' })
    await useChatStore.getState().sendMessage(id, 'where is it?')
    const msgs = useChatStore.getState().messages[id]
    const assistant = msgs[msgs.length - 1]
    expect(assistant.text).toBe('Looking… Landing page is in To do.')
    expect(assistant.activities).toEqual([{ atChar: 'Looking… '.length, icon: 'search', label: 'Searched cards · 1 result' }])
    expect(assistant.mentionedCardIds.sort()).toEqual(['c2', 'c7'])
    expect(useChatStore.getState().streaming[id]).toBeUndefined()
  })

  test('loop error maps through friendlyChatError path and keeps partial mentions', async () => {
    useBoardStore.setState({ cards: { c2: { id: 'c2', title: 'Landing page', board_id: 'b1' } } })
    runChatLoop.mockImplementation(async (_args, { onText }) => {
      onText('Partial about Landing page')
      return { fullText: 'Partial about Landing page', toolCardIds: [], error: 'failed to fetch', errorCode: undefined }
    })
    const id = useChatStore.getState().createConversation('Chat')
    await useChatStore.getState().sendMessage(id, 'x')
    const assistant = useChatStore.getState().messages[id].at(-1)
    expect(assistant.error.message).toMatch(/connection/i)
    expect(assistant.mentionedCardIds).toEqual(['c2'])
  })

  test('rate_limit code sets isLimit', async () => {
    runChatLoop.mockResolvedValue({ fullText: '', toolCardIds: [], error: 'Daily limit reached', errorCode: 'rate_limit' })
    const id = useChatStore.getState().createConversation('Chat')
    await useChatStore.getState().sendMessage(id, 'x')
    expect(useChatStore.getState().messages[id].at(-1).error.isLimit).toBe(true)
  })
})
