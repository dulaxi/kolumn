import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { SquaresFour } from '@phosphor-icons/react'
import { useBoardStore } from '../store/boardStore'
import BoardSelector from '../components/board/BoardSelector'
import BoardView from '../components/board/BoardView'
import CreateBoardModal from '../components/board/CreateBoardModal'
import LabelManagerModal from '../components/board/LabelManagerModal'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'

const CardDetailPanel = lazy(() => import('../components/board/CardDetailPanel'))

export default function BoardsPage() {
  const [editingCardId, setEditingCardId] = useState(null)
  const [inlineCardId, setInlineCardId] = useState(null)
  const [filters, setFilters] = useState({ priority: [], assignee: null, label: [], due: null })
  const [sortBy, setSortBy] = useState('manual')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createInWorkspaceId, setCreateInWorkspaceId] = useState(null)
  const [labelManagerOpen, setLabelManagerOpen] = useState(false)
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
    const openLabelManager = () => setLabelManagerOpen(true)
    window.addEventListener('kolumn:open-card', openCard)
    window.addEventListener('kolumn:close-panel', closePanel)
    window.addEventListener('kolumn:new-card', newCard)
    window.addEventListener('kolumn:create-board', openCreate)
    window.addEventListener('kolumn:open-label-manager', openLabelManager)
    return () => {
      window.removeEventListener('kolumn:open-card', openCard)
      window.removeEventListener('kolumn:close-panel', closePanel)
      window.removeEventListener('kolumn:new-card', newCard)
      window.removeEventListener('kolumn:create-board', openCreate)
      window.removeEventListener('kolumn:open-label-manager', openLabelManager)
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
        <h1 className="font-heading text-3xl tracking-tight text-[var(--text-primary)] truncate min-w-0 flex-1 self-end">
          {activeBoardId === '__all__' ? 'All tasks' : (activeBoardName || 'Boards')}
        </h1>
        <div className="shrink-0">
          <BoardSelector filters={filters} setFilters={setFilters} sortBy={sortBy} setSortBy={setSortBy} onCreateBoard={() => setShowCreateModal(true)} onManageLabels={() => setLabelManagerOpen(true)} />
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
          <EmptyState
            className="h-full"
            icon={SquaresFour}
            title="Create your first board"
            body="Organize tasks into columns that match your workflow."
            action={
              <Button onClick={() => setShowCreateModal(true)}>
                <SquaresFour className="w-4 h-4" />
                New Board
              </Button>
            }
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
            Select a board to get started
          </div>
        )}
      </div>

      {editingCardId && (
        <Suspense fallback={<div className="fixed inset-0 z-50 grid items-center justify-items-center bg-black/50"><Spinner size={24} /></div>}>
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

      {labelManagerOpen && activeBoardId && activeBoardId !== '__all__' && (
        <LabelManagerModal
          open={labelManagerOpen}
          onClose={() => setLabelManagerOpen(false)}
          boardId={activeBoardId}
        />
      )}
    </div>
  )
}
