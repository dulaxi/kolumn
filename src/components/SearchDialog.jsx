import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { CardsThree, MagnifyingGlass, X } from '@phosphor-icons/react'
import { useBoardStore } from '../store/boardStore'
import { useNavigate } from 'react-router-dom'
import Modal from './ui/Modal'

export default function SearchDialog({ open, onClose }) {
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  const cards = useBoardStore((s) => s.cards)
  const boards = useBoardStore((s) => s.boards)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
  const ensureAllCardsLoaded = useBoardStore((s) => s.ensureAllCardsLoaded)

  // Search spans every board — load any the scoped boot skipped when opened.
  useEffect(() => { if (open) ensureAllCardsLoaded() }, [open, ensureAllCardsLoaded])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || q.length < 2) return []
    return Object.values(cards)
      .filter((c) => {
        if (c.archived) return false
        const title = (c.title || '').toLowerCase()
        const desc = (c.description || '').toLowerCase()
        const taskNum = `#${c.task_number}`
        return title.includes(q) || desc.includes(q) || taskNum.includes(q)
      })
      .slice(0, 12)
  }, [query, cards])

  // Splits a string into segments around case-insensitive matches of `q`,
  // wrapping each match in a lime-wash highlight span. Mirrors the @mention
  // text-emphasis vocabulary so the visual rule stays consistent.
  const renderHighlighted = (text, q) => {
    const trimmed = (q || '').trim()
    if (!trimmed || trimmed.length < 2 || !text) return text
    const lower = text.toLowerCase()
    const needle = trimmed.toLowerCase()
    const parts = []
    let i = 0
    while (i < text.length) {
      const found = lower.indexOf(needle, i)
      if (found === -1) {
        parts.push(text.slice(i))
        break
      }
      if (found > i) parts.push(text.slice(i, found))
      parts.push(
        <span
          key={found}
          className="font-bold"
        >
          {text.slice(found, found + needle.length)}
        </span>,
      )
      i = found + needle.length
    }
    return parts
  }

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    setSelectedIdx(0)
  }, [query])

  const handleSelect = useCallback((card) => {
    if (card.board_id) setActiveBoard(card.board_id)
    navigate('/boards')
    onClose()
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('kolumn:open-card', { detail: { cardId: card.id } }))
    }, 100)
  }, [setActiveBoard, navigate, onClose])

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      e.preventDefault()
      handleSelect(results[selectedIdx])
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      contentClassName="flex items-start justify-center pt-[15vh]"
      initialFocusRef={inputRef}
    >
      <div
        className="relative w-full max-w-2xl mx-4 bg-[var(--surface-card)] rounded-xl border-[0.5px] border-[var(--border-default)] shadow-[var(--shadow-raised)] overflow-hidden animate-dropdown"
      >
        {/* Search input */}
        <div className="flex items-center gap-2 pl-6 pt-[1.1rem] pb-[0.9rem] pr-2.5">
          <MagnifyingGlass className="w-4 h-4 text-[var(--text-muted)] shrink-0 -ml-1 mr-1" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks..."
            className="flex-1 bg-transparent border-none text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none ring-0 shadow-none text-sm"
          />
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="h-[0.5px] bg-[var(--border-default)] w-full" />

        {/* Results */}
        <div className="p-2.5 overflow-y-auto" style={{ maxHeight: 'min(440px, 50vh)' }}>
          {results.length > 0 ? (
            <div className="flex flex-col gap-1">
              {results.map((card, idx) => {
                const board = boards[card.board_id]
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleSelect(card)}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-3 cursor-pointer truncate text-sm ${
                      idx === selectedIdx
                        ? 'bg-[var(--color-mauve-wash)] text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <CardsThree className="w-4 h-4 shrink-0 text-[var(--text-muted)]" />
                      <span className="truncate">{renderHighlighted(card.title, query)}</span>
                    </div>
                    <span className="text-xs text-[var(--text-muted)] shrink-0">
                      {board?.name || ''}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : query.length >= 2 ? (
            <div className="text-center py-8 text-sm text-[var(--text-muted)]">
              No results found
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-[var(--text-muted)]">
              Type to search tasks...
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
