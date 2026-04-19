import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { LayoutGrid } from 'lucide-react'
import { useBoardStore } from '../store/boardStore'
import BoardSelector from '../components/board/BoardSelector'
import BoardView from '../components/board/BoardView'
import CreateBoardModal from '../components/board/CreateBoardModal'

const CardDetailPanel = lazy(() => import('../components/board/CardDetailPanel'))

export default function BoardsPage() {
  const [editingCardId, setEditingCardId] = useState(null)
  const [inlineCardId, setInlineCardId] = useState(null)
  const [filters, setFilters] = useState({ priority: [], assignee: null, label: [], due: null })
  const [sortBy, setSortBy] = useState('manual')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createInWorkspaceId, setCreateInWorkspaceId] = useState(null)
  const activeBoardId = useBoardStore((s) => s.activeBoardId)
  const boards = useBoardStore((s) => s.boards)
  const activeBoardName = useBoardStore((s) => s.boards[s.activeBoardId]?.name)

  const addCard = useBoardStore((s) => s.addCard)
  const columns = useBoardStore((s) => s.columns)
  const tempIdMap = useBoardStore((s) => s._tempIdMap)

  // Swap inline card ID when temp card gets persisted to real ID
  useEffect(() => {
    if (inlineCardId && tempIdMap?.[inlineCardId]) {
      setInlineCardId(tempIdMap[inlineCardId])
    }
  }, [inlineCardId, tempIdMap])

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
    const openCreate = (e) => {
      setCreateInWorkspaceId(e?.detail?.workspaceId || null)
      setShowCreateModal(true)
      window.dispatchEvent(new CustomEvent('kolumn:create-board-ack'))
    }
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
      className="h-full flex flex-col"
    >
      <div className="mb-4 shrink-0 flex items-start justify-between gap-4">
        <h1 className="font-heading text-2xl text-[var(--text-primary)] truncate min-w-0 flex-1 self-end">
          {activeBoardId === '__all__' ? 'All tasks' : (activeBoardName || 'Boards')}
        </h1>
        <div className="shrink-0">
          <BoardSelector filters={filters} setFilters={setFilters} sortBy={sortBy} setSortBy={setSortBy} onCreateBoard={() => setShowCreateModal(true)} />
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        {activeBoardId && activeBoardId !== '__all__' ? (
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
            <div className="w-14 h-14 rounded-2xl bg-[var(--surface-hover)] flex items-center justify-center mb-4">
              <LayoutGrid className="w-7 h-7 text-[var(--text-muted)]" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Create your first board</h2>
            <p className="text-sm text-[var(--text-muted)] mb-5 max-w-xs">Organize tasks into columns that match your workflow.</p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] rounded-xl transition-colors"
            >
              <LayoutGrid className="w-4 h-4" />
              New Board
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
            Select a board to get started
          </div>
        )}
      </div>

      {editingCardId && (
        <Suspense fallback={<div className="fixed inset-0 z-50 grid items-center justify-items-center bg-black/50"><div className="text-sm text-[var(--text-muted)]">Loading...</div></div>}>
          <CardDetailPanel
            key={editingCardId}
            cardId={editingCardId}
            onClose={() => setEditingCardId(null)}
          />
        </Suspense>
      )}

      {showCreateModal && (
        <CreateBoardModal
          onClose={() => { setShowCreateModal(false); setCreateInWorkspaceId(null) }}
          workspaceId={createInWorkspaceId}
        />
      )}
    </div>
  )
}
