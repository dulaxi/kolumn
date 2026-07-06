import { describe, test, expect, vi, beforeEach } from 'vitest'

const streamChatMock = vi.fn()
const executeToolMock = vi.fn()
vi.mock('../lib/aiClient', () => ({ streamChat: (...a) => streamChatMock(...a) }))
vi.mock('../lib/toolExecutor', () => ({ executeTool: (...a) => executeToolMock(...a) }))
vi.mock('../utils/logger', () => ({ logError: vi.fn(), logWarn: vi.fn() }))

import { runPillLoop } from '../lib/pillAgentLoop'

// Scripted rounds: each entry drives one streamChat call.
// { text, toolCalls: [{id, action, params}], stopReason } or { error }
function scriptRounds(rounds) {
  let i = 0
  streamChatMock.mockImplementation(async (_req, handlers) => {
    const r = rounds[Math.min(i, rounds.length - 1)]
    i++
    if (r.error) { handlers.onError(r.error); return }
    if (r.text) handlers.onText(r.text)
    for (const tc of r.toolCalls || []) await handlers.onToolCall(tc)
    handlers.onDone({ stopReason: r.stopReason })
  })
}

beforeEach(() => { streamChatMock.mockReset(); executeToolMock.mockReset() })

describe('runPillLoop', () => {
  test('single round, no tools: returns model text, no continuation', async () => {
    scriptRounds([{ text: 'Nothing to do here.', stopReason: 'end_turn' }])
    const res = await runPillLoop({ text: 'hi', boardId: 'b1', boardName: 'Alpha' }, { onProgress: vi.fn() })
    expect(res.finalText).toBe('Nothing to do here.')
    expect(res.rows).toEqual([])
    expect(streamChatMock).toHaveBeenCalledTimes(1)
  })

  test('tool round: executes tools, sends tool_results as next message, final text wins', async () => {
    scriptRounds([
      { text: 'On it…', toolCalls: [{ id: 't1', action: 'create_card', params: { title: 'X' } }], stopReason: 'tool_use' },
      { text: 'Created "X" in To Do.', stopReason: 'end_turn' },
    ])
    executeToolMock.mockResolvedValue({ ok: true, cardId: 'c9' })
    const onProgress = vi.fn()
    const res = await runPillLoop({ text: 'add X', boardId: 'b1', boardName: 'Alpha' }, { onProgress })

    // Tool executed with pill context injected
    expect(executeToolMock).toHaveBeenCalledWith('create_card', { title: 'X', board: 'Alpha', boardId: 'b1' })
    // Progress row surfaced
    expect(onProgress).toHaveBeenCalledWith([{ ok: true, label: 'Created "X"' }])
    // Round 2 request: history = [user, assistant(text+tool_use)], message = tool_results
    const round2 = streamChatMock.mock.calls[1][0]
    expect(round2.history[0]).toEqual({ role: 'user', content: 'add X' })
    expect(round2.history[1].role).toBe('assistant')
    expect(round2.history[1].content.some((b) => b.type === 'tool_use' && b.id === 't1')).toBe(true)
    expect(round2.message).toEqual([
      { type: 'tool_result', tool_use_id: 't1', content: JSON.stringify({ ok: true, cardId: 'c9' }) },
    ])
    expect(res.finalText).toBe('Created "X" in To Do.')
  })

  test('failed tool becomes is_error tool_result and a failed row', async () => {
    scriptRounds([
      { toolCalls: [{ id: 't1', action: 'move_card', params: { card_title: 'X', to_column: 'Done' } }], stopReason: 'tool_use' },
      { text: 'That column does not exist.', stopReason: 'end_turn' },
    ])
    executeToolMock.mockResolvedValue({ ok: false, error: 'Column "Done" not found' })
    const res = await runPillLoop({ text: 'move X', boardId: 'b1', boardName: 'Alpha' }, { onProgress: vi.fn() })
    expect(res.rows).toEqual([{ ok: false, label: 'Column "Done" not found' }])
    const round2 = streamChatMock.mock.calls[1][0]
    expect(round2.message[0].is_error).toBe(true)
  })

  test('stops at 4 rounds even if the model keeps calling tools', async () => {
    scriptRounds([
      { toolCalls: [{ id: 't', action: 'create_card', params: { title: 'Y' } }], stopReason: 'tool_use' },
    ])
    executeToolMock.mockResolvedValue({ ok: true })
    await runPillLoop({ text: 'loop', boardId: 'b1', boardName: 'Alpha' }, { onProgress: vi.fn() })
    expect(streamChatMock).toHaveBeenCalledTimes(4)
    // The 4th request's tool_results carry the round-limit note
    const last = streamChatMock.mock.calls[3][0]
    expect(JSON.stringify(last.message)).toMatch(/round limit/i)
  })

  test('caps tool executions at 10 per round', async () => {
    const many = Array.from({ length: 14 }, (_, k) => ({ id: `t${k}`, action: 'create_card', params: { title: `C${k}` } }))
    scriptRounds([
      { toolCalls: many, stopReason: 'tool_use' },
      { text: 'done', stopReason: 'end_turn' },
    ])
    executeToolMock.mockResolvedValue({ ok: true })
    await runPillLoop({ text: 'many', boardId: 'b1', boardName: 'Alpha' }, { onProgress: vi.fn() })
    expect(executeToolMock).toHaveBeenCalledTimes(10)
    // Skipped tools still get is_error tool_results so the model knows
    const round2 = streamChatMock.mock.calls[1][0]
    expect(round2.message).toHaveLength(14)
    expect(round2.message.filter((r) => r.is_error)).toHaveLength(4)
  })

  test('stream error surfaces as error, loop stops', async () => {
    scriptRounds([{ error: "You've reached your daily limit of 20 messages. Upgrade to Pro for unlimited access." }])
    const res = await runPillLoop({ text: 'hi', boardId: 'b1', boardName: 'Alpha' }, { onProgress: vi.fn() })
    expect(res.error).toMatch(/daily limit/i)
    expect(streamChatMock).toHaveBeenCalledTimes(1)
  })
})
