import { useState } from 'react'
import { useBoardStore } from '../store/boardStore'
import BoardSelector from '../components/board/BoardSelector'
import BoardView from '../components/board/BoardView'
import AllBoardsView from '../components/board/AllBoardsView'
import CardDetailPanel from '../components/board/CardDetailPanel'

export default function BoardsPage() {
  const [editingCardId, setEditingCardId] = useState(null)
  const [inlineCardId, setInlineCardId] = useState(null)
  const [filters, setFilters] = useState({ priority: [], assignee: null, label: [], due: null })
  const activeBoardId = useBoardStore((s) => s.activeBoardId)

  const handleCardClick = (cardId) => {
    setInlineCardId(null)
    setEditingCardId(cardId)
  }

  const handleCreateCard = (cardId) => {
    setEditingCardId(null)
    setInlineCardId(cardId)
  }

  const handleInlineDone = () => {
    setInlineCardId(null)
  }

  return (
    <div
      className={`h-[calc(100vh-7rem)] flex flex-col transition-all duration-200 ${
        editingCardId ? 'md:mr-[340px] lg:mr-[420px]' : ''
      }`}
    >
      <div className="mb-4 shrink-0">
        <BoardSelector filters={filters} setFilters={setFilters} />
      </div>

      <div className="flex-1 min-h-0">
        {activeBoardId === '__all__' ? (
          <AllBoardsView
            onCardClick={handleCardClick}
            selectedCardId={editingCardId}
          />
        ) : activeBoardId ? (
          <BoardView
            boardId={activeBoardId}
            onCardClick={handleCardClick}
            onCreateCard={handleCreateCard}
            inlineCardId={inlineCardId}
            onInlineDone={handleInlineDone}
            selectedCardId={editingCardId}
            filters={filters}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Create a board to get started
          </div>
        )}
      </div>

      {editingCardId && (
        <CardDetailPanel
          key={editingCardId}
          cardId={editingCardId}
          onClose={() => setEditingCardId(null)}
        />
      )}
    </div>
  )
}
