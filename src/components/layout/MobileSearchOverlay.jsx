import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import { useBoardStore } from '../../store/boardStore'
import Button from '../ui/Button'

// Notes search section removed alongside the Notes page.
export default function MobileSearchOverlay({ onClose }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const cards = useBoardStore((s) => s.cards)
  const boards = useBoardStore((s) => s.boards)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
  const ensureAllCardsLoaded = useBoardStore((s) => s.ensureAllCardsLoaded)

  useEffect(() => {
    inputRef.current?.focus()
    ensureAllCardsLoaded() // search spans every board
  }, [ensureAllCardsLoaded])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || q.length < 2) return { cards: [] }

    const matchedCards = Object.values(cards)
      .filter((c) => {
        const title = (c.title || '').toLowerCase()
        const desc = (c.description || '').toLowerCase()
        const taskNum = `#${c.task_number}`
        return title.includes(q) || desc.includes(q) || taskNum.includes(q)
      })
      .slice(0, 6)

    return { cards: matchedCards }
  }, [query, cards])

  const hasResults = results.cards.length > 0
  const showDropdown = query.trim().length >= 2

  const openCard = (card) => {
    setActiveBoard(card.board_id)
    navigate('/boards')
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('kolumn:open-card', { detail: { cardId: card.id } }))
    }, 100)
    onClose()
  }

  return (
    <div className="absolute inset-0 bg-[var(--surface-card)] flex items-center gap-2 px-4 z-40">
      <MagnifyingGlass className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
      <input
        ref={inputRef}
        type="text"
        aria-label="Search tasks"
        placeholder="Search tasks..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex-1 text-sm py-2 bg-transparent focus:outline-none placeholder-gray-400"
      />
      <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close search">
        <X className="w-4 h-4" />
      </Button>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full bg-[var(--surface-card)] border-t-0.5 border-[var(--border-default)] shadow-[0_4px_16px_rgba(0,0,0,0.1)] z-50 max-h-[70vh] overflow-y-auto">
          {!hasResults && (
            <p className="px-4 py-3 text-sm text-[var(--text-muted)]">No results found</p>
          )}
          {results.cards.length > 0 && (
            <div>
              <p className="px-3 py-1.5 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider bg-[var(--surface-raised)]">Tasks</p>
              {results.cards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => openCard(card)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-[var(--surface-raised)] transition-colors"
                >
                  <span className="text-[11px] font-mono text-[var(--text-muted)] shrink-0">#{card.task_number}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[var(--text-primary)] truncate">{card.title}</p>
                    {boards[card.board_id] && (
                      <p className="text-[11px] text-[var(--text-muted)] truncate">{boards[card.board_id].name}</p>
                    )}
                  </div>
                  {card.priority && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      card.priority === 'high' ? 'bg-[var(--color-copper)]' : card.priority === 'medium' ? 'bg-[var(--color-honey)]' : 'bg-[var(--color-lime-dark)]'
                    }`} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
