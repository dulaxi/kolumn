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
// model reacts. The model's FINAL round text is the only narration the
// caller should show as confirmation — earlier rounds are acknowledgments.
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
      const block = { type: 'tool_result', tool_use_id: tc.id, content: JSON.stringify(result) }
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
    if (roundText) finalText = roundText // keep best-effort text if the cap cuts us off
  }

  return { finalText, rows, error }
}
