import { useState, useRef, useEffect } from 'react'
import { Sparkle, Waveform } from '@phosphor-icons/react'
import { ArrowUp } from 'lucide-react'
import { useClickOutside } from '../../hooks/useClickOutside'
import { useBoardStore } from '../../store/boardStore'
import { executeTool } from '../../lib/toolExecutor'
import { streamChat } from '../../lib/aiClient'

export default function QuickAddBar({ boardId }) {
  const [expanded, setExpanded] = useState(false)
  const [collapsing, setCollapsing] = useState(false)
  const [input, setInput] = useState('')
  const [processing, setProcessing] = useState(false)
  const [visible, setVisible] = useState(true)
  const inputRef = useRef(null)
  const collapseWithAnim = () => {
    if (processing) return
    setCollapsing(true)
    setTimeout(() => { setExpanded(false); setCollapsing(false); setInput('') }, 175)
  }
  const expandedRef = useClickOutside(collapseWithAnim)
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
      collapseWithAnim()
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
    <>
    <div className={`fixed inset-0 z-50 bg-black/10 transition-opacity duration-200 ${collapsing ? 'opacity-0' : 'opacity-100'}`} onClick={collapseWithAnim} />
    <div ref={expandedRef} className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 origin-bottom ${collapsing ? 'animate-[pill-bounce-out_175ms_ease-in_forwards]' : 'animate-[pill-bounce-in_275ms_cubic-bezier(0.34,1.56,0.64,1)_forwards]'}`}>
      <div className="flex flex-col bg-[var(--surface-card)] rounded-[20px] border border-[#C9ADBB] shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.035)] transition-shadow duration-200">
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
            <button type="button" aria-label="Add files" className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
            </button>
            <div className="flex-1" />
            {input.trim() ? (
              <button type="button" onClick={handleSubmit} disabled={processing} aria-label="Send" className="h-8 w-8 rounded-lg flex items-center justify-center bg-[var(--text-primary)] text-[var(--surface-card)] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50">
                <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
              </button>
            ) : (
              <button type="button" aria-label="Voice mode" className="h-8 px-1.5 rounded-lg flex items-center justify-center hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors cursor-pointer">
                <Waveform size={20} weight="regular" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
