import { useState, useRef, useEffect } from 'react'
import { ArrowUp, Stop } from '@phosphor-icons/react'
import Button from '../ui/Button'

// `busy`: the current conversation is streaming a reply. Typing stays
// enabled so the user can draft their next message, but sends are
// blocked (Enter + button) until the stream finishes.
export default function ChatInput({ onSend, onStop, autoFocus = false, docked = true, busy = false }) {
  const [input, setInput] = useState('')
  const [blockedHint, setBlockedHint] = useState(false)
  const textareaRef = useRef(null)
  const hintTimer = useRef(null)

  useEffect(() => {
    if (autoFocus && textareaRef.current) textareaRef.current.focus()
  }, [autoFocus])

  useEffect(() => () => clearTimeout(hintTimer.current), [])

  const handleSubmit = () => {
    const text = input.trim()
    if (!text) return
    if (busy) {
      // Draft stays put; a transient cue explains why nothing was sent.
      setBlockedHint(true)
      clearTimeout(hintTimer.current)
      hintTimer.current = setTimeout(() => setBlockedHint(false), 2000)
      return
    }
    onSend(text)
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const composer = (
    <div className="flex flex-col bg-[var(--surface-card)] rounded-[20px] border border-transparent shadow-[var(--chat-input-shadow)] hover:shadow-[var(--chat-input-shadow-hover)] focus-within:shadow-[var(--chat-input-shadow-focus)] transition-all duration-200">
      <div className="flex flex-col m-3.5 gap-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="How can I help you today?"
          rows={1}
          className="w-full resize-none bg-transparent text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none min-h-[1.5rem] max-h-96 pl-1.5 pt-1"
          onInput={(e) => {
            e.target.style.height = 'auto'
            e.target.style.height = e.target.scrollHeight + 'px'
          }}
        />
        <div className="flex items-center gap-2">
          {blockedHint && (
            <span aria-live="polite" className="font-mono text-[11px] text-[var(--text-muted)]">
              Waiting for the current reply…
            </span>
          )}
          <div className="flex-1" />
          {busy && onStop ? (
            <Button size="icon-sm" onClick={onStop} aria-label="Stop generating">
              <Stop size={14} weight="fill" />
            </Button>
          ) : (
            <Button size="icon-sm" onClick={handleSubmit} disabled={!input.trim() || busy} aria-label="Send message">
              <ArrowUp className="w-4 h-4" weight="bold" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )

  // `docked`: the ChatPage bottom-dock layout owns its own padding/width
  // (mx-auto max-w-2xl + px-4 pb-4 pt-2). Callers that embed the composer
  // in their own max-width column (e.g. DashboardPage) pass docked={false}
  // to get just the composer box, so their surrounding layout controls
  // width/alignment instead of fighting a second, nested max-w-2xl.
  if (!docked) return composer

  return (
    <div className="shrink-0 px-4 pb-4 pt-2">
      <div className="mx-auto max-w-2xl">{composer}</div>
    </div>
  )
}
