import { useState, useRef, useEffect } from 'react'
import { Sparkle, Waveform } from '@phosphor-icons/react'
import { ArrowUp } from 'lucide-react'
import { useClickOutside } from '../../hooks/useClickOutside'
import { useBoardStore } from '../../store/boardStore'
import { executeTool } from '../../lib/toolExecutor'
import { streamChat } from '../../lib/aiClient'

export default function QuickAddBar({ boardId }) {
  const [expanded, setExpanded] = useState(false)
  const [input, setInput] = useState('')
  const [processing, setProcessing] = useState(false)
  const [visible, setVisible] = useState(true)
  const inputRef = useRef(null)
  const expandedRef = useClickOutside(() => { if (!processing) { setExpanded(false); setInput('') } })
  const scrollTimer = useRef(null)
  const boardName = useBoardStore((s) => s.boards[boardId]?.name)

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
      <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-30 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
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
    <div ref={expandedRef} className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-md">
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
        {input.trim() && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={processing}
            className="h-7 w-7 rounded-lg flex items-center justify-center bg-[var(--text-primary)] text-[var(--surface-card)] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
          >
            <ArrowUp className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  )
}
