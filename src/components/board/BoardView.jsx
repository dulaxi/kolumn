import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
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
import { useBoardStore } from '../../store/boardStore'
import { useIsMobile } from '../../hooks/useMediaQuery'
import Column from './Column'
import Card from './Card'

export default function BoardView({ boardId, onCardClick, onCreateCard, inlineCardId, onInlineDone, selectedCardId, filters, sortBy }) {
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [addingColumn, setAddingColumn] = useState(false)
  const [activeCardId, setActiveCardId] = useState(null)
  const inputRef = useRef(null)
  const affectedCardsRef = useRef(new Set())
  const isMobile = useIsMobile()

  const board = useBoardStore((s) => s.boards[boardId])
  const allColumns = useBoardStore((s) => s.columns)
  const cards = useBoardStore((s) => s.cards)
  const addColumn = useBoardStore((s) => s.addColumn)
  const moveCardLocal = useBoardStore((s) => s.moveCardLocal)
  const persistCardPositions = useBoardStore((s) => s.persistCardPositions)
  const setDragging = useBoardStore((s) => s.setDragging)
  const completeCard = useBoardStore((s) => s.completeCard)

  // Memoize: only recompute when columns object or boardId changes
  const boardColumns = useMemo(
    () => Object.values(allColumns)
      .filter((c) => c.board_id === boardId)
      .sort((a, b) => a.position - b.position),
    [allColumns, boardId]
  )

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  const sensors = useSensors(isMobile ? touchSensor : pointerSensor)

  // Custom collision: prefer pointerWithin (cards), fallback to rectIntersection (columns)
  const collisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) return pointerCollisions
    return rectIntersection(args)
  }, [])

  useEffect(() => {
    if (isAddingColumn && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAddingColumn])

  const handleDragStart = useCallback((event) => {
    setActiveCardId(event.active.id)
    setDragging(true)
    affectedCardsRef.current = new Set([event.active.id])
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
    [boardId, getColumns, findCol, getColumnCards, moveCardLocal]
  )

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event
      setActiveCardId(null)
      setDragging(false)

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

      // Persist all affected cards to Supabase
      persistCardPositions([...affectedCardsRef.current])
      affectedCardsRef.current = new Set()
    },
    [boardId, getColumns, findCol, getColumnCards, moveCardLocal, persistCardPositions, setDragging]
  )

  if (!board) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <p className="text-sm text-[#8E8E89]">Select a board from the sidebar to get started</p>
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
    >
      <div className="flex gap-3 sm:gap-5 overflow-x-auto h-full pb-4 snap-x snap-mandatory sm:snap-none scroll-pl-0 overscroll-x-contain">
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
        <div className="shrink-0 w-[calc(100vw-3.5rem)] sm:w-[260px] lg:w-[290px] sm:flex-none snap-start">
          {isAddingColumn ? (
            <div className="bg-white rounded-lg border border-[#E0DBD5] shadow-sm p-3 space-y-2">
              <input
                ref={inputRef}
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleAddColumn}
                placeholder="Section name"
                className="w-full text-[13px] px-0 py-0 border-none focus:outline-none focus:ring-0 placeholder-[#C4BFB8] bg-transparent"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddColumn}
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
                  className="p-1 rounded hover:bg-[#E8E2DB] text-[#8E8E89]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingColumn(true)}
              className="flex items-center gap-2 w-full px-0.5 py-2 text-[13px] text-[#8E8E89] hover:text-[#5C5C57] transition-colors"
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
