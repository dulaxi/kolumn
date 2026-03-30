import { useBoardStore } from '../../store/boardStore'
import Card from './Card'
import { buildColumnMap } from '../../utils/columnGrouping'

export default function AllBoardsView({ onCardClick, selectedCardId }) {
  const boards = useBoardStore((s) => s.boards)
  const columns = useBoardStore((s) => s.columns)
  const cards = useBoardStore((s) => s.cards)
  const completeCard = useBoardStore((s) => s.completeCard)

  const columnMap = buildColumnMap(columns, boards, cards)
  const columnEntries = Array.from(columnMap.entries())

  if (columnEntries.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No boards yet
      </div>
    )
  }

  return (
    <div className="flex gap-5 overflow-x-auto h-full pb-4">
      {columnEntries.map(([title, items]) => (
        <div key={title} className="flex flex-col w-[290px] shrink-0">
          {/* Header */}
          <div className="flex items-baseline gap-2 px-0.5 pb-3">
            <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
            <span className="text-xs text-gray-500">{items.length}</span>
          </div>

          {/* Cards list */}
          <div className="flex-1 overflow-y-auto pb-2 space-y-2 min-h-[80px]">
            {items.map(({ card, boardIcon }) => (
              <Card
                key={card.id}
                card={card}
                onClick={onCardClick}
                onComplete={completeCard}
                isSelected={card.id === selectedCardId}
                iconOverride={boardIcon}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
