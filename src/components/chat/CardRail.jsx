import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBoardStore } from '../../store/boardStore'
import Card from '../board/Card'
import Button from '../ui/Button'

const VISIBLE_CAP = 6

// Right-rail panel listing the exact board cards this conversation mentions.
// Derived from per-message `mentionedCardIds` (title-scan resolver) plus the
// legacy `cardIds` field; newest mention first, deduped, deleted cards skipped.
export default function CardRail({ messages }) {
  const navigate = useNavigate()
  const cards = useBoardStore((s) => s.cards)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
  const tempIdMap = useBoardStore((s) => s._tempIdMap)
  const [showAll, setShowAll] = useState(false)

  const mentioned = useMemo(() => {
    const seen = new Set()
    const out = []
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      for (const raw of [...(msg.mentionedCardIds || []), ...(msg.cardIds || [])]) {
        const cardId = (tempIdMap && tempIdMap[raw]) || raw
        if (seen.has(cardId)) continue
        seen.add(cardId)
        if (cards[cardId]) out.push(cards[cardId])
      }
    }
    return out
  }, [messages, cards, tempIdMap])

  const visible = showAll ? mentioned : mentioned.slice(0, VISIBLE_CAP)

  const openCard = (card) => {
    setActiveBoard(card.board_id)
    navigate('/boards')
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('kolumn:open-card', { detail: { cardId: card.id } }))
    }, 50)
  }

  return (
    <div className="rounded-xl border border-[var(--border-subtle)]">
      <div className="px-[1.375rem] py-4">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Cards</h3>
      </div>
      <div className="h-px w-full bg-[var(--border-subtle)]" />
      <div className="px-[1.375rem] py-4">
        {mentioned.length === 0 ? (
          <div className="h-40 rounded-xl bg-[var(--surface-raised)] flex items-center justify-center px-6 text-center text-sm text-[var(--text-muted)]">
            Cards Claude mentions will show up here.
          </div>
        ) : (
          // Cards render at the board column's true width (290px desktop,
          // Column.jsx), not stretched to the panel width.
          <div className="mx-auto flex w-full max-w-[290px] flex-col gap-3">
            {visible.map((card) => (
              <Card key={card.id} card={card} onClick={() => openCard(card)} />
            ))}
            {mentioned.length > VISIBLE_CAP && !showAll && (
              <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}>
                Show all {mentioned.length}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
