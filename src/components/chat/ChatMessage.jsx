import { useNavigate } from 'react-router-dom'
import { useBoardStore } from '../../store/boardStore'
import Card from '../board/Card'
import MarkdownRenderer from './MarkdownRenderer'

export default function ChatMessage({ message }) {
  const navigate = useNavigate()
  const cards = useBoardStore((s) => s.cards)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
  const tempIdMap = useBoardStore((s) => s._tempIdMap)

  const openCard = (card) => {
    setActiveBoard(card.board_id)
    navigate('/boards')
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('kolumn:open-card', { detail: { cardId: card.id } }))
    }, 50)
  }

  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-5">
        <div
          className="max-w-[75%] px-3.5 py-2.5 rounded-[18px] rounded-br-[4px] text-[14px] leading-relaxed text-[var(--text-primary)] bg-[var(--color-mauve-wash)]"
        >
          {message.text}
        </div>
      </div>
    )
  }

  const resolvedIds = (message.cardIds || []).map((id) => tempIdMap[id] || id)
  const embeddedCards = resolvedIds.map((id) => cards[id]).filter(Boolean)

  return (
    <div className="mb-5 pl-1">
      <div
        className="text-[15px] leading-[1.7] text-[var(--text-secondary)]"
        style={{ fontFamily: 'var(--font-logo)', fontWeight: 400 }}
      >
        <MarkdownRenderer content={message.text} />
      </div>

      {embeddedCards.length > 0 && (
        <div className="flex flex-col gap-2 mt-3 max-w-[290px]">
          {embeddedCards.map((card) => (
            <Card
              key={card.id}
              card={card}
              onClick={() => openCard(card)}
            />
          ))}
        </div>
      )}

      {resolvedIds.filter((id) => !cards[id] && !id.startsWith('temp-')).map((id) => (
        <div key={id} className="mt-2 px-3 py-2 rounded-xl bg-[var(--surface-raised)] text-[13px] text-[var(--text-faint)]">
          Card not found
        </div>
      ))}
    </div>
  )
}
