import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }) },
  },
}))
vi.mock('../lib/env', () => ({ env: { supabaseUrl: 'https://x.test', supabaseAnonKey: 'anon' } }))
vi.mock('../utils/logger', () => ({ logError: vi.fn() }))

import { streamChat } from '../lib/aiClient'

// Build a fetch mock whose body streams the given SSE lines then closes.
function mockFetchWithEvents(events) {
  const payload = events.map((e) => `data: ${JSON.stringify(e)}\n`).join('')
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(payload))
      controller.close()
    },
  })
  return vi.fn().mockResolvedValue({ ok: true, body })
}

describe('streamChat', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  test('sends mode, boardId, and structured history in the request body', async () => {
    global.fetch = mockFetchWithEvents([{ type: 'done', stopReason: 'end_turn' }])
    const history = [
      { role: 'user', content: 'make a card' },
      { role: 'assistant', content: [{ type: 'text', text: 'On it' }, { type: 'tool_use', id: 't1', name: 'create_card', input: {} }] },
    ]
    await streamChat(
      { message: [{ type: 'tool_result', tool_use_id: 't1', content: '{"ok":true}' }], history, mode: 'pill', boardId: 'b1' },
      { onText: vi.fn(), onToolCall: vi.fn(), onDone: vi.fn(), onError: vi.fn() },
    )
    const bodySent = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(bodySent.mode).toBe('pill')
    expect(bodySent.boardId).toBe('b1')
    expect(bodySent.history).toEqual(history)
    expect(bodySent.message[0].type).toBe('tool_result')
  })

  test('onToolCall receives {id, action, params}; onDone receives stopReason', async () => {
    global.fetch = mockFetchWithEvents([
      { type: 'text', content: 'On it' },
      { type: 'tool_call', id: 'toolu_9', action: 'create_card', params: { title: 'X' } },
      { type: 'done', stopReason: 'tool_use' },
    ])
    const onToolCall = vi.fn()
    const onDone = vi.fn()
    await streamChat(
      { message: 'add X', mode: 'pill', boardId: 'b1' },
      { onText: vi.fn(), onToolCall, onDone, onError: vi.fn() },
    )
    expect(onToolCall).toHaveBeenCalledWith({ id: 'toolu_9', action: 'create_card', params: { title: 'X' } })
    expect(onDone).toHaveBeenCalledWith({ stopReason: 'tool_use' })
  })

  test('chat mode omits boardId from the body', async () => {
    global.fetch = mockFetchWithEvents([{ type: 'done', stopReason: 'end_turn' }])
    await streamChat(
      { message: 'hello', mode: 'chat' },
      { onText: vi.fn(), onToolCall: vi.fn(), onDone: vi.fn(), onError: vi.fn() },
    )
    const bodySent = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(bodySent.mode).toBe('chat')
    expect('boardId' in bodySent).toBe(false)
  })

  test('network failure on the initial POST routes to onError instead of rejecting', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const onError = vi.fn()
    await expect(
      streamChat({ message: 'hi', mode: 'chat' }, { onText: vi.fn(), onDone: vi.fn(), onError }),
    ).resolves.toBeUndefined()
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch'), undefined)
  })

  test('JSON envelope errors surface message + code, and 429 remaining reaches onTier', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: 'rate_limit', message: 'You have reached your daily limit of 20 messages.', remaining: 0 }),
      { status: 429 },
    ))
    const onError = vi.fn(); const onTier = vi.fn()
    await streamChat({ message: 'hi', mode: 'chat' }, { onText: vi.fn(), onDone: vi.fn(), onError, onTier })
    expect(onTier).toHaveBeenCalledWith(expect.objectContaining({ remaining: 0 }))
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('daily limit'), 'rate_limit')
  })
})
