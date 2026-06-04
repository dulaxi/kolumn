import { useState, useRef, useEffect } from 'react'
import { ArrowUp, Sparkle, Waveform } from '@phosphor-icons/react'

import { useBoardStore } from '../../store/boardStore'
import { executeTool } from '../../lib/toolExecutor'
import { streamChat } from '../../lib/aiClient'
import { logError } from '../../utils/logger'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

export default function QuickAddBar({ boardId }) {
  const [expanded, setExpanded] = useState(false)
  const [collapsing, setCollapsing] = useState(false)
  const [input, setInput] = useState('')
  const [processing, setProcessing] = useState(false)
  const [visible, setVisible] = useState(true)
  // Surface model text + tool errors above the pill. Set on submit completion;
  // cleared on next submit or after a short timeout.
  const [feedback, setFeedback] = useState(null) // { type: 'info' | 'error', text } | null
  const inputRef = useRef(null)
  const collapseWithAnim = () => {
    if (processing) return
    setCollapsing(true)
    setTimeout(() => { setExpanded(false); setCollapsing(false); setInput(''); setFeedback(null) }, 175)
  }
  const scrollTimer = useRef(null)
  const boardName = useBoardStore((s) => s.boards[boardId]?.name)

  // Feedback persists until the user submits again (clears in handleSubmit)
  // or clicks the × button. Intentionally no auto-dismiss for now.

  useEffect(() => {
    const container = document.querySelector('[data-board-scroll]')
    if (!container) return
    const onScroll = () => {
      if (!expanded) setVisible(false)
      clearTimeout(scrollTimer.current)
      scrollTimer.current = setTimeout(() => setVisible(true), 800)
    }
    container.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => { container.removeEventListener('scroll', onScroll, { capture: true }); clearTimeout(scrollTimer.current) }
  }, [expanded])

  useEffect(() => {
    if (expanded && inputRef.current) inputRef.current.focus()
  }, [expanded])

  const handleSubmit = async () => {
    const text = input.trim()
    if (!text || processing) return
    setInput('')
    setFeedback(null)
    setProcessing(true)

    // Track what came back so we can surface text or errors above the pill.
    let modelText = ''
    let toolFired = false
    let toolErrorMsg = ''

    // Circuit breaker: cap how many tool calls a single pill submission can
    // execute. Defense against runaway model behavior (e.g. emitting many
    // update_card calls in a single response). Hard ceiling; the model can
    // still emit more, we just stop executing them.
    const MAX_TOOL_CALLS_PER_SUBMIT = 25
    let toolCallCount = 0
    let circuitTripped = false

    try {
      // Split candidate parts. Prefer newlines (explicit user choice); fall
      // back to commas only when it looks like an actual list.
      const splitParts = (sep) => text.split(sep).map((s) => s.trim()).filter(Boolean)
      let parts = null
      if (text.includes('\n')) {
        parts = splitParts(/\n/)
      } else if (text.includes(',')) {
        const candidate = splitParts(',')
        // Heuristic: any part starting with an explicit creation command
        // ("Add", "Create", "Make", "New ", "I need/want/would") signals
        // prose intent — route to the LLM so it can interpret the whole
        // sentence as one request, not slice on every comma.
        const commandStart = /^(add|create|make|new\s|i\s+(?:need|want|would|'d))\b/i
        const looksLikeProse = candidate.some((p) => commandStart.test(p))
        if (!looksLikeProse) parts = candidate
      }

      if (parts && parts.length > 1) {
        for (const title of parts) {
          const r = await executeTool('create_card', { title, boardId })
          if (r) {
            toolFired = true
            if (!r.ok && r.error) toolErrorMsg = r.error
          }
        }
      } else {
        // User's local date as YYYY-MM-DD. The en-CA locale formats dates in
        // ISO order (YYYY-MM-DD) and respects local timezone by default —
        // unlike toISOString() which is always UTC.
        const today = new Intl.DateTimeFormat('en-CA', {
          year: 'numeric', month: '2-digit', day: '2-digit',
        }).format(new Date())
        await new Promise((resolve) => {
          streamChat(
            { message: text, boardId, today },
            {
              onText: (chunk) => { modelText += chunk },
              onToolCall: async (action, params) => {
                // Circuit breaker — see MAX_TOOL_CALLS_PER_SUBMIT comment above.
                if (circuitTripped) return
                toolCallCount++
                if (toolCallCount > MAX_TOOL_CALLS_PER_SUBMIT) {
                  circuitTripped = true
                  toolErrorMsg = `Stopped after ${MAX_TOOL_CALLS_PER_SUBMIT} tool calls — the model emitted too many in one response. Try a smaller request or use a batch tool.`
                  logError('[QuickAdd] circuit breaker tripped', { action, count: toolCallCount })
                  return
                }
                // Inject pill context. boardId is the canonical handle (read by
                // polished tools like create_card); board name is kept for
                // tools that haven't been polished yet and still resolve by name.
                const r = await executeTool(action, { ...params, board: boardName, boardId })
                if (r) {
                  toolFired = true
                  if (!r.ok && r.error) toolErrorMsg = r.error
                }
              },
              onTier: () => {},
              onDone: resolve,
              onError: (err) => { logError('[QuickAdd]', err); resolve() },
            },
          )
        })
      }
    } catch (err) {
      logError('[QuickAdd]', err)
    }

    // Surface feedback. Tool errors take precedence; otherwise show model text
    // if the model responded with text only (no successful tool call).
    if (toolErrorMsg) {
      setFeedback({ type: 'error', text: toolErrorMsg })
    } else if (!toolFired && modelText.trim()) {
      setFeedback({ type: 'info', text: modelText.trim() })
    }

    setProcessing(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  if (!expanded) {
    return (
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-30 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex items-center gap-1 h-12 px-2 rounded-[14px] bg-[var(--surface-card)] border border-[var(--color-mist)] transition-all hover:border-[var(--text-muted)]">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
          >
            <Sparkle size={20} weight="fill" className="text-[#D4B8C8]" />
          </button>
          <div className="w-px h-5 bg-[var(--border-default)]" />
          <button
            type="button"
            aria-label="Voice input"
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
          >
            <Waveform size={20} weight="regular" className="text-[var(--text-secondary)]" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <Modal
      open
      onClose={collapseWithAnim}
      backdropClassName={`bg-black/10 transition-opacity duration-200 ${collapsing ? 'opacity-0' : 'opacity-100'}`}
      contentClassName="flex items-end justify-center pb-6"
      initialFocusRef={inputRef}
    >
    <div className={`w-full max-w-2xl px-4 origin-bottom ${collapsing ? 'animate-[pill-bounce-out_175ms_ease-in_forwards]' : 'animate-[pill-bounce-in_275ms_cubic-bezier(0.34,1.56,0.64,1)_forwards]'}`}>
      {feedback && (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`mb-2 px-3.5 py-2.5 rounded-[10px] border bg-[var(--surface-card)] font-mono text-[12px] leading-relaxed shadow-[0_4px_24px_rgba(27,27,24,0.10)] flex items-start gap-2.5 ${
            feedback.type === 'error'
              ? 'border-[var(--color-copper)] text-[var(--color-copper)]'
              : 'border-[#1B1B18] text-[var(--text-primary)]'
          }`}
        >
          <span className="flex-1 whitespace-pre-wrap break-words">{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Dismiss"
            className="shrink-0 -mr-1 px-1 leading-none text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            ×
          </button>
        </div>
      )}
      <div className="flex flex-col bg-[var(--surface-card)] rounded-[20px] border border-transparent shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.035),0_0_0_0.5px_rgba(224,219,213,0.6)] focus-within:shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.075),0_0_0_0.5px_rgba(174,170,164,0.6)] transition-shadow duration-200">
        <div className="flex flex-col m-3.5 gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={processing ? 'Creating...' : 'Type a task or paste notes...'}
            disabled={processing}
            rows={1}
            className="w-full resize-none bg-transparent text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none min-h-[1.5rem] max-h-96 pl-1.5 pt-1 disabled:opacity-50"
            onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
          />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon-sm" aria-label="Add files">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
            </Button>
            <div className="flex-1" />
            {input.trim() ? (
              <Button size="icon-sm" onClick={handleSubmit} disabled={processing} aria-label="Send">
                <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
              </Button>
            ) : (
              <Button variant="ghost" size="icon-sm" aria-label="Voice mode">
                <Waveform size={20} weight="regular" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
    </Modal>
  )
}
