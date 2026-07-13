import { useState, useRef, useEffect } from 'react'
import { ArrowUp, Check, Plus, Sparkle, Waveform, X } from '@phosphor-icons/react'

import { useBoardStore } from '../../store/boardStore'
import { executeTool } from '../../lib/toolExecutor'
import { runPillLoop } from '../../lib/pillAgentLoop'
import { logError } from '../../utils/logger'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import InlineNotice from '../ui/InlineNotice'

export default function QuickAddBar({ boardId }) {
  const [expanded, setExpanded] = useState(false)
  const [collapsing, setCollapsing] = useState(false)
  const [input, setInput] = useState('')
  const [processing, setProcessing] = useState(false)
  const [visible, setVisible] = useState(true)
  // Surface model text + tool errors above the pill. Set on submit completion;
  // cleared on next submit or after a short timeout.
  const [feedback, setFeedback] = useState(null) // { type: 'info' | 'error', text } | null
  const [progress, setProgress] = useState([]) // [{ ok, label }]
  const inputRef = useRef(null)
  const collapseWithAnim = () => {
    if (processing) return
    setCollapsing(true)
    setTimeout(() => { setExpanded(false); setCollapsing(false); setInput(''); setFeedback(null); setProgress([]) }, 175)
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
    setProgress([])
    setProcessing(true)

    // Fast path (comma/newline split) doesn't produce model text, only
    // tool errors — tracked locally and surfaced after the try/catch.
    let fastPathError = ''

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
          if (r && !r.ok && r.error) fastPathError = r.error
        }
      } else {
        const today = new Intl.DateTimeFormat('en-CA', {
          year: 'numeric', month: '2-digit', day: '2-digit',
        }).format(new Date())

        const { finalText, rows, error } = await runPillLoop(
          { text, boardId, boardName, today },
          { onProgress: (r) => setProgress(r) },
        )

        if (error) {
          const isLimit = /daily limit/i.test(error)
          setFeedback({
            type: 'error',
            text: isLimit ? `${error} Upgrade from Settings → Plan.` : error,
          })
        } else if (finalText.trim()) {
          // The model's final-round text is written AFTER seeing tool
          // results — it is the honest confirmation (or explanation).
          setFeedback({ type: rows.some((r) => !r.ok) ? 'error' : 'info', text: finalText.trim() })
        } else if (rows.length && rows.every((r) => r.ok)) {
          setFeedback(null) // progress rows already tell the story
        } else if (rows.length && rows.some((r) => !r.ok)) {
          // Round cap cut off narration but some steps failed — don't let
          // the failure go silent just because the model never got to say so.
          setFeedback({ type: 'error', text: 'Some steps failed — see the list above.' })
        }
      }
    } catch (err) {
      logError('[QuickAdd]', err)
    }

    if (fastPathError) setFeedback({ type: 'error', text: fastPathError })

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
      <div className={`fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-20 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex items-center gap-1 h-12 px-2 rounded-[14px] bg-[var(--surface-card)] border border-[var(--color-mist)] transition-all hover:border-[var(--text-muted)]">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
          >
            <Sparkle size={20} weight="fill" className="text-[var(--accent-sparkle)]" />
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
      {progress.length > 0 && (
        <div className="mb-2 px-3.5 py-2 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-card)] font-mono text-[12px] leading-relaxed flex flex-col gap-1">
          {progress.map((row, i) => (
            <div key={i} className={`flex items-start gap-2 ${row.ok ? 'text-[var(--text-secondary)]' : 'text-[var(--color-copper)]'}`}>
              <span className="shrink-0 mt-[1px]">
                {row.ok ? <Check size={13} weight="bold" /> : <X size={13} weight="bold" />}
              </span>
              <span className="flex-1 break-words">{row.label}</span>
            </div>
          ))}
        </div>
      )}
      {feedback && (
        <InlineNotice
          variant={feedback.type === 'error' ? 'error' : 'info'}
          onDismiss={() => setFeedback(null)}
          className="mb-2"
        >
          {feedback.text}
        </InlineNotice>
      )}
      <div className="flex flex-col bg-[var(--surface-card)] rounded-[20px] border border-transparent shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.035),0_0_0_0.5px_rgba(224,219,213,0.6)] focus-within:shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.075),0_0_0_0.5px_rgba(174,170,164,0.6)] transition-shadow duration-200">
        <div className="flex flex-col m-3.5 gap-3">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={processing ? '' : 'Type a task or paste notes...'}
              disabled={processing}
              rows={1}
              className="w-full resize-none bg-transparent text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none min-h-[1.5rem] max-h-96 pl-1.5 pt-1 disabled:opacity-50"
              onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
            />
            {processing && !input && (
              <span aria-hidden="true" className="pointer-events-none absolute left-1.5 top-1 text-[15px] text-[var(--text-muted)] opacity-50">
                Creating<span className="btn-dots" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon-sm" aria-label="Add files">
              <Plus size={20} />
            </Button>
            <div className="flex-1" />
            {input.trim() ? (
              <Button size="icon-sm" onClick={handleSubmit} disabled={processing} aria-label="Send">
                <ArrowUp className="w-4 h-4" weight="bold" />
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
