import { useState, useEffect } from 'react'
import { Stack } from '@phosphor-icons/react'
import { useBoardStore } from '../../store/boardStore'
import Card from './Card'
import { buildColumnMap } from '../../utils/columnGrouping'

const INITIAL_VISIBLE = 20

function ColumnGroup({ title, items, onCardClick, selectedCardId, completeCard }) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE)
  const visible = items.slice(0, visibleCount)
  const remaining = items.length - visibleCount

  return (
    <div className="flex flex-col w-[290px] shrink-0">
      <div className="flex items-baseline gap-2 px-0.5 pb-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        <span className="text-xs text-[var(--text-muted)]">{items.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto pb-2 space-y-2 min-h-[80px]">
        {visible.map(({ card, boardIcon }) => (
          <Card
            key={card.id}
            card={card}
            onClick={onCardClick}
            onComplete={completeCard}
            isSelected={card.id === selectedCardId}
            iconOverride={boardIcon}
          />
        ))}
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + 20)}
            className="w-full py-1.5 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors"
          >
            Show {Math.min(remaining, 20)} more ({remaining} remaining)
          </button>
        )}
      </div>
    </div>
  )
}

export default function AllBoardsView({ onCardClick, selectedCardId }) {
  const boards = useBoardStore((s) => s.boards)
  const columns = useBoardStore((s) => s.columns)
  const cards = useBoardStore((s) => s.cards)
  const completeCard = useBoardStore((s) => s.completeCard)
  const ensureAllCardsLoaded = useBoardStore((s) => s.ensureAllCardsLoaded)

  // The all-tasks view spans every board, so pull in any boards whose cards
  // the scoped boot didn't load.
  useEffect(() => { ensureAllCardsLoaded() }, [ensureAllCardsLoaded])

  const columnMap = buildColumnMap(columns, boards, cards)
  const columnEntries = Array.from(columnMap.entries())

  if (columnEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="w-12 h-12 rounded-full bg-[var(--surface-hover)] flex items-center justify-center mb-3">
          <Stack className="w-6 h-6 text-[var(--text-faint)]" />
        </div>
        <p className="text-sm font-medium text-[var(--text-secondary)]">No tasks across boards</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">Create a board and add tasks to see them here</p>
      </div>
    )
  }

  return (
    <div className="flex gap-5 overflow-x-auto h-full pb-4">
      {columnEntries.map(([title, items]) => (
        <ColumnGroup
          key={title}
          title={title}
          items={items}
          onCardClick={onCardClick}
          selectedCardId={selectedCardId}
          completeCard={completeCard}
        />
      ))}
    </div>
  )
}
