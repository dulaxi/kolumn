import { useState, useRef, useEffect, useMemo } from 'react'
import { DotsSixVertical, DotsThree, Gauge, Pencil, Plus, Trash } from '@phosphor-icons/react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useBoardStore } from '../../store/boardStore'
import SortableCard from './SortableCard'
import InlineCardEditor from './InlineCardEditor'
import GhostCard from './GhostCard'
import { interleaveGhosts, resolveGhostIndex } from '../../lib/moveGhosts'
import { filterCards } from '../../utils/cardFilters'
import { showToast } from '../../utils/toast'
import ConfirmModal from './ConfirmModal'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Menu from '../ui/Menu'

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

export default function Column({ column, boardId, onCardClick, onCreateCard, onCompleteCard, inlineCardId, onInlineDone, selectedCardId, filters, sortBy, dragHandleProps, ghosts = [], ghostInfo }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [creating, setCreating] = useState(false)
  const [renameValue, setRenameValue] = useState(column.title)
  const [editingWip, setEditingWip] = useState(false)
  const [wipValue, setWipValue] = useState(column.wip_limit || '')
  const [visibleCount, setVisibleCount] = useState(20)

  useEffect(() => {
    setVisibleCount(20)
  }, [filters, sortBy])

  const renameRef = useRef(null)

  const allCards = useBoardStore((s) => s.cards)
  const cardLabels = useBoardStore((s) => s.cardLabels)
  const labels = useBoardStore((s) => s.labels)
  const tempIdMap = useBoardStore((s) => s._tempIdMap)
  const addCard = useBoardStore((s) => s.addCard)
  const renameColumn = useBoardStore((s) => s.renameColumn)
  const deleteColumn = useBoardStore((s) => s.deleteColumn)
  const updateColumnWipLimit = useBoardStore((s) => s.updateColumnWipLimit)

  const { setNodeRef: setDroppableRef } = useDroppable({ id: column.id })

  // Memoize: only recompute when cards object or column.id changes
  const columnCards = useMemo(
    () => Object.values(allCards)
      .filter((c) => c.column_id === column.id && !c.archived)
      .sort((a, b) => a.position - b.position),
    [allCards, column.id]
  )

  // Apply filters then sort (keep columnCards intact for DnD)
  const filteredCards = useMemo(() => {
    const enriched = columnCards.map((c) => ({
      ...c,
      _labelTexts: [...(cardLabels[c.id] || new Set())]
        .map((lid) => labels[lid]?.text)
        .filter(Boolean),
    }))
    return sortCards(filterCards(enriched, filters), sortBy)
  }, [columnCards, cardLabels, labels, filters, sortBy])

  const allCardIds = useMemo(() => columnCards.map((c) => c.id), [columnCards])
  const wipLimit = column.wip_limit
  const overWip = wipLimit && columnCards.length > wipLimit

  useEffect(() => {
    if (isRenaming && renameRef.current) {
      renameRef.current.focus()
      renameRef.current.select()
    }
  }, [isRenaming])

  const handleCreateCard = async (template) => {
    if (creating) return
    // Enforce WIP limit
    if (wipLimit && columnCards.length >= wipLimit) {
      showToast.warn(`Column is at its WIP limit (${wipLimit})`)
      return
    }
    setCreating(true)
    // No auto-assignment on create — leave assignees empty so users
    // explicitly choose. Templates can still seed labels/checklist/etc.
    const cardData = template
      ? {
          title: template.title || 'Untitled task',
          description: template.description || '',
          priority: template.priority || 'medium',
          labels: template.labels || [],
          checklist: (template.checklist || []).map((item) => ({ text: item.text, done: false })),
        }
      : { title: 'Untitled task' }
    try {
      const cardId = await addCard(boardId, column.id, cardData)
      if (onCreateCard && cardId) onCreateCard(cardId)
    } finally {
      setCreating(false)
    }
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
    <div className={`flex flex-col w-[calc(100vw-3.5rem)] sm:w-[260px] lg:w-[290px] shrink-0 snap-start ${overWip ? 'bg-[var(--color-honey-wash)] rounded-xl px-2.5 py-2' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-0.5 pb-3">
        <div className="flex items-baseline gap-2">
          {dragHandleProps && (
            <button
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing text-[var(--text-faint)] hover:text-[var(--text-muted)] -ml-1 touch-none"
              aria-label="Drag to reorder column"
            >
              <DotsSixVertical className="w-3.5 h-3.5" />
            </button>
          )}
          {isRenaming ? (
            <input
              ref={renameRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              onBlur={handleRename}
              className="text-sm font-semibold rounded-lg px-1.5 py-0.5 flex-1 mr-2 border-0.5 border-[var(--border-default)] hover:border-[var(--color-mist)] focus:border-[var(--border-focus)] focus:outline-none focus:border-[var(--text-primary)] bg-[var(--surface-card)]"
            />
          ) : (
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {column.title}
            </h3>
          )}
          <span className={`text-xs ${overWip ? 'text-[var(--notice-warn-text)] font-medium' : 'text-[var(--text-muted)]'}`}>
            {columnCards.length}{wipLimit ? `/${wipLimit}` : ''}
          </span>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            onClick={handleCreateCard}
            disabled={creating}
            aria-label="Add task"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
          </button>
          <Menu
            open={menuOpen}
            onOpenChange={setMenuOpen}
            placement="bottom-end"
            panelClassName="w-44"
            panel={
              <>
                <Menu.Item
                  icon={<Pencil size={16} />}
                  onSelect={() => {
                    setMenuOpen(false)
                    setIsRenaming(true)
                    setRenameValue(column.title)
                  }}
                >
                  Rename
                </Menu.Item>
                <Menu.Item
                  icon={<Gauge size={16} />}
                  onSelect={() => {
                    setMenuOpen(false)
                    setEditingWip(true)
                    setWipValue(column.wip_limit || '')
                  }}
                >
                  WIP limit{wipLimit ? ` (${wipLimit})` : ''}
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  icon={<Trash size={16} />}
                  destructive
                  onSelect={() => {
                    setMenuOpen(false)
                    if (columnCards.length > 0) {
                      setConfirmDelete(true)
                    } else {
                      deleteColumn(boardId, column.id)
                    }
                  }}
                >
                  Delete
                </Menu.Item>
              </>
            }
          >
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Column options"
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              <DotsThree className="w-4 h-4" />
            </button>
          </Menu>
        </div>
      </div>

      {/* Cards list */}
      <div
        ref={setDroppableRef}
        className="flex-1 overflow-y-auto pb-2 space-y-2 min-h-[80px]"
      >
        <SortableContext
          items={allCardIds}
          strategy={verticalListSortingStrategy}
        >
          {(() => {
            const renderList = filteredCards.slice(0, visibleCount)
            const renderedPositions = renderList.map((c) => c.position)
            const adjustedGhosts = ghosts.map((g) => ({
              ...g,
              position: resolveGhostIndex(renderedPositions, g.position),
              approximate: g.approximate || g.floating || (sortBy && sortBy !== 'manual'),
            }))
            return interleaveGhosts(renderList.map((c) => c.id), adjustedGhosts)
          })().map((node, idx) => {
            if (node.type === 'ghost') {
              return ghostInfo ? (
                <GhostCard
                  key={`ghost-${idx}`}
                  title={ghostInfo.title}
                  moverName={ghostInfo.moverName}
                  moverColor={ghostInfo.moverColor}
                  movedAt={ghostInfo.movedAt}
                  age={node.ghost.age}
                  approximate={node.ghost.approximate}
                />
              ) : null
            }
            const card = filteredCards.find((c) => c.id === node.id)
            if (!card) return null
            // Match inline card by direct ID or via temp→real ID map
            const isInline = card.id === inlineCardId || (inlineCardId && tempIdMap?.[inlineCardId] === card.id)
            return isInline ? (
              <InlineCardEditor key={card.id} cardId={card.id} onDone={onInlineDone} />
            ) : (
              <SortableCard key={card.id} card={card} onClick={onCardClick} onComplete={onCompleteCard} isSelected={card.id === selectedCardId} />
            )
          })}
        </SortableContext>
        {filteredCards.length > visibleCount && (
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + 20)}
            className="w-full py-1.5 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors"
          >
            Show {Math.min(filteredCards.length - visibleCount, 20)} more ({filteredCards.length - visibleCount} remaining)
          </button>
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

      <Modal
        open={editingWip}
        onClose={() => setEditingWip(false)}
        contentClassName="flex items-center justify-center"
      >
        <div className="bg-[var(--surface-card)] rounded-xl border-0.5 border-[var(--border-default)] shadow-[0_4px_20px_rgba(0,0,0,0.08)] w-full max-w-xs mx-4 p-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">WIP Limit</h3>
            <p className="text-xs text-[var(--text-muted)] mb-3">Maximum number of tasks in "{column.title}". Leave empty for no limit.</p>
            <Input
              type="number"
              min="0"
              value={wipValue}
              onChange={(e) => setWipValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateColumnWipLimit(column.id, parseInt(wipValue) || null)
                  setEditingWip(false)
                }
              }}
              autoFocus
              placeholder="No limit"
              className="mb-3"
            />
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditingWip(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  updateColumnWipLimit(column.id, parseInt(wipValue) || null)
                  setEditingWip(false)
                }}
              >
                Save
              </Button>
            </div>
          </div>
      </Modal>
    </div>
  )
}
