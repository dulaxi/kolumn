import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/aiClient', () => ({ streamChat: vi.fn() }))
vi.mock('../lib/toolExecutor', () => ({ executeTool: vi.fn() }))

import { streamChat } from '../lib/aiClient'
import { executeTool } from '../lib/toolExecutor'
import { runChatLoop } from '../lib/chatAgentLoop'

// One scripted round: emits text chunks, tool calls, then done.
const round = ({ text = '', tools = [], stopReason = 'end_turn' }) =>
  async (_req, h) => {
    if (text) h.onText(text)
    for (const tc of tools) await h.onToolCall(tc)
    h.onDone({ stopReason })
  }

beforeEach(() => {
  streamChat.mockReset()
  executeTool.mockReset()
})

describe('runChatLoop', () => {
  test('no tools: single round, streams text through', async () => {
    streamChat.mockImplementationOnce(round({ text: 'Plain answer.' }))
    const chunks = []
    const r = await runChatLoop({ text: 'hi' }, { onText: (c) => chunks.push(c) })
    expect(r.fullText).toBe('Plain answer.')
    expect(chunks).toEqual(['Plain answer.'])
    expect(r.toolCardIds).toEqual([])
    expect(streamChat).toHaveBeenCalledTimes(1)
  })

  test('tool round: executes, feeds tool_result back, collects ids, emits activity', async () => {
    streamChat
      .mockImplementationOnce(round({ text: 'Looking… ', tools: [{ id: 't1', action: 'search_cards', params: { query: 'x' } }], stopReason: 'tool_use' }))
      .mockImplementationOnce(round({ text: 'Found it.' }))
    executeTool.mockResolvedValueOnce({ ok: true, count: 1, total: 1, cards: [{ id: 'c9', title: 'X' }] })
    const activities = []
    const r = await runChatLoop({ text: 'find x' }, { onActivity: (a) => activities.push(a) })
    expect(r.fullText).toBe('Looking… Found it.')
    expect(r.toolCardIds).toEqual(['c9'])
    expect(activities).toEqual([{ icon: 'search', label: 'Searched cards · 1 result' }])
    // Second request carries the tool_result as the message and the tool_use in history
    const secondCall = streamChat.mock.calls[1][0]
    expect(secondCall.message).toEqual([
      { type: 'tool_result', tool_use_id: 't1', content: JSON.stringify({ ok: true, count: 1, total: 1, cards: [{ id: 'c9', title: 'X' }] }) },
    ])
    const lastHistory = secondCall.history
    const assistantTurn = lastHistory[lastHistory.length - 1]
    expect(assistantTurn.role).toBe('assistant')
    expect(assistantTurn.content).toEqual([
      { type: 'text', text: 'Looking… ' },
      { type: 'tool_use', id: 't1', name: 'search_cards', input: { query: 'x' } },
    ])
    expect(secondCall.mode).toBe('chat')
  })

  test('summarize collects ids from columns and labels the board', async () => {
    streamChat
      .mockImplementationOnce(round({ tools: [{ id: 't1', action: 'summarize_board', params: { board: 'Launch' } }], stopReason: 'tool_use' }))
      .mockImplementationOnce(round({ text: 'Summary.' }))
    executeTool.mockResolvedValueOnce({ ok: true, board: 'Launch', columns: [{ title: 'To do', count: 1, cards: [{ id: 'c1' }] }], totals: { cards: 1, completed: 0, overdue: 0 } })
    const activities = []
    const r = await runChatLoop({ text: 'status?' }, { onActivity: (a) => activities.push(a) })
    expect(r.toolCardIds).toEqual(['c1'])
    expect(activities).toEqual([{ icon: 'board', label: 'Summarized Launch' }])
  })

  test('error result marks is_error and emits failure label', async () => {
    streamChat
      .mockImplementationOnce(round({ tools: [{ id: 't1', action: 'search_cards', params: {} }], stopReason: 'tool_use' }))
      .mockImplementationOnce(round({ text: 'Sorry.' }))
    executeTool.mockResolvedValueOnce({ ok: false, error: 'query is required' })
    const activities = []
    await runChatLoop({ text: 'x' }, { onActivity: (a) => activities.push(a) })
    expect(activities).toEqual([{ icon: 'search', label: 'Search failed' }])
    expect(streamChat.mock.calls[1][0].message[0].is_error).toBe(true)
  })

  test('round cap: stops after MAX_ROUNDS and appends the limit note before the last round', async () => {
    streamChat.mockImplementation(round({ text: 'again ', tools: [{ id: 't', action: 'search_cards', params: { query: 'x' } }], stopReason: 'tool_use' }))
    executeTool.mockResolvedValue({ ok: true, count: 0, total: 0, cards: [] })
    await runChatLoop({ text: 'go' })
    expect(streamChat).toHaveBeenCalledTimes(3)
    // The note is appended after round index 1 (MAX_ROUNDS - 2) executes,
    // so it rides in the FINAL round's request (index 2), not round 2's.
    expect(streamChat.mock.calls[2][0].message[0].content).toContain('round limit approaching')
    expect(streamChat.mock.calls[1][0].message[0].content).not.toContain('round limit approaching')
  })

  test('final-round guard: skips executing the last round\'s tool calls', async () => {
    streamChat.mockImplementation(round({ text: 'again ', tools: [{ id: 't', action: 'search_cards', params: { query: 'x' } }], stopReason: 'tool_use' }))
    executeTool.mockResolvedValue({ ok: true, count: 0, total: 0, cards: [] })
    const activities = []
    await runChatLoop({ text: 'go' }, { onActivity: (a) => activities.push(a) })
    expect(executeTool).toHaveBeenCalledTimes(2)
    expect(activities).toHaveLength(2)
    expect(streamChat).toHaveBeenCalledTimes(3)
  })

  test('stream error surfaces error + code', async () => {
    streamChat.mockImplementationOnce(async (_req, h) => { h.onError('boom', 'rate_limit') })
    const r = await runChatLoop({ text: 'x' })
    expect(r.error).toBe('boom')
    expect(r.errorCode).toBe('rate_limit')
  })
})
