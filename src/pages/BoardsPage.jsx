import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { SquaresFour } from '@phosphor-icons/react'
import { useBoardStore } from '../store/boardStore'
import { usePresenceStore } from '../store/presenceStore'
import { useAuthStore } from '../store/authStore'
import BoardSelector from '../components/board/BoardSelector'
import BoardSkeleton from '../components/board/BoardSkeleton'
import BoardView from '../components/board/BoardView'
import CreateBoardModal from '../components/board/CreateBoardModal'
import LabelManagerModal from '../components/board/LabelManagerModal'
import PresenceBar from '../components/board/PresenceBar'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import Skeleton from '../components/ui/Skeleton'
import Spinner from '../components/ui/Spinner'
import { PageHeader } from '../components/layout/headerSlot'

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
  const boardsLoading = useBoardStore((s) => s.loading)
  const activeBoardName = useBoardStore((s) => s.boards[s.activeBoardId]?.name)

  const addCard = useBoardStore((s) => s.addCard)
  const columns = useBoardStore((s) => s.columns)

  // inlineCardId deliberately stays the ORIGINAL (possibly temp) id for the
  // whole editing session. Column matches it through _tempIdMap and the
  // editor resolves it internally — remapping it here re-keyed the editor
  // mid-typing (mount-animation blink, dropped draft state).

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

  const profile = useAuthStore((s) => s.profile)
  const joinBoard = usePresenceStore((s) => s.joinBoard)
  const leaveBoard = usePresenceStore((s) => s.leaveBoard)
  useEffect(() => {
    if (!profile?.id || !activeBoardId || activeBoardId === '__all__') { leaveBoard(); return }
    joinBoard(activeBoardId, {
      user_id: profile.id, name: profile.display_name || 'Someone',
      color: profile.color, icon: profile.icon,
    })
    return () => leaveBoard()
  }, [activeBoardId, profile?.id, profile?.display_name, profile?.color, profile?.icon, joinBoard, leaveBoard])

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
      {/* Header — desktop: portaled into the 64px bar; mobile: inline here */}
      <PageHeader align="wide" mobileClassName="mb-4 shrink-0 flex items-start justify-between gap-4">
        <div className="flex items-end justify-between gap-3 min-w-0 flex-1">
          {boardsLoading ? (
            <Skeleton variant="line" width={176} height={28} className="min-w-0 flex-1 max-w-44 mb-1" />
          ) : (
            <h1 className="font-heading font-[425] text-3xl tracking-tight text-[var(--text-primary)] truncate min-w-0 flex-1">
              {activeBoardId === '__all__' ? 'All tasks' : (activeBoardName || 'Boards')}
            </h1>
          )}
          <PresenceBar />
        </div>
        <div className="shrink-0">
          <BoardSelector filters={filters} setFilters={setFilters} sortBy={sortBy} setSortBy={setSortBy} onCreateBoard={() => setShowCreateModal(true)} onManageLabels={() => setLabelManagerOpen(true)} />
        </div>
      </PageHeader>

      <div className="flex-1 min-h-0 relative">
        {boardsLoading ? (
          <BoardSkeleton />
        ) : activeBoardId && activeBoardId !== '__all__' ? (
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
        <Suspense fallback={<div className="fixed inset-0 z-40 grid items-center justify-items-center bg-[rgba(27,27,24,0.45)]"><Spinner size={24} /></div>}>
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
