import { useState, useRef, useEffect } from 'react'
import { ArrowUp, Plus, Waveform } from '@phosphor-icons/react'
import Button from '../ui/Button'

export default function ChatInput({ onSend, autoFocus = false, docked = true }) {
  const [input, setInput] = useState('')
  const textareaRef = useRef(null)

  useEffect(() => {
    if (autoFocus && textareaRef.current) textareaRef.current.focus()
  }, [autoFocus])

  const handleSubmit = () => {
    const text = input.trim()
    if (!text) return
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
          <Button variant="ghost" size="icon-sm" aria-label="Add files">
            <Plus className="w-5 h-5" />
          </Button>
          <div className="flex-1" />
          {input.trim() ? (
            <Button size="icon-sm" onClick={handleSubmit} aria-label="Send message">
              <ArrowUp className="w-4 h-4" weight="bold" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon-sm" aria-label="Use voice mode">
              <Waveform size={20} weight="regular" />
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
