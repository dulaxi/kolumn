import { useState, useRef, useCallback, useMemo } from 'react'
import {
  pointerWithin,
  rectIntersection,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useBoardStore } from '../store/boardStore'
import { useIsMobile } from './useMediaQuery'

/**
 * Drag-and-drop coordination for the kanban surface.
 *
 * Owns:
 *   - active card / column tracking (which item is being dragged)
 *   - sensor configuration (pointer for desktop, touch with delay for mobile)
 *   - collision detection (pointer-first; falls back to rect for column hits)
 *   - drag-start / drag-over / drag-end / drag-cancel handlers
 *
 * Internals:
 *   - During drag-over we rewrite local card positions optimistically
 *     (moveCardLocal) for fluid feedback. We only persist to Supabase
 *     once on drag-end via persistCardPositions.
 *   - We accumulate a Set of "affected" card IDs across drag-over
 *     events so the persist call gets every card whose position
 *     actually changed, not just the one being dragged.
 *   - dragOriginRef remembers the column the card started in so we
 *     can fire logCardMove if the drag crossed columns.
 *
 * Returns the props needed by <DndContext> plus the active-card state
 * needed by <DragOverlay>.
 */
export function useBoardDnd({ boardId, boardColumns }) {
  const [activeCardId, setActiveCardId] = useState(null)
  const [activeColumnId, setActiveColumnId] = useState(null)
  const affectedCardsRef = useRef(new Set())
  const dragOriginRef = useRef(null)
  const isMobile = useIsMobile()

  const cards = useBoardStore((s) => s.cards)
  const moveCardLocal = useBoardStore((s) => s.moveCardLocal)
  const persistCardPositions = useBoardStore((s) => s.persistCardPositions)
  const setDragging = useBoardStore((s) => s.setDragging)
  const logCardMove = useBoardStore((s) => s.logCardMove)
  const reorderColumns = useBoardStore((s) => s.reorderColumns)

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  const sensors = useSensors(isMobile ? touchSensor : pointerSensor)

  const collisionDetection = useCallback((args) => {
    if (activeColumnId) return pointerWithin(args)
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) return pointerCollisions
    return rectIntersection(args)
  }, [activeColumnId])

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

  const findCol = useCallback((cardId) => {
    const cols = getColumns()
    const card = useBoardStore.getState().cards[cardId]
    return card ? (cols.find((col) => col.id === card.column_id) || null) : null
  }, [getColumns])

  const handleDragStart = useCallback((event) => {
    const id = event.active.id
    const state = useBoardStore.getState()

    if (state.columns[id]) {
      setActiveColumnId(id)
      return
    }

    const card = state.cards[id]
    dragOriginRef.current = card ? { cardId: id, columnId: card.column_id, position: card.position } : null
    setActiveCardId(id)
    setDragging(true)
    affectedCardsRef.current = new Set([id])
  }, [setDragging])

  const handleDragOver = useCallback((event) => {
    const { active, over } = event
    if (!over) return
    if (activeColumnId) return // column drags handled in dragEnd

    const activeId = active.id
    const overId = over.id
    const cols = getColumns()

    const fromColumn = findCol(activeId)
    if (!fromColumn) return

    let toColumn = cols.find((col) => col.id === overId) || findCol(overId)
    if (!toColumn) return
    if (fromColumn.id === toColumn.id) return

    const fromCards = getColumnCards(fromColumn.id)
    const fromIndex = fromCards.findIndex((c) => c.id === activeId)

    const toCards = getColumnCards(toColumn.id)
    const overCardIndex = toCards.findIndex((c) => c.id === overId)
    const toIndex = overCardIndex !== -1 ? overCardIndex : toCards.length

    fromCards.forEach((c) => affectedCardsRef.current.add(c.id))
    toCards.forEach((c) => affectedCardsRef.current.add(c.id))

    moveCardLocal(boardId, fromColumn.id, toColumn.id, fromIndex, toIndex)
  }, [boardId, activeColumnId, getColumns, findCol, getColumnCards, moveCardLocal])

  const handleDragCancel = useCallback(() => {
    setActiveCardId(null)
    setActiveColumnId(null)
    setDragging(false)
    affectedCardsRef.current = new Set()
    dragOriginRef.current = null
  }, [setDragging])

  const handleDragEnd = useCallback((event) => {
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
          reorderColumns(boardId, arrayMove(colIds, oldIdx, newIdx))
        }
      }
      return
    }

    const flush = () => {
      persistCardPositions([...affectedCardsRef.current])
      affectedCardsRef.current = new Set()
    }

    if (!over) return flush()

    const activeId = active.id
    const activeCardExists = useBoardStore.getState().cards[activeId]
    if (!activeCardExists) return flush()

    const overId = over.id
    const cols = getColumns()
    const fromColumn = findCol(activeId)
    if (!fromColumn) return flush()

    const toColumn = cols.find((col) => col.id === overId) || findCol(overId)

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

    // Detect cross-column move (origin column ≠ current column)
    let movedCrossColumn = false
    if (dragOriginRef.current) {
      const { cardId: draggedId, columnId: origColumnId, position: origPosition } = dragOriginRef.current
      const currentCard = useBoardStore.getState().cards[draggedId]
      if (currentCard && currentCard.column_id !== origColumnId) {
        movedCrossColumn = true
        logCardMove(draggedId, origColumnId, currentCard.column_id, origPosition, currentCard.position)
      }
      dragOriginRef.current = null
    }

    persistCardPositions([...affectedCardsRef.current], { movedCrossColumn })
    affectedCardsRef.current = new Set()
  }, [boardId, activeColumnId, boardColumns, reorderColumns, getColumns, findCol, getColumnCards, moveCardLocal, persistCardPositions, setDragging, logCardMove])

  const dndContextProps = useMemo(() => ({
    sensors,
    collisionDetection,
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragEnd: handleDragEnd,
    onDragCancel: handleDragCancel,
  }), [sensors, collisionDetection, handleDragStart, handleDragOver, handleDragEnd, handleDragCancel])

  const activeCard = activeCardId ? cards[activeCardId] : null

  return {
    dndContextProps,
    activeCardId,
    activeCard,
    isMobile,
  }
}
