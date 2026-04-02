import { useState, useEffect, lazy, Suspense } from 'react'
import { useBoardStore } from '../store/boardStore'
import BoardSelector from '../components/board/BoardSelector'
import BoardView from '../components/board/BoardView'
import AllBoardsView from '../components/board/AllBoardsView'

const CardDetailPanel = lazy(() => import('../components/board/CardDetailPanel'))

export default function BoardsPage() {
  const [editingCardId, setEditingCardId] = useState(null)
  const [inlineCardId, setInlineCardId] = useState(null)
  const [filters, setFilters] = useState({ priority: [], assignee: null, label: [], due: null })
  const [sortBy, setSortBy] = useState('manual')
  const activeBoardId = useBoardStore((s) => s.activeBoardId)

  const addCard = useBoardStore((s) => s.addCard)
  const columns = useBoardStore((s) => s.columns)

  // Listen for global events (search navigation, keyboard shortcuts)
  useEffect(() => {
    const openCard = (e) => setEditingCardId(e.detail.cardId)
    const closePanel = () => setEditingCardId(null)
    const newCard = async () => {
      if (!activeBoardId || activeBoardId === '__all__') return
      const firstCol = Object.values(columns)
        .filter((c) => c.board_id === activeBoardId)
        .sort((a, b) => a.position - b.position)[0]
      if (!firstCol) return
      const cardId = await addCard(activeBoardId, firstCol.id, { title: '' })
      if (cardId) setInlineCardId(cardId)
    }
    window.addEventListener('kolumn:open-card', openCard)
    window.addEventListener('kolumn:close-panel', closePanel)
    window.addEventListener('kolumn:new-card', newCard)
    return () => {
      window.removeEventListener('kolumn:open-card', openCard)
      window.removeEventListener('kolumn:close-panel', closePanel)
      window.removeEventListener('kolumn:new-card', newCard)
    }
  }, [activeBoardId, columns, addCard])

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
        <BoardSelector filters={filters} setFilters={setFilters} sortBy={sortBy} setSortBy={setSortBy} />
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
            sortBy={sortBy}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[#8E8E89]">
            Create a board to get started
          </div>
        )}
      </div>

      {editingCardId && (
        <Suspense fallback={<div className="fixed right-0 top-0 h-full w-[340px] lg:w-[420px] bg-white border-l border-gray-200 flex items-center justify-center"><div className="text-sm text-[#8E8E89]">Loading...</div></div>}>
          <CardDetailPanel
            key={editingCardId}
            cardId={editingCardId}
            onClose={() => setEditingCardId(null)}
          />
        </Suspense>
      )}
    </div>
  )
}
