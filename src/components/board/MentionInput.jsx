import { useState, useRef, useEffect } from 'react'

export default function MentionInput({ value, onChange, onSubmit, members, placeholder }) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [mentionQuery, setMentionQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    // Check if cursor is after an @ symbol
    const input = inputRef.current
    if (!input) return

    const cursorPos = input.selectionStart
    const textBefore = value.slice(0, cursorPos)
    const atMatch = textBefore.match(/@(\w*)$/)

    if (atMatch) {
      const query = atMatch[1].toLowerCase()
      setMentionQuery(query)
      const filtered = members.filter((m) =>
        m.display_name?.toLowerCase().includes(query)
      )
      setSuggestions(filtered.slice(0, 5))
      setShowSuggestions(filtered.length > 0)
      setSelectedIdx(0)
    } else {
      setShowSuggestions(false)
    }
  }, [value, members])

  const insertMention = (member) => {
    const input = inputRef.current
    const cursorPos = input.selectionStart
    const textBefore = value.slice(0, cursorPos)
    const textAfter = value.slice(cursorPos)
    const atIdx = textBefore.lastIndexOf('@')
    const newText = textBefore.slice(0, atIdx) + `@${member.display_name} ` + textAfter
    onChange(newText)
    setShowSuggestions(false)

    // Restore focus after React re-render
    requestAnimationFrame(() => {
      const newCursor = atIdx + member.display_name.length + 2
      input.setSelectionRange(newCursor, newCursor)
      input.focus()
    })
  }

  const handleKeyDown = (e) => {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        if (suggestions[selectedIdx]) {
          insertMention(suggestions[selectedIdx])
        }
        return
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false)
        return
      }
    }

    if (e.key === 'Enter' && !showSuggestions) {
      onSubmit()
    }
  }

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full text-sm px-3 py-1.5 rounded-lg border border-[var(--border-default)] focus:border-[var(--border-focus)] focus:outline-none placeholder-[var(--text-muted)]"
      />

      {showSuggestions && (
        <div className="absolute bottom-full mb-1 left-0 right-0 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg shadow-lg z-50 overflow-hidden">
          {suggestions.map((m, i) => (
            <button
              key={m.user_id}
              type="button"
              onClick={() => insertMention(m)}
              className={`flex items-center gap-2 w-full px-3 py-2 text-left text-sm transition-colors ${
                i === selectedIdx ? 'bg-[var(--accent-lime-wash)] text-[#A8BA32]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${m.color || 'bg-[#E0DBD5]'}`}>
                {(m.display_name || '?')[0].toUpperCase()}
              </div>
              <span className="font-medium">{m.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
