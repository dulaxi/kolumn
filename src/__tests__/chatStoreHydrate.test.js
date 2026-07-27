import { describe, test, expect, vi, beforeEach } from 'vitest'
import { useChatStore, _syncedIds } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import * as chatSync from '../lib/chatSync'

vi.mock('../lib/chatSync', () => ({
  fetchThreads: vi.fn(),
  fetchMessages: vi.fn(),
  upsertThread: vi.fn().mockResolvedValue({ ok: true }),
  upsertMessage: vi.fn().mockResolvedValue({ ok: true }),
  deleteThread: vi.fn().mockResolvedValue({ ok: true }),
}))
vi.mock('../lib/chatAgentLoop', () => ({ runChatLoop: vi.fn() }))
vi.mock('../lib/aiClient', () => ({ streamChat: vi.fn().mockResolvedValue(undefined) }))

beforeEach(() => {
  useAuthStore.setState({ user: { id: 'u1' } })
  useChatStore.setState({ conversations: {}, messages: {}, streaming: {} })
  chatSync.fetchThreads.mockReset()
  chatSync.fetchMessages.mockReset()
})

describe('hydrateFromServer', () => {
  test('server rows replace cached ones; absent cached ones become localOnly', async () => {
    useChatStore.setState({
      conversations: {
        a: { id: 'a', title: 'Cached A', created_at: '1', updated_at: '1' },
        b: { id: 'b', title: 'Legacy B', created_at: '1', updated_at: '1' },
      },
      messages: { a: [], b: [] },
    })
    chatSync.fetchThreads.mockResolvedValue({
      ok: true,
      data: [{ id: 'a', title: 'Server A', created_at: '1', updated_at: '2' }],
    })
    await useChatStore.getState().hydrateFromServer()
    const convs = useChatStore.getState().conversations
    expect(convs.a.title).toBe('Server A')
    expect(convs.a.localOnly).toBeUndefined()
    expect(convs.b.localOnly).toBe(true)
    expect(convs.b.title).toBe('Legacy B')
  })

  test('conversations synced this session are never flagged localOnly', async () => {
    _syncedIds.add('fresh1')
    useChatStore.setState({
      conversations: { fresh1: { id: 'fresh1', title: 'Just made', created_at: '9', updated_at: '9' } },
      messages: { fresh1: [] },
    })
    chatSync.fetchThreads.mockResolvedValue({ ok: true, data: [] })
    await useChatStore.getState().hydrateFromServer()
    expect(useChatStore.getState().conversations.fresh1.localOnly).toBeUndefined()
  })

  test('fetch failure leaves state untouched', async () => {
    useChatStore.setState({
      conversations: { a: { id: 'a', title: 'A', created_at: '1', updated_at: '1' } },
      messages: { a: [] },
    })
    chatSync.fetchThreads.mockResolvedValue({ ok: false, error: {} })
    await useChatStore.getState().hydrateFromServer()
    expect(useChatStore.getState().conversations.a.localOnly).toBeUndefined()
  })

  test('signed out is a no-op', async () => {
    useAuthStore.setState({ user: null })
    await useChatStore.getState().hydrateFromServer()
    expect(chatSync.fetchThreads).not.toHaveBeenCalled()
  })
})

describe('ensureMessagesLoaded', () => {
  test('fetches once, merges server list with unsynced local tail', async () => {
    const id = crypto.randomUUID()
    useChatStore.setState({
      conversations: { [id]: { id, title: 'T', created_at: '1', updated_at: '1' } },
      messages: {
        [id]: [
          { id: 'shared', role: 'user', text: 'cached copy', created_at: '1' },
          { id: 'local-only', role: 'assistant', text: '', error: { message: 'x' }, created_at: '2' },
        ],
      },
    })
    chatSync.fetchMessages.mockResolvedValue({
      ok: true,
      data: [{ id: 'shared', role: 'user', text: 'server copy', cardIds: [], mentionedCardIds: [], activities: [], created_at: '1' }],
    })
    await useChatStore.getState().ensureMessagesLoaded(id)
    const msgs = useChatStore.getState().messages[id]
    expect(msgs.map((m) => m.id)).toEqual(['shared', 'local-only'])
    expect(msgs[0].text).toBe('server copy')

    await useChatStore.getState().ensureMessagesLoaded(id)
    expect(chatSync.fetchMessages).toHaveBeenCalledTimes(1)
  })

  test('localOnly conversations never fetch', async () => {
    const id = crypto.randomUUID()
    useChatStore.setState({
      conversations: { [id]: { id, title: 'L', localOnly: true, created_at: '1', updated_at: '1' } },
      messages: { [id]: [] },
    })
    await useChatStore.getState().ensureMessagesLoaded(id)
    expect(chatSync.fetchMessages).not.toHaveBeenCalled()
  })

  test('a failed fetch clears the loaded flag so the next mount retries', async () => {
    const id = crypto.randomUUID()
    useChatStore.setState({
      conversations: { [id]: { id, title: 'T', created_at: '1', updated_at: '1' } },
      messages: { [id]: [] },
    })
    chatSync.fetchMessages.mockResolvedValueOnce({ ok: false, error: {} })
    await useChatStore.getState().ensureMessagesLoaded(id)
    chatSync.fetchMessages.mockResolvedValueOnce({ ok: true, data: [] })
    await useChatStore.getState().ensureMessagesLoaded(id)
    expect(chatSync.fetchMessages).toHaveBeenCalledTimes(2)
  })
})
