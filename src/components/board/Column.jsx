import { useState, useRef, useEffect, useMemo } from 'react'
import { Plus, MoreHorizontal, Pencil, Trash2, Gauge, ChevronDown, Bookmark, X } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import SortableCard from './SortableCard'
import InlineCardEditor from './InlineCardEditor'
import { filterCards } from '../../utils/cardFilters'
import ConfirmModal from './ConfirmModal'
import { useTemplateStore } from '../../store/templateStore'

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
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [creating, setCreating] = useState(false)
  const [renameValue, setRenameValue] = useState(column.title)
  const [editingWip, setEditingWip] = useState(false)
  const [wipValue, setWipValue] = useState(column.wip_limit || '')
  const [showTemplates, setShowTemplates] = useState(false)
  const [visibleCount, setVisibleCount] = useState(20)
  const templates = useTemplateStore((s) => s.templates)
  const deleteTemplate = useTemplateStore((s) => s.deleteTemplate)
  const renameRef = useRef(null)
  const menuRef = useRef(null)

  const allCards = useBoardStore((s) => s.cards)
  const addCard = useBoardStore((s) => s.addCard)
  const renameColumn = useBoardStore((s) => s.renameColumn)
  const deleteColumn = useBoardStore((s) => s.deleteColumn)
  const updateColumnWipLimit = useBoardStore((s) => s.updateColumnWipLimit)
  const profile = useAuthStore((s) => s.profile)

  const { setNodeRef: setDroppableRef } = useDroppable({ id: column.id })

  // Memoize: only recompute when cards object or column.id changes
  const columnCards = useMemo(
    () => Object.values(allCards)
      .filter((c) => c.column_id === column.id && !c.archived)
      .sort((a, b) => a.position - b.position),
    [allCards, column.id]
  )

  // Apply filters then sort (keep columnCards intact for DnD)
  const filteredCards = useMemo(
    () => sortCards(filterCards(columnCards, filters), sortBy),
    [columnCards, filters, sortBy]
  )

  const cardIds = useMemo(() => columnCards.map((c) => c.id), [columnCards])
  const wipLimit = column.wip_limit
  const overWip = wipLimit && columnCards.length > wipLimit

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

  const handleCreateCard = async (template) => {
    if (creating) return
    setCreating(true)
    const today = new Date().toISOString().split('T')[0] + 'T23:59:59'
    const cardData = template
      ? {
          title: template.title || 'Untitled task',
          description: template.description || '',
          assignee: profile?.display_name || '',
          dueDate: today,
          priority: template.priority || 'medium',
          labels: template.labels || [],
          checklist: (template.checklist || []).map((item) => ({ text: item.text, checked: false })),
        }
      : { title: 'Untitled task', assignee: profile?.display_name || '', dueDate: today }
    const cardId = await addCard(boardId, column.id, cardData)
    if (onCreateCard && cardId) onCreateCard(cardId)
    setCreating(false)
    setShowTemplates(false)
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
    <div className={`flex flex-col w-[calc(100vw-3.5rem)] sm:min-w-[260px] lg:min-w-[290px] sm:flex-1 shrink-0 snap-start ${overWip ? 'bg-[#E8E2DB] rounded-xl px-2.5 py-2' : ''}`}>
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
              className="text-sm font-semibold rounded px-1.5 py-0.5 flex-1 mr-2 border border-[#E0DBD5] focus:border-[#C2D64A] focus:outline-none bg-white"
            />
          ) : (
            <h3 className="text-sm font-semibold text-[#1B1B18]">
              {column.title}
            </h3>
          )}
          <span className={`text-xs ${overWip ? 'text-[#8B7355] font-medium' : 'text-[#8E8E89]'}`}>
            {filteredCards.length}{wipLimit ? `/${wipLimit}` : ''}
          </span>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            onClick={handleCreateCard}
            aria-label="Add task"
            className="p-1.5 rounded-lg text-[#8E8E89] hover:text-[#5C5C57] hover:bg-[#E8E2DB] transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Column options"
              className="p-1.5 rounded-lg text-[#8E8E89] hover:text-[#5C5C57] hover:bg-[#E8E2DB] transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 bg-white rounded-xl border border-[#E0DBD5] shadow-lg py-1 z-20 w-40 animate-dropdown">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    setIsRenaming(true)
                    setRenameValue(column.title)
                  }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-[#5C5C57] hover:bg-[#F2EDE8]"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    setEditingWip(true)
                    setWipValue(column.wip_limit || '')
                  }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-[#5C5C57] hover:bg-[#F2EDE8]"
                >
                  <Gauge className="w-3.5 h-3.5" />
                  WIP limit{wipLimit ? ` (${wipLimit})` : ''}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    if (columnCards.length > 0) {
                      setConfirmDelete(true)
                    } else {
                      deleteColumn(boardId, column.id)
                    }
                  }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-[#7A5C44] hover:bg-[#F2EDE8]"
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
          {filteredCards.slice(0, visibleCount).map((card) =>
            card.id === inlineCardId ? (
              <InlineCardEditor key={card.id} cardId={card.id} onDone={onInlineDone} />
            ) : (
              <SortableCard key={card.id} card={card} onClick={onCardClick} onComplete={onCompleteCard} isSelected={card.id === selectedCardId} />
            )
          )}
        </SortableContext>
        {filteredCards.length > visibleCount && (
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + 20)}
            className="w-full py-1.5 text-[12px] font-medium text-[#A8BA32] hover:text-[#A8BA32] hover:bg-[#EEF2D6] rounded-lg transition-colors"
          >
            Show {Math.min(filteredCards.length - visibleCount, 20)} more ({filteredCards.length - visibleCount} remaining)
          </button>
        )}
      </div>

      {/* Add card */}
      <div className="pt-1 relative">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => handleCreateCard()}
            disabled={creating}
            className="flex items-center gap-1.5 text-[13px] text-[#8E8E89] hover:text-[#5C5C57] px-0.5 py-1.5 flex-1 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {creating ? 'Adding...' : 'Add task'}
          </button>
          {templates.length > 0 && (
            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className="p-1 rounded text-[#C4BFB8] hover:text-[#5C5C57] hover:bg-[#E8E2DB] transition-colors"
              title="From template"
            >
              <Bookmark className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {showTemplates && (
          <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-[#E0DBD5] rounded-xl shadow-lg z-30 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#E8E2DB]">
              <span className="text-[10px] font-semibold text-[#8E8E89] uppercase tracking-wider">Templates</span>
              <button type="button" onClick={() => setShowTemplates(false)} className="text-[#C4BFB8] hover:text-[#5C5C57]">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto py-1">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center group">
                  <button
                    type="button"
                    onClick={() => handleCreateCard(t)}
                    className="flex-1 text-left px-3 py-1.5 text-sm text-[#5C5C57] hover:bg-[#F2EDE8] truncate transition-colors"
                  >
                    {t.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTemplate(t.id)}
                    className="p-1 mr-1 text-[#C4BFB8] hover:text-[#7A5C44] opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmModal
          title={`Delete "${column.title}"`}
          message={`This section has ${columnCards.length} task(s) that will be permanently deleted.`}
          onConfirm={() => {
            setConfirmDelete(false)
            deleteColumn(boardId, column.id)
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {editingWip && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setEditingWip(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs mx-4 p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-[#1B1B18] mb-1">WIP Limit</h3>
            <p className="text-xs text-[#8E8E89] mb-3">Maximum number of tasks in "{column.title}". Leave empty for no limit.</p>
            <input
              type="number"
              min="0"
              value={wipValue}
              onChange={(e) => setWipValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateColumnWipLimit(column.id, parseInt(wipValue) || null)
                  setEditingWip(false)
                } else if (e.key === 'Escape') {
                  setEditingWip(false)
                }
              }}
              autoFocus
              placeholder="No limit"
              className="w-full text-sm rounded-xl px-3 py-2 border border-[#E0DBD5] focus:border-[#C2D64A] focus:outline-none focus:ring-1 focus:ring-[#EEF2D6] mb-3"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingWip(false)}
                className="px-3 py-1.5 text-sm font-medium text-[#5C5C57] hover:bg-[#E8E2DB] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  updateColumnWipLimit(column.id, parseInt(wipValue) || null)
                  setEditingWip(false)
                }}
                className="px-3 py-1.5 text-sm font-medium text-white bg-[#C2D64A] hover:bg-[#A8BA32] rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
