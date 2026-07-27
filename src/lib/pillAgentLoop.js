import { streamChat } from './aiClient'
import { executeTool } from './toolExecutor'
import { logError, logWarn } from '../utils/logger'

const MAX_ROUNDS = 4
const MAX_TOOLS_PER_ROUND = 10

// Human-readable progress row for one executed tool.
function describeResult(action, params, result) {
  if (!result?.ok) return { ok: false, label: result?.error || `${action} failed` }
  const title = params.title || params.card_title || params.name || ''
  const quoted = title ? `"${title}"` : ''
  const labels = {
    create_card: `Created ${quoted}`,
    move_card: `Moved ${quoted}`,
    update_card: `Updated ${quoted}`,
    delete_card: `Deleted ${quoted}`,
    duplicate_card: `Duplicated ${quoted}`,
    move_cards: 'Moved cards',
    update_cards: 'Updated cards',
    complete_cards: 'Completed cards',
    toggle_checklist: `Updated checklist on ${quoted}`,
    update_board: 'Updated board',
    delete_board: 'Deleted board',
    add_column: `Added column ${quoted}`,
    delete_column: `Deleted column ${quoted}`,
    invite_member: 'Sent invite',
    remove_member: 'Removed member',
  }
  return { ok: true, label: (labels[action] || `${action} done`).trim() }
}

// Client-driven continuation loop for the pill (the write surface).
// Rounds: model → tool_use blocks → browser executes → tool_results →
// model reacts. Only a round that ends WITHOUT another tool_use (i.e. the
// model is actually done) sets finalText — that text is a real confirmation.
// Text from a round that goes on to call more tools is a pre-execution
// acknowledgment ("On it…") and must never be shown as the final result. If
// the round cap is hit while the model still wants to keep calling tools,
// finalText stays '' and the caller falls back to the progress rows (all-ok
// rows tell the story; failed rows drive "Some steps failed" feedback).
export async function runPillLoop({ text, boardId, boardName, today }, { onProgress } = {}) {
  const transcript = [] // { role, content } — content is string or blocks
  const rows = []
  let message = text // string on round 1; tool_result blocks on continuations
  let finalText = ''
  let error = null

  for (let round = 0; round < MAX_ROUNDS; round++) {
    let roundText = ''
    const toolCalls = []
    let stopReason = null
    let streamErr = null

    await new Promise((resolve) => {
      streamChat(
        { message, history: transcript, mode: 'pill', boardId, today },
        {
          onText: (chunk) => { roundText += chunk },
          onToolCall: (tc) => { toolCalls.push(tc) },
          onTier: () => {},
          onDone: ({ stopReason: sr } = {}) => { stopReason = sr; resolve() },
          onError: (err) => { streamErr = String(err); resolve() },
        },
      )
    })

    if (streamErr) {
      logError('[pillLoop] stream error:', streamErr)
      error = streamErr
      break
    }

    // Track the turn so continuations carry proper tool_use/tool_result pairing.
    const assistantBlocks = []
    if (roundText) assistantBlocks.push({ type: 'text', text: roundText })
    for (const tc of toolCalls) {
      assistantBlocks.push({ type: 'tool_use', id: tc.id, name: tc.action, input: tc.params })
    }
    transcript.push({ role: 'user', content: message })
    transcript.push({ role: 'assistant', content: assistantBlocks.length ? assistantBlocks : roundText })

    if (stopReason !== 'tool_use' || toolCalls.length === 0) {
      finalText = roundText
      break
    }

    // Execute sequentially; ALL results go back in ONE user message.
    const results = []
    for (let i = 0; i < toolCalls.length; i++) {
      const tc = toolCalls[i]
      if (i >= MAX_TOOLS_PER_ROUND) {
        results.push({ type: 'tool_result', tool_use_id: tc.id, content: 'skipped: per-round tool limit reached', is_error: true })
        continue
      }
      let result
      try {
        result = await executeTool(tc.action, { ...tc.params, board: boardName, boardId })
      } catch (err) {
        logWarn('[pillLoop] executeTool threw:', err)
        result = { ok: false, error: err?.message || 'execution failed' }
      }
      rows.push(describeResult(tc.action, tc.params, result))
      onProgress?.([...rows])
      const resultJson = JSON.stringify(result)
      // Clamp per-block so a huge board summary can't trip the server's
      // continuation/history size caps (4 blocks/round must fit a 50k item).
      const content = resultJson.length > 10000
        ? resultJson.slice(0, 10000) + '…[truncated — result too large]'
        : resultJson
      const block = { type: 'tool_result', tool_use_id: tc.id, content }
      if (!result?.ok) block.is_error = true
      results.push(block)
    }

    // Final-round guard: when the NEXT request will be the last allowed
    // round, tell the model to wrap up instead of chaining again.
    if (round === MAX_ROUNDS - 2) {
      const last = results[results.length - 1]
      last.content += ' [round limit approaching — summarize what was and was not done; do not call more tools]'
    }

    message = results
  }

  return { finalText, rows, error }
}
