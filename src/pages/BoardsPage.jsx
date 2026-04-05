import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { LayoutGrid } from 'lucide-react'
import { useBoardStore } from '../store/boardStore'
import BoardSelector from '../components/board/BoardSelector'
import BoardView from '../components/board/BoardView'
import AllBoardsView from '../components/board/AllBoardsView'
import CreateBoardModal from '../components/board/CreateBoardModal'

const CardDetailPanel = lazy(() => import('../components/board/CardDetailPanel'))

export default function BoardsPage() {
  const [editingCardId, setEditingCardId] = useState(null)
  const [inlineCardId, setInlineCardId] = useState(null)
  const [filters, setFilters] = useState({ priority: [], assignee: null, label: [], due: null })
  const [sortBy, setSortBy] = useState('manual')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const activeBoardId = useBoardStore((s) => s.activeBoardId)
  const boards = useBoardStore((s) => s.boards)

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
    const openCreate = () => { setShowCreateModal(true); window.dispatchEvent(new CustomEvent('kolumn:create-board-ack')) }
    window.addEventListener('kolumn:open-card', openCard)
    window.addEventListener('kolumn:close-panel', closePanel)
    window.addEventListener('kolumn:new-card', newCard)
    window.addEventListener('kolumn:create-board', openCreate)
    return () => {
      window.removeEventListener('kolumn:open-card', openCard)
      window.removeEventListener('kolumn:close-panel', closePanel)
      window.removeEventListener('kolumn:new-card', newCard)
      window.removeEventListener('kolumn:create-board', openCreate)
    }
  }, [activeBoardId, columns, addCard])

  const handleCardClick = useCallback((cardId) => {
    setInlineCardId(null)
    setEditingCardId(cardId)
  }, [])

  const handleCreateCard = useCallback((cardId) => {
    setEditingCardId(null)
    setInlineCardId(cardId)
  }, [])

  const handleInlineDone = useCallback(() => {
    setInlineCardId(null)
  }, [])

  return (
    <div
      className={`h-[calc(100vh-7rem)] flex flex-col transition-all duration-200 ${
        editingCardId ? 'md:mr-[340px] lg:mr-[420px]' : ''
      }`}
    >
      <div className="mb-4 shrink-0">
        <BoardSelector filters={filters} setFilters={setFilters} sortBy={sortBy} setSortBy={setSortBy} onCreateBoard={() => setShowCreateModal(true)} />
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
        ) : Object.keys(boards).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-[#E8E2DB] flex items-center justify-center mb-4">
              <LayoutGrid className="w-7 h-7 text-[#8E8E89]" />
            </div>
            <h2 className="text-lg font-semibold text-[#1B1B18] mb-1">Create your first board</h2>
            <p className="text-sm text-[#8E8E89] mb-5 max-w-xs">Organize tasks into columns that match your workflow.</p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#1B1B18] hover:bg-[#333] rounded-xl transition-colors"
            >
              <LayoutGrid className="w-4 h-4" />
              New Board
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-[#8E8E89]">
            Select a board to get started
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

      {showCreateModal && (
        <CreateBoardModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  )
}
