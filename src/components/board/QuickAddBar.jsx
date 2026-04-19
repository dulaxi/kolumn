import { useState, useRef, useEffect } from 'react'
import { Sparkle } from '@phosphor-icons/react'
import { ArrowUp, X } from 'lucide-react'
import { useBoardStore } from '../../store/boardStore'
import { executeTool } from '../../lib/toolExecutor'
import { streamChat } from '../../lib/aiClient'

export default function QuickAddBar({ boardId }) {
  const [expanded, setExpanded] = useState(false)
  const [input, setInput] = useState('')
  const [processing, setProcessing] = useState(false)
  const inputRef = useRef(null)
  const boardName = useBoardStore((s) => s.boards[boardId]?.name)

  useEffect(() => {
    if (expanded && inputRef.current) inputRef.current.focus()
  }, [expanded])

  const handleSubmit = async () => {
    const text = input.trim()
    if (!text || processing) return
    setInput('')
    setProcessing(true)

    try {
      const parts = text.includes(',')
        ? text.split(',').map((s) => s.trim()).filter(Boolean)
        : text.includes('\n')
        ? text.split('\n').map((s) => s.trim()).filter(Boolean)
        : null

      if (parts && parts.length > 1) {
        for (const title of parts) {
          await executeTool('create_card', { title, board: boardName })
        }
      } else {
        await new Promise((resolve) => {
          streamChat(
            { message: `Create a card on board "${boardName}": ${text}` },
            {
              onText: () => {},
              onToolCall: async (action, params) => {
                await executeTool(action, { ...params, board: boardName })
              },
              onTier: () => {},
              onDone: resolve,
              onError: (err) => { console.error('[QuickAdd]', err); resolve() },
            },
          )
        })
      }
    } catch (err) {
      console.error('[QuickAdd]', err)
    }

    setProcessing(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      setExpanded(false)
      setInput('')
    }
  }

  if (!expanded) {
    return (
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2 h-9 px-4 rounded-full bg-[var(--surface-card)] border-[0.5px] border-[var(--border-default)] shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] hover:border-[var(--text-muted)] transition-all cursor-pointer"
        >
          <Sparkle size={14} weight="fill" className="text-[#D4B8C8]" />
          <span className="text-[13px] text-[var(--text-secondary)]">AI Quick Add</span>
        </button>
      </div>
    )
  }

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-md">
      <div className="flex items-center gap-2 h-11 px-4 rounded-2xl bg-[var(--surface-card)] border-[0.5px] border-[var(--border-default)] shadow-[0_4px_24px_rgba(0,0,0,0.1)] transition-all">
        <Sparkle size={14} weight="fill" className="shrink-0 text-[#D4B8C8]" />
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={processing ? 'Creating...' : 'Type a task or paste notes...'}
          disabled={processing}
          className="flex-1 bg-transparent text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none disabled:opacity-50"
        />
        {input.trim() ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={processing}
            className="h-7 w-7 rounded-lg flex items-center justify-center bg-[var(--text-primary)] text-[var(--surface-card)] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
          >
            <ArrowUp className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => { setExpanded(false); setInput('') }}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
