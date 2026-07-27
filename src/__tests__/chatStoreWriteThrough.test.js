import { describe, test, expect, vi, beforeEach } from 'vitest'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import * as chatSync from '../lib/chatSync'
import { runChatLoop } from '../lib/chatAgentLoop'

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
  chatSync.upsertThread.mockClear()
  chatSync.upsertMessage.mockClear()
  chatSync.deleteThread.mockClear()
  runChatLoop.mockReset()
})

describe('write-through', () => {
  test('createConversation upserts the thread', () => {
    const id = useChatStore.getState().createConversation()
    expect(chatSync.upsertThread).toHaveBeenCalledWith('u1', expect.objectContaining({ id }))
  })

  test('user messages upsert; assistant placeholders do not', () => {
    const id = useChatStore.getState().createConversation()
    chatSync.upsertMessage.mockClear()
    useChatStore.getState().addMessage(id, { role: 'user', text: 'question' })
    expect(chatSync.upsertMessage).toHaveBeenCalledTimes(1)
    useChatStore.getState().addMessage(id, { role: 'assistant', text: '' })
    expect(chatSync.upsertMessage).toHaveBeenCalledTimes(1)
  })

  test('rename, star, and railGroupBy upsert the thread', () => {
    const id = useChatStore.getState().createConversation()
    chatSync.upsertThread.mockClear()
    useChatStore.getState().renameConversation(id, 'New name')
    useChatStore.getState().toggleStarred(id)
    useChatStore.getState().setRailGroupBy(id, 'board')
    expect(chatSync.upsertThread).toHaveBeenCalledTimes(3)
    expect(chatSync.upsertThread).toHaveBeenLastCalledWith('u1', expect.objectContaining({ railGroupBy: 'board' }))
  })

  test('deleteConversation deletes the thread server-side', () => {
    const id = useChatStore.getState().createConversation()
    useChatStore.getState().deleteConversation(id)
    expect(chatSync.deleteThread).toHaveBeenCalledWith(id)
  })

  test('localOnly conversations never sync anything', () => {
    const id = crypto.randomUUID()
    useChatStore.setState({
      conversations: { [id]: { id, title: 'Legacy', localOnly: true, created_at: '1', updated_at: '1' } },
      messages: { [id]: [] },
    })
    useChatStore.getState().addMessage(id, { role: 'user', text: 'q' })
    useChatStore.getState().renameConversation(id, 'still legacy')
    useChatStore.getState().deleteConversation(id)
    expect(chatSync.upsertThread).not.toHaveBeenCalled()
    expect(chatSync.upsertMessage).not.toHaveBeenCalled()
    expect(chatSync.deleteThread).not.toHaveBeenCalled()
  })

  test('successful replies upsert the final assistant message', async () => {
    runChatLoop.mockImplementation(async (_i, cbs) => {
      cbs.onText('the answer')
      return { toolCardIds: [], error: null, errorCode: null, aborted: false }
    })
    const id = useChatStore.getState().createConversation()
    useChatStore.getState().addMessage(id, { role: 'user', text: 'q' })
    chatSync.upsertMessage.mockClear()
    await useChatStore.getState().sendMessage(id, 'q')
    const assistantCalls = chatSync.upsertMessage.mock.calls.filter(([, , m]) => m.role === 'assistant')
    expect(assistantCalls).toHaveLength(1)
    expect(assistantCalls[0][2].text).toBe('the answer')
  })

  test('stopped replies persist with the stopped flag; errored replies do not persist', async () => {
    const id = useChatStore.getState().createConversation()
    useChatStore.getState().addMessage(id, { role: 'user', text: 'q' })
    chatSync.upsertMessage.mockClear()
    runChatLoop.mockResolvedValueOnce({ toolCardIds: [], error: null, errorCode: null, aborted: true })
    await useChatStore.getState().sendMessage(id, 'q')
    let assistantCalls = chatSync.upsertMessage.mock.calls.filter(([, , m]) => m.role === 'assistant')
    expect(assistantCalls).toHaveLength(1)
    expect(assistantCalls[0][2].stopped).toBe(true)

    chatSync.upsertMessage.mockClear()
    runChatLoop.mockResolvedValueOnce({ toolCardIds: [], error: 'boom', errorCode: null, aborted: false })
    await useChatStore.getState().sendMessage(id, 'q')
    assistantCalls = chatSync.upsertMessage.mock.calls.filter(([, , m]) => m.role === 'assistant')
    expect(assistantCalls).toHaveLength(0)
  })
})
