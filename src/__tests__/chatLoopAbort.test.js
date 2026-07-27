import { describe, test, expect, vi, beforeEach } from 'vitest'
import { runChatLoop } from '../lib/chatAgentLoop'
import { streamChat } from '../lib/aiClient'
import { executeTool } from '../lib/toolExecutor'

vi.mock('../lib/aiClient', () => ({ streamChat: vi.fn() }))
vi.mock('../lib/toolExecutor', () => ({ executeTool: vi.fn() }))

describe('runChatLoop abort', () => {
  beforeEach(() => {
    streamChat.mockReset()
    executeTool.mockReset()
  })

  test('aborted stream returns aborted:true with partial text and no error', async () => {
    streamChat.mockImplementation(async (_payload, cbs) => {
      cbs.onText('partial ')
      cbs.onDone({ stopReason: 'aborted' })
    })
    const controller = new AbortController()
    const res = await runChatLoop({ text: 'q' }, {}, { signal: controller.signal })
    expect(res.aborted).toBe(true)
    expect(res.fullText).toBe('partial ')
    expect(res.error).toBeNull()
    expect(streamChat).toHaveBeenCalledTimes(1)
  })

  test('abort landing during tool execution stops before the continuation round', async () => {
    const controller = new AbortController()
    executeTool.mockImplementation(async () => {
      controller.abort()
      return { ok: true, cards: [] }
    })
    streamChat.mockImplementation(async (_payload, cbs) => {
      cbs.onToolCall({ id: 't1', action: 'search_cards', params: {} })
      cbs.onDone({ stopReason: 'tool_use' })
    })
    const res = await runChatLoop({ text: 'q' }, {}, { signal: controller.signal })
    expect(res.aborted).toBe(true)
    expect(streamChat).toHaveBeenCalledTimes(1)
  })

  test('the signal is forwarded to every streamChat call', async () => {
    streamChat.mockImplementation(async (_p, cbs) => cbs.onDone({ stopReason: null }))
    const controller = new AbortController()
    const res = await runChatLoop({ text: 'q' }, {}, { signal: controller.signal })
    expect(streamChat.mock.calls[0][2]).toEqual({ signal: controller.signal })
    expect(res.aborted).toBe(false)
  })
})
