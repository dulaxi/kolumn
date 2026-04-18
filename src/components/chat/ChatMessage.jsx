import { useNavigate, useParams } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import { useBoardStore } from '../../store/boardStore'
import { useChatStore } from '../../store/chatStore'
import Card from '../board/Card'
import MarkdownRenderer from './MarkdownRenderer'

const ACTION_LABELS = {
  delete_card: 'Delete card',
}

export default function ChatMessage({ message }) {
  const navigate = useNavigate()
  const { id: conversationId } = useParams()
  const cards = useBoardStore((s) => s.cards)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
  const approveToolCall = useChatStore((s) => s.approveToolCall)
  const rejectToolCall = useChatStore((s) => s.rejectToolCall)

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
          className="max-w-[75%] px-3.5 py-2.5 rounded-[18px] rounded-br-[4px] text-[14px] leading-relaxed text-[var(--text-primary)]"
          style={{ background: '#E8DDE2' }}
        >
          {message.text}
        </div>
      </div>
    )
  }

  const tempIdMap = useBoardStore((s) => s._tempIdMap)
  const resolvedIds = (message.cardIds || []).map((id) => tempIdMap[id] || id)
  const embeddedCards = resolvedIds.map((id) => cards[id]).filter(Boolean)
  const pending = message.pendingToolCall

  return (
    <div className="mb-5 pl-1">
      <div
        className="text-[15px] leading-[1.7] text-[var(--text-secondary)]"
        style={{ fontFamily: "'Clash Grotesk', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", fontWeight: 400 }}
      >
        <MarkdownRenderer content={message.text} />
      </div>

      {pending && pending.status === 'pending' && (
        <div className="mt-3 p-3 rounded-xl border-[0.5px] border-[var(--border-default)] bg-[var(--surface-raised)]">
          <div className="text-[13px] font-medium text-[var(--text-primary)] mb-1">
            {ACTION_LABELS[pending.action] || pending.action}: <span className="text-[var(--text-secondary)]">{pending.params.card_title || pending.params.title}</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => approveToolCall(conversationId, message.id)}
              className="inline-flex items-center gap-1.5 h-7 px-3 text-[13px] font-medium text-white bg-[var(--text-primary)] rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Approve
            </button>
            <button
              type="button"
              onClick={() => rejectToolCall(conversationId, message.id)}
              className="inline-flex items-center gap-1.5 h-7 px-3 text-[13px] font-medium text-[var(--text-secondary)] border-[0.5px] border-[var(--border-default)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Reject
            </button>
          </div>
        </div>
      )}

      {pending && pending.status === 'approved' && (
        <div className="mt-2 text-[12px] text-[#8BA32E] font-medium">Action executed</div>
      )}

      {pending && pending.status === 'rejected' && (
        <div className="mt-2 text-[12px] text-[var(--text-faint)]">Action cancelled</div>
      )}

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
