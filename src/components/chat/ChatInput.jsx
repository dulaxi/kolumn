import { useState, useRef, useEffect } from 'react'
import { Plus, ArrowUp } from 'lucide-react'

export default function ChatInput({ onSend, autoFocus = false }) {
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

  return (
    <div className="shrink-0 px-4 pb-4 pt-2">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col bg-[var(--surface-card)] rounded-[20px] border border-transparent shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.035),0_0_0_0.5px_rgba(224,219,213,0.6)] hover:shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.035),0_0_0_0.5px_rgba(174,170,164,0.6)] focus-within:shadow-[0_0.25rem_1.25rem_rgba(0,0,0,0.075),0_0_0_0.5px_rgba(174,170,164,0.6)] transition-all duration-200">
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
              <button type="button" aria-label="Add files" className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors cursor-pointer">
                <Plus className="w-5 h-5" />
              </button>
              <div className="flex-1" />
              {input.trim() ? (
                <button type="button" onClick={handleSubmit} aria-label="Send message" className="h-8 w-8 rounded-lg flex items-center justify-center bg-[var(--text-primary)] text-[var(--surface-card)] hover:opacity-90 transition-opacity cursor-pointer">
                  <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
                </button>
              ) : (
                <button type="button" aria-label="Use voice mode" className="h-8 px-1.5 rounded-lg flex items-center justify-center hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 21 21" fill="none" className="block">
                    <rect x="0" y="7.5" height="6" fill="currentColor" width="1" rx="0.5" />
                    <rect x="4" y="5.5" height="10" fill="currentColor" width="1" rx="0.5" />
                    <rect x="8" y="2.5" height="16" fill="currentColor" width="1" rx="0.5" />
                    <rect x="12" y="5.5" height="10" fill="currentColor" width="1" rx="0.5" />
                    <rect x="16" y="2.5" height="16" fill="currentColor" width="1" rx="0.5" />
                    <rect x="20" y="7.5" height="6" fill="currentColor" width="1" rx="0.5" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
