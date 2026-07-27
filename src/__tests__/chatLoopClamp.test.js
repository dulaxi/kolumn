import { describe, test, expect, vi, beforeEach } from 'vitest'
import { runChatLoop } from '../lib/chatAgentLoop'
import { streamChat } from '../lib/aiClient'
import { executeTool } from '../lib/toolExecutor'

vi.mock('../lib/aiClient', () => ({ streamChat: vi.fn() }))
vi.mock('../lib/toolExecutor', () => ({ executeTool: vi.fn() }))

describe('tool_result clamping', () => {
  beforeEach(() => { streamChat.mockReset(); executeTool.mockReset() })

  test('oversized results are clamped with a truncation marker', async () => {
    executeTool.mockResolvedValue({ ok: true, huge: 'x'.repeat(60000) })
    let round = 0
    let capturedContinuation = null
    streamChat.mockImplementation(async (payload, cbs) => {
      round++
      if (round === 1) {
        cbs.onToolCall({ id: 't1', action: 'summarize_board', params: {} })
        cbs.onDone({ stopReason: 'tool_use' })
      } else {
        capturedContinuation = payload.message
        cbs.onText('done')
        cbs.onDone({ stopReason: null })
      }
    })
    await runChatLoop({ text: 'q' }, {})
    expect(capturedContinuation[0].content.length).toBeLessThanOrEqual(10050)
    expect(capturedContinuation[0].content).toContain('[truncated — result too large]')
  })
})
