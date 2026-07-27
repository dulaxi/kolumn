import { streamChat } from './aiClient'
import { executeTool } from './toolExecutor'
import { logError, logWarn } from '../utils/logger'

const MAX_ROUNDS = 3
const MAX_TOOLS_PER_ROUND = 4

// Activity chip data for one executed read tool.
function describeActivity(action, result) {
  if (action === 'search_cards') {
    if (!result?.ok) return { icon: 'search', label: 'Search failed' }
    const n = result.count ?? 0
    return { icon: 'search', label: `Searched cards · ${n} result${n === 1 ? '' : 's'}` }
  }
  if (action === 'summarize_board') {
    if (!result?.ok) return { icon: 'board', label: "Couldn't summarize board" }
    return { icon: 'board', label: `Summarized ${result.board}` }
  }
  if (action === 'get_card') {
    if (!result?.ok) return { icon: 'search', label: 'Card lookup failed' }
    if (result.ambiguous) return { icon: 'search', label: `Looked up card · ${result.candidates.length} matches` }
    if (result.found === false) return { icon: 'search', label: 'Card not found' }
    return { icon: 'search', label: `Looked up ${result.card.title}` }
  }
  return { icon: 'search', label: result?.ok ? `${action} done` : `${action} failed` }
}

// Client-driven continuation loop for the chat surface (read tools only).
// Mirrors pillAgentLoop's round mechanics — model → tool_use → browser
// executes → tool_result → model reacts — but streams text live to the
// caller across rounds and reports tool activity + returned card ids.
// Tool transcripts are ephemeral: the caller persists only the final text.
export async function runChatLoop({ text, history = [], today }, { onText, onActivity, onTier } = {}, { signal } = {}) {
  const transcript = [...history]
  let message = text // string on round 1; tool_result blocks on continuations
  let fullText = ''
  let error = null
  let errorCode = null
  const toolCardIds = new Set()

  for (let round = 0; round < MAX_ROUNDS; round++) {
    let roundText = ''
    const toolCalls = []
    let stopReason = null
    let streamErr = null

    await new Promise((resolve) => {
      streamChat(
        { message, history: [...transcript], mode: 'chat', today },
        {
          onText: (chunk) => { roundText += chunk; fullText += chunk; onText?.(chunk) },
          onToolCall: (tc) => { toolCalls.push(tc) },
          onTier: (info) => { onTier?.(info) },
          onDone: ({ stopReason: sr } = {}) => { stopReason = sr; resolve() },
          onError: (err, code) => { streamErr = String(err); errorCode = code; resolve() },
        },
        { signal },
      )
    })

    // Abort is quiet: keep whatever streamed, report nothing as an error.
    if (stopReason === 'aborted' || signal?.aborted) {
      return { fullText, toolCardIds: [...toolCardIds], error: null, errorCode: null, aborted: true }
    }

    if (streamErr) {
      logError('[chatLoop] stream error:', streamErr)
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

    if (stopReason !== 'tool_use' || toolCalls.length === 0) break

    // No round left to consume tool results — executing would burn work and
    // emit chips for lookups that can never inform the reply.
    if (round === MAX_ROUNDS - 1) break

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
        result = await executeTool(tc.action, tc.params)
      } catch (err) {
        logWarn('[chatLoop] executeTool threw:', err)
        result = { ok: false, error: err?.message || 'lookup failed' }
      }
      onActivity?.(describeActivity(tc.action, result))
      if (result?.ok && Array.isArray(result.cards)) {
        for (const c of result.cards) if (c?.id) toolCardIds.add(c.id)
      }
      if (result?.ok && Array.isArray(result.columns)) {
        for (const col of result.columns) {
          for (const c of col.cards || []) if (c?.id) toolCardIds.add(c.id)
        }
      }
      if (result?.ok && result.card?.id) toolCardIds.add(result.card.id)
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

    if (signal?.aborted) {
      return { fullText, toolCardIds: [...toolCardIds], error: null, errorCode: null, aborted: true }
    }

    // Final-round guard: when the NEXT request will be the last allowed
    // round, tell the model to answer instead of chaining again.
    if (round === MAX_ROUNDS - 2) {
      const last = results[results.length - 1]
      last.content += ' [round limit approaching — answer now from what you have; do not call more tools]'
    }

    message = results
  }

  return { fullText, toolCardIds: [...toolCardIds], error, errorCode, aborted: false }
}
