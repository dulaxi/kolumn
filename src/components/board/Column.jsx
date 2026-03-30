import { useState, useRef, useEffect } from 'react'
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import SortableCard from './SortableCard'
import InlineCardEditor from './InlineCardEditor'
import { filterCards } from '../../utils/cardFilters'

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

function sortCards(cards, sortBy) {
  if (!sortBy || sortBy === 'manual') return cards
  return [...cards].sort((a, b) => {
    if (sortBy === 'due_date') {
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return a.due_date.localeCompare(b.due_date)
    }
    if (sortBy === 'priority') {
      return (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3)
    }
    if (sortBy === 'created') {
      return (b.created_at || '').localeCompare(a.created_at || '')
    }
    if (sortBy === 'alpha') {
      return (a.title || '').localeCompare(b.title || '')
    }
    return 0
  })
}

export default function Column({ column, boardId, onCardClick, onCreateCard, onCompleteCard, inlineCardId, onInlineDone, selectedCardId, filters, sortBy }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(column.title)
  const renameRef = useRef(null)
  const menuRef = useRef(null)

  const allCards = useBoardStore((s) => s.cards)
  const addCard = useBoardStore((s) => s.addCard)
  const renameColumn = useBoardStore((s) => s.renameColumn)
  const deleteColumn = useBoardStore((s) => s.deleteColumn)
  const profile = useAuthStore((s) => s.profile)

  const { setNodeRef: setDroppableRef } = useDroppable({ id: column.id })

  // Get cards for this column, sorted by position
  const columnCards = Object.values(allCards)
    .filter((c) => c.column_id === column.id)
    .sort((a, b) => a.position - b.position)

  // Apply filters then sort (keep columnCards intact for DnD)
  const filteredCards = sortCards(filterCards(columnCards, filters), sortBy)

  const cardIds = columnCards.map((c) => c.id)

  useEffect(() => {
    if (isRenaming && renameRef.current) {
      renameRef.current.focus()
      renameRef.current.select()
    }
  }, [isRenaming])

  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const handleCreateCard = async () => {
    const today = new Date().toISOString().split('T')[0] + 'T23:59:59'
    const cardId = await addCard(boardId, column.id, { title: 'Untitled task', assignee: profile?.display_name || '', dueDate: today })
    if (onCreateCard && cardId) onCreateCard(cardId)
  }

  const handleRename = () => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== column.title) {
      renameColumn(boardId, column.id, trimmed)
    }
    setIsRenaming(false)
  }

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleRename()
    } else if (e.key === 'Escape') {
      setRenameValue(column.title)
      setIsRenaming(false)
    }
  }

  return (
    <div className="flex flex-col w-[calc(100vw-3.5rem)] sm:w-[260px] lg:w-[290px] shrink-0 snap-start">
      {/* Header */}
      <div className="flex items-center justify-between px-0.5 pb-3">
        <div className="flex items-baseline gap-2">
          {isRenaming ? (
            <input
              ref={renameRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              onBlur={handleRename}
              className="text-sm font-semibold rounded px-1.5 py-0.5 flex-1 mr-2 border border-gray-300 focus:border-blue-400 focus:outline-none bg-white"
            />
          ) : (
            <h3 className="text-sm font-semibold text-gray-800">
              {column.title}
            </h3>
          )}
          <span className="text-xs text-gray-500">
            {filteredCards.length}
          </span>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            onClick={handleCreateCard}
            className="p-1 rounded text-gray-500 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded text-gray-500 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-20 w-36">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    setIsRenaming(true)
                    setRenameValue(column.title)
                  }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    deleteColumn(boardId, column.id)
                  }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-600 hover:bg-gray-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cards list */}
      <div
        ref={setDroppableRef}
        className="flex-1 overflow-y-auto pb-2 space-y-2 min-h-[80px]"
      >
        <SortableContext
          items={cardIds}
          strategy={verticalListSortingStrategy}
        >
          {filteredCards.map((card) =>
            card.id === inlineCardId ? (
              <InlineCardEditor key={card.id} cardId={card.id} onDone={onInlineDone} />
            ) : (
              <SortableCard key={card.id} card={card} onClick={onCardClick} onComplete={onCompleteCard} isSelected={card.id === selectedCardId} />
            )
          )}
        </SortableContext>
      </div>

      {/* Add card */}
      <div className="pt-1">
        <button
          type="button"
          onClick={handleCreateCard}
          className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-600 px-0.5 py-1.5 w-full transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add task
        </button>
      </div>
    </div>
  )
}
