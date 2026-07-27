import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useBoardStore } from '../../store/boardStore'
import Card from '../board/Card'
import MarkdownRenderer from './MarkdownRenderer'
import InlineNotice from '../ui/InlineNotice'
import { Check, Copy, MagnifyingGlass } from '@phosphor-icons/react'

// Split assistant text at each activity's atChar. atChar always lands on a
// round boundary (complete markdown), so segments render safely.
function segmentText(text, activities) {
  const segments = []
  let prev = 0
  for (const activity of activities) {
    const at = Math.min(Math.max(activity.atChar ?? 0, prev), text.length)
    segments.push({ text: text.slice(prev, at), activity })
    prev = at
  }
  segments.push({ text: text.slice(prev), activity: null })
  return segments
}

// Hover-reveal copy for an assistant message; copies the raw markdown.
function CopyMessageButton({ text }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const copy = () => {
    navigator.clipboard?.writeText(text)
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copy message"
      className="mt-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[var(--text-muted)] opacity-0 transition-opacity hover:bg-[var(--surface-raised)] hover:text-[var(--text-secondary)] focus-visible:opacity-100 group-hover:opacity-100"
    >
      {copied ? (
        <Check size={14} weight="bold" className="text-[var(--color-lime-dark)]" />
      ) : (
        <Copy size={14} />
      )}
    </button>
  )
}

export default function ChatMessage({ message, onRetry, busy }) {
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
          className="max-w-[75%] px-3.5 py-2.5 rounded-[18px] rounded-br-[4px] text-[15px] leading-relaxed text-[var(--text-primary)] bg-[var(--color-mauve-wash)]"
        >
          {message.text}
        </div>
      </div>
    )
  }

  const resolvedIds = (message.cardIds || []).map((id) => tempIdMap[id] || id)
  const embeddedCards = resolvedIds.map((id) => cards[id]).filter(Boolean)

  const activities = message.activities || []

  return (
    <div className="mb-5 pl-1 group">
      <div
        className="text-[16px] leading-[1.7] text-[var(--text-secondary)]"
        style={{ fontFamily: 'var(--font-logo)', fontWeight: 400 }}
      >
        {activities.length === 0 ? (
          <MarkdownRenderer content={message.text} />
        ) : (
          segmentText(message.text, activities).map((seg, i) => (
            <div key={i}>
              {seg.text && <MarkdownRenderer content={seg.text} />}
              {seg.activity && (
                <div className="my-2 flex items-center gap-1.5 font-mono text-xs text-[var(--text-muted)]">
                  {/* Board-summary chips are text-only; search keeps its glass. */}
                  {seg.activity.icon !== 'board' && <MagnifyingGlass size={14} weight="regular" />}
                  {seg.activity.label}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {message.stopped && (
        <div className="mt-2 font-mono text-xs text-[var(--text-muted)]">Stopped</div>
      )}

      {message.text && !message.error && !busy && <CopyMessageButton text={message.text} />}

      {message.error && (
        <InlineNotice
          variant="error"
          className="mt-3 max-w-md"
          action={
            onRetry && !message.error.isLimit ? (
              <button type="button" onClick={onRetry} className="underline underline-offset-2">
                Retry
              </button>
            ) : undefined
          }
        >
          {message.error.message}
          {message.error.isLimit && (
            <>
              {' '}
              <Link to="/upgrade/pro" className="underline underline-offset-2">
                Upgrade to Pro
              </Link>
            </>
          )}
        </InlineNotice>
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
