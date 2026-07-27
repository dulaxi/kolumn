import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CaretDown } from '@phosphor-icons/react'
import { useBoardStore } from '../../store/boardStore'
import { groupCards } from '../../lib/cardRailGroups'
import Card from '../board/Card'
import Button from '../ui/Button'
import Menu from '../ui/Menu'

const VISIBLE_CAP = 6

const GROUP_MODES = [
  { value: 'mentioned', label: 'Mentioned' },
  { value: 'board', label: 'Board' },
  { value: 'column', label: 'Column' },
  { value: 'due', label: 'Due date' },
]

// Right-rail panel listing the exact board cards this conversation mentions.
// Derived from per-message `mentionedCardIds` (title-scan resolver) plus the
// legacy `cardIds` field; newest mention first, deduped, deleted cards skipped.
// `groupBy` rearranges the visible cards into labeled sections; the cap and
// mention order are unaffected.
export default function CardRail({ messages, groupBy = 'mentioned', onGroupByChange }) {
  const navigate = useNavigate()
  const cards = useBoardStore((s) => s.cards)
  const boards = useBoardStore((s) => s.boards)
  const columns = useBoardStore((s) => s.columns)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
  const tempIdMap = useBoardStore((s) => s._tempIdMap)
  const [showAll, setShowAll] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

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

  // Cap first, then group: grouping only rearranges what's already visible.
  const visible = showAll ? mentioned : mentioned.slice(0, VISIBLE_CAP)
  const groups = useMemo(
    () => groupCards(visible, groupBy, { boards, columns }),
    [visible, groupBy, boards, columns],
  )

  const activeMode = GROUP_MODES.find((m) => m.value === groupBy) || GROUP_MODES[0]

  const openCard = (card) => {
    setActiveBoard(card.board_id)
    navigate('/boards')
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('kolumn:open-card', { detail: { cardId: card.id } }))
    }, 50)
  }

  return (
    <div className="rounded-xl border border-[var(--border-subtle)]">
      <div className="flex items-center justify-between px-[1.375rem] py-4">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Cards</h3>
        <Menu
          open={menuOpen}
          onOpenChange={setMenuOpen}
          placement="bottom-end"
          panel={
            <>
              {GROUP_MODES.map((m) => (
                <Menu.Item
                  key={m.value}
                  selected={m.value === activeMode.value}
                  onSelect={() => {
                    onGroupByChange?.(m.value)
                    setMenuOpen(false)
                  }}
                >
                  {m.label}
                </Menu.Item>
              ))}
            </>
          }
        >
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex cursor-pointer items-center gap-1 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
          >
            {activeMode.label}
            <CaretDown size={12} weight="bold" />
          </button>
        </Menu>
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
            {groups.map((group) => (
              <div key={group.key} className="flex flex-col gap-3">
                {group.label && (
                  <div className="pt-1 text-xs text-[var(--text-muted)]">
                    {group.label} · {group.cards.length}
                  </div>
                )}
                {group.cards.map((card) => (
                  <Card key={card.id} card={card} onClick={() => openCard(card)} />
                ))}
              </div>
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
