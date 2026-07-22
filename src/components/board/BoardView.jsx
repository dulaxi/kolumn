import { useState, useRef, useEffect, useMemo } from 'react'
import { selectBoardColumns } from '../../store/selectors'
import { Plus, X } from '@phosphor-icons/react'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { useBoardStore } from '../../store/boardStore'
import { useBoardDnd } from '../../hooks/useBoardDnd'
import { useGhostHoverStore } from '../../store/ghostHoverStore'
import { useSettingsStore } from '../../store/settingsStore'
import { deriveGhosts } from '../../lib/moveGhosts'
import Column from './Column'
import Card from './Card'
import QuickAddBar from './QuickAddBar'

export default function BoardView({ boardId, onCardClick, onCreateCard, inlineCardId, onInlineDone, selectedCardId, filters, sortBy }) {
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [addingColumn, setAddingColumn] = useState(false)
  const inputRef = useRef(null)

  const board = useBoardStore((s) => s.boards[boardId])
  const columnSelector = useMemo(() => selectBoardColumns(boardId), [boardId])
  const boardColumns = useBoardStore(columnSelector)
  const addColumn = useBoardStore((s) => s.addColumn)
  const completeCard = useBoardStore((s) => s.completeCard)

  const ghostArmed = useSettingsStore((s) => !!s.ghostBoards[boardId])
  const hoverCardId = useGhostHoverStore((s) => s.hoverCardId)
  // Subscribe to ONLY the hovered card (null when not hovering) — keeps this
  // component off the full cards slice.
  const hoverCard = useBoardStore((s) => (ghostArmed && hoverCardId) ? s.cards[hoverCardId] : null)

  const ghostPlacements = useMemo(() => {
    if (!hoverCard?.last_move) return []
    const columnIds = boardColumns.map((c) => c.id)
    return deriveGhosts([hoverCard.last_move], columnIds).map((p) =>
      // Deleted origin column -> float at the top of the card's current column.
      p.columnId ? p : { ...p, columnId: hoverCard.column_id, position: 0, floating: true }
    )
  }, [hoverCard, boardColumns])

  const ghostInfo = hoverCard?.last_move ? {
    card: hoverCard,
    moverName: hoverCard.last_move.moved_by_name || 'Someone',
    moverColor: hoverCard.last_move.moved_by_color || null,
    movedAt: hoverCard.last_move.moved_at || null,
  } : null

  const { dndContextProps, activeCardId, activeCard, isMobile } = useBoardDnd({ boardId, boardColumns })

  useEffect(() => {
    if (isAddingColumn && inputRef.current) inputRef.current.focus()
  }, [isAddingColumn])

  if (!board) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <p className="text-sm text-[var(--text-muted)]">Select a board from the sidebar to get started</p>
      </div>
    )
  }

  const handleAddColumn = async () => {
    if (addingColumn) return
    const trimmed = newColumnTitle.trim()
    if (trimmed) {
      setAddingColumn(true)
      await addColumn(boardId, trimmed)
      setAddingColumn(false)
    }
    setNewColumnTitle('')
    setIsAddingColumn(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAddColumn()
    } else if (e.key === 'Escape') {
      setNewColumnTitle('')
      setIsAddingColumn(false)
    }
  }

  return (
    <DndContext {...dndContextProps}>
      <QuickAddBar boardId={boardId} />
      <div data-board-scroll className="flex gap-3 sm:gap-5 overflow-x-auto h-full snap-x snap-mandatory sm:snap-none scroll-pl-0 overscroll-x-contain">
        {boardColumns.map((column) => (
          <Column
            key={column.id}
            column={column}
            boardId={boardId}
            onCardClick={onCardClick}
            onCreateCard={onCreateCard}
            onCompleteCard={completeCard}
            inlineCardId={inlineCardId}
            onInlineDone={onInlineDone}
            selectedCardId={selectedCardId}
            filters={filters}
            sortBy={sortBy}
            ghosts={ghostPlacements.filter((p) => p.columnId === column.id)}
            ghostInfo={ghostInfo}
          />
        ))}

        {/* Add section */}
        <div className="shrink-0 w-[calc(100vw-3.5rem)] sm:w-[260px] lg:w-[290px] snap-start">
          {isAddingColumn ? (
            <div className="bg-[var(--surface-card)] rounded-lg border border-[var(--border-default)] shadow-sm p-3 space-y-2">
              <input
                ref={inputRef}
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => { if (!addingColumn) handleAddColumn() }}
                placeholder="Section name"
                className="w-full text-[13px] px-0 py-0 border-none focus:outline-none focus:ring-0 placeholder-[var(--text-faint)] bg-transparent"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleAddColumn() }}
                  disabled={addingColumn}
                  className="px-3 py-1.5 text-xs font-medium bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] rounded-md hover:bg-[var(--btn-primary-hover)] transition-colors disabled:opacity-50"
                >
                  {addingColumn ? 'Adding...' : 'Add section'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewColumnTitle('')
                    setIsAddingColumn(false)
                  }}
                  className="p-1 rounded hover:bg-[var(--surface-hover)] text-[var(--text-muted)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingColumn(true)}
              className="flex items-center gap-2 w-full px-0.5 py-2 text-[13px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add section
            </button>
          )}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCardId && activeCard ? (
          <div className={`${isMobile ? 'scale-105 shadow-xl' : 'rotate-2'} opacity-90`}>
            <Card card={activeCard} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
