import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { selectBoardColumns } from '../../store/selectors'
import { Plus, X } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { useBoardStore } from '../../store/boardStore'
import { useIsMobile } from '../../hooks/useMediaQuery'
import SortableColumn from './SortableColumn'
import Column from './Column'
import Card from './Card'
import QuickAddBar from './QuickAddBar'

export default function BoardView({ boardId, onCardClick, onCreateCard, inlineCardId, onInlineDone, selectedCardId, filters, sortBy }) {
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [addingColumn, setAddingColumn] = useState(false)
  const [activeCardId, setActiveCardId] = useState(null)
  const [activeColumnId, setActiveColumnId] = useState(null)
  const inputRef = useRef(null)
  const affectedCardsRef = useRef(new Set())
  const isMobile = useIsMobile()

  const board = useBoardStore((s) => s.boards[boardId])
  const columnSelector = useMemo(() => selectBoardColumns(boardId), [boardId])
  const boardColumns = useBoardStore(columnSelector)
  const cards = useBoardStore((s) => s.cards)
  const addColumn = useBoardStore((s) => s.addColumn)
  const moveCardLocal = useBoardStore((s) => s.moveCardLocal)
  const persistCardPositions = useBoardStore((s) => s.persistCardPositions)
  const setDragging = useBoardStore((s) => s.setDragging)
  const completeCard = useBoardStore((s) => s.completeCard)
  const logCardMove = useBoardStore((s) => s.logCardMove)
  const reorderColumns = useBoardStore((s) => s.reorderColumns)
  const columns = useBoardStore((s) => s.columns)

  const dragOriginRef = useRef(null)

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  const sensors = useSensors(isMobile ? touchSensor : pointerSensor)

  // Custom collision: prefer pointerWithin (cards), fallback to rectIntersection (columns)
  const collisionDetection = useCallback((args) => {
    // Column drags: pointer-only for fluid response
    if (activeColumnId) return pointerWithin(args)
    // Card drags: prefer pointer, fallback to rect
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) return pointerCollisions
    return rectIntersection(args)
  }, [activeColumnId])

  useEffect(() => {
    if (isAddingColumn && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAddingColumn])

  const handleDragStart = useCallback((event) => {
    const id = event.active.id
    const state = useBoardStore.getState()

    // Check if dragging a column
    if (state.columns[id]) {
      setActiveColumnId(id)
      return
    }

    // Card drag
    const card = state.cards[id]
    dragOriginRef.current = card ? { cardId: id, columnId: card.column_id } : null
    setActiveCardId(id)
    setDragging(true)
    affectedCardsRef.current = new Set([id])
  }, [setDragging])

  const getColumns = useCallback(() => {
    const state = useBoardStore.getState()
    return Object.values(state.columns)
      .filter((c) => c.board_id === boardId)
      .sort((a, b) => a.position - b.position)
  }, [boardId])

  const getColumnCards = useCallback((columnId) => {
    const state = useBoardStore.getState()
    return Object.values(state.cards)
      .filter((c) => c.column_id === columnId && !c.archived)
      .sort((a, b) => a.position - b.position)
  }, [])

  const findCol = useCallback(
    (cardId) => {
      const cols = getColumns()
      const state = useBoardStore.getState()
      const card = state.cards[cardId]
      if (card) {
        return cols.find((col) => col.id === card.column_id) || null
      }
      return null
    },
    [getColumns]
  )

  const handleDragOver = useCallback(
    (event) => {
      const { active, over } = event
      if (!over) return
      // Skip column drags — handled in handleDragEnd
      if (activeColumnId) return

      const activeId = active.id
      const overId = over.id
      const cols = getColumns()

      const fromColumn = findCol(activeId)
      if (!fromColumn) return

      let toColumn = cols.find((col) => col.id === overId)
      if (!toColumn) {
        toColumn = findCol(overId)
      }
      if (!toColumn) return
      if (fromColumn.id === toColumn.id) return

      const fromCards = getColumnCards(fromColumn.id)
      const fromIndex = fromCards.findIndex((c) => c.id === activeId)

      const toCards = getColumnCards(toColumn.id)
      let toIndex
      const overCardIndex = toCards.findIndex((c) => c.id === overId)
      if (overCardIndex !== -1) {
        toIndex = overCardIndex
      } else {
        toIndex = toCards.length
      }

      // Track affected cards for persistence on drag end
      fromCards.forEach((c) => affectedCardsRef.current.add(c.id))
      toCards.forEach((c) => affectedCardsRef.current.add(c.id))

      // Only update local state during drag (no DB calls)
      moveCardLocal(boardId, fromColumn.id, toColumn.id, fromIndex, toIndex)
    },
    [boardId, activeColumnId, getColumns, findCol, getColumnCards, moveCardLocal]
  )

  const handleDragCancel = useCallback(() => {
    setActiveCardId(null)
    setActiveColumnId(null)
    setDragging(false)
    affectedCardsRef.current = new Set()
    dragOriginRef.current = null
  }, [setDragging])

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event
      setActiveCardId(null)
      setDragging(false)

      // Column drag end
      if (activeColumnId) {
        setActiveColumnId(null)
        if (over && active.id !== over.id) {
          const colIds = boardColumns.map((c) => c.id)
          const oldIdx = colIds.indexOf(active.id)
          const newIdx = colIds.indexOf(over.id)
          if (oldIdx !== -1 && newIdx !== -1) {
            const newOrder = arrayMove(colIds, oldIdx, newIdx)
            reorderColumns(boardId, newOrder)
          }
        }
        return
      }

      if (!over) {
        // Drag cancelled — still persist any changes from handleDragOver
        persistCardPositions([...affectedCardsRef.current])
        affectedCardsRef.current = new Set()
        return
      }

      const activeId = active.id
      const activeCardExists = useBoardStore.getState().cards[activeId]
      if (!activeCardExists) {
        persistCardPositions([...affectedCardsRef.current])
        affectedCardsRef.current = new Set()
        return
      }
      const overId = over.id
      const cols = getColumns()

      const fromColumn = findCol(activeId)
      if (!fromColumn) {
        persistCardPositions([...affectedCardsRef.current])
        affectedCardsRef.current = new Set()
        return
      }

      let toColumn = cols.find((col) => col.id === overId)
      if (!toColumn) {
        toColumn = findCol(overId)
      }

      // Same-column reorder
      if (toColumn && fromColumn.id === toColumn.id) {
        const colCards = getColumnCards(fromColumn.id)
        const fromIndex = colCards.findIndex((c) => c.id === activeId)
        const toIndex = colCards.findIndex((c) => c.id === overId)

        if (fromIndex !== toIndex && fromIndex !== -1 && toIndex !== -1) {
          colCards.forEach((c) => affectedCardsRef.current.add(c.id))
          moveCardLocal(boardId, fromColumn.id, toColumn.id, fromIndex, toIndex)
        }
      }

      // Check if card moved to a different column
      let movedCrossColumn = false
      if (dragOriginRef.current) {
        const { cardId: draggedId, columnId: origColumnId } = dragOriginRef.current
        const currentCard = useBoardStore.getState().cards[draggedId]
        if (currentCard && currentCard.column_id !== origColumnId) {
          movedCrossColumn = true
          logCardMove(draggedId, origColumnId, currentCard.column_id)
        }
        dragOriginRef.current = null
      }

      // Persist all affected cards to Supabase
      persistCardPositions([...affectedCardsRef.current], { movedCrossColumn })

      affectedCardsRef.current = new Set()
    },
    [boardId, activeColumnId, boardColumns, reorderColumns, getColumns, findCol, getColumnCards, moveCardLocal, persistCardPositions, setDragging, logCardMove]
  )

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

  const activeCard = activeCardId ? cards[activeCardId] : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <QuickAddBar boardId={boardId} />
      <div data-board-scroll className="flex gap-3 sm:gap-5 overflow-x-auto h-full snap-x snap-mandatory sm:snap-none scroll-pl-0 overscroll-x-contain">
        {/* Column drag reorder disabled for now — SortableColumn + reorderColumns ready when needed */}
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
                  className="px-3 py-1.5 text-xs font-medium bg-[#C2D64A] text-white rounded-md hover:bg-[#A8BA32] transition-colors disabled:opacity-50"
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
