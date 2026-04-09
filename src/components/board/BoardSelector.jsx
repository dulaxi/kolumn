import { useState, useRef, useEffect, useMemo, useCallback, lazy, Suspense } from 'react'
import { useClickOutside } from '../../hooks/useClickOutside'
import { ChevronDown, Plus, LayoutGrid, Layers, Users, Filter, X, Check, ArrowUpDown, Archive, ArchiveRestore, Trash2, Copy } from 'lucide-react'

import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import DynamicIcon from './DynamicIcon'
import { PRIORITY_OPTIONS } from '../../constants/colors'
const BoardShareModal = lazy(() => import('./BoardShareModal'))

function FilterPill({ label, active, children }) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useClickOutside(() => setIsOpen(false))

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors ${
          active
            ? 'bg-[var(--accent-lime-wash)] text-[#A8BA32] border border-[var(--border-focus)]'
            : 'bg-[var(--surface-hover)] text-[var(--text-secondary)] border border-transparent hover:bg-[#E0DBD5]'
        }`}
      >
        {label}
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-lg py-1 z-40 min-w-[160px]">
          {children}
        </div>
      )}
    </div>
  )
}

function PriorityFilter({ filters, setFilters }) {
  const priorities = PRIORITY_OPTIONS.map((o) => ({ value: o.value, label: o.label, color: o.dot }))
  const selected = filters?.priority || []

  const toggle = (value) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value]
    setFilters({ ...filters, priority: next })
  }

  return (
    <FilterPill label="Priority" active={selected.length > 0}>
      {priorities.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => toggle(p.value)}
          className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] transition-colors"
        >
          <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
            selected.includes(p.value) ? 'bg-[#C2D64A] border-[var(--border-focus)]' : 'border-[var(--border-default)]'
          }`}>
            {selected.includes(p.value) && <Check className="w-2.5 h-2.5 text-white" />}
          </span>
          <span className={`w-2 h-2 rounded-full ${p.color}`} />
          {p.label}
        </button>
      ))}
    </FilterPill>
  )
}

function AssigneeFilter({ filters, setFilters, assignees }) {
  const selected = filters?.assignee || null

  const select = (value) => {
    setFilters({ ...filters, assignee: selected === value ? null : value })
  }

  return (
    <FilterPill label="Assignee" active={!!selected}>
      {assignees.length === 0 ? (
        <div className="px-3 py-2 text-xs text-[var(--text-muted)]">No assignees</div>
      ) : (
        assignees.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => select(name)}
            className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm transition-colors ${
              selected === name ? 'bg-[var(--accent-lime-wash)] text-[#A8BA32]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-[#E0DBD5] flex items-center justify-center text-[10px] font-medium text-[var(--text-secondary)] shrink-0">
              {name.charAt(0).toUpperCase()}
            </span>
            {name}
          </button>
        ))
      )}
    </FilterPill>
  )
}

function LabelFilter({ filters, setFilters, labels }) {
  const selected = filters?.label || []

  const toggle = (value) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value]
    setFilters({ ...filters, label: next })
  }

  const labelColors = {
    red: 'bg-[#F2D9C7] text-[#8B5A33]',
    blue: 'bg-[#DAE0F0] text-[#4A5578]',
    green: 'bg-[#EEF2D6] text-[#6B7A12]',
    yellow: 'bg-[#F5EDCF] text-[#8B7322]',
    purple: 'bg-[#E8DDE2] text-[#6E5A65]',
    pink: 'bg-[#F0E0D2] text-[#7A5C44]',
    gray: 'bg-[#E8E2DB] text-[#5C5C57]',
  }

  return (
    <FilterPill label="Label" active={selected.length > 0}>
      {labels.length === 0 ? (
        <div className="px-3 py-2 text-xs text-[var(--text-muted)]">No labels</div>
      ) : (
        labels.map((lbl) => (
          <button
            key={lbl.text}
            type="button"
            onClick={() => toggle(lbl.text)}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] transition-colors"
          >
            <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
              selected.includes(lbl.text) ? 'bg-[#C2D64A] border-[var(--border-focus)]' : 'border-[var(--border-default)]'
            }`}>
              {selected.includes(lbl.text) && <Check className="w-2.5 h-2.5 text-white" />}
            </span>
            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${labelColors[lbl.color] || labelColors.gray}`}>
              {lbl.text}
            </span>
          </button>
        ))
      )}
    </FilterPill>
  )
}

function DueFilter({ filters, setFilters }) {
  const options = [
    { value: 'overdue', label: 'Overdue' },
    { value: 'today', label: 'Today' },
    { value: 'this_week', label: 'This week' },
    { value: 'no_date', label: 'No date' },
  ]
  const selected = filters?.due || null

  const select = (value) => {
    setFilters({ ...filters, due: selected === value ? null : value })
  }

  return (
    <FilterPill label="Due" active={!!selected}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => select(opt.value)}
          className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm transition-colors ${
            selected === opt.value ? 'bg-[var(--accent-lime-wash)] text-[#A8BA32]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </FilterPill>
  )
}

const SORT_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'due_date', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'created', label: 'Newest first' },
  { value: 'alpha', label: 'Alphabetical' },
]

export default function BoardSelector({ filters, setFilters, sortBy, setSortBy, onCreateBoard }) {
  const [open, setOpen] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const dropdownRef = useClickOutside(() => setOpen(false))

  const boards = useBoardStore((s) => s.boards)
  const activeBoardId = useBoardStore((s) => s.activeBoardId)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
  const cards = useBoardStore((s) => s.cards)
  const columns = useBoardStore((s) => s.columns)
  const unarchiveCard = useBoardStore((s) => s.unarchiveCard)
  const deleteCard = useBoardStore((s) => s.deleteCard)
  const user = useAuthStore((s) => s.user)

  const boardList = Object.values(boards)
  const activeBoard = boards[activeBoardId]
  const isOwner = activeBoard && user && activeBoard.owner_id === user.id

  // Derive unique assignees and labels from cards on the current board
  const boardCards = useMemo(() => {
    if (!activeBoardId || activeBoardId === '__all__') return []
    return Object.values(cards).filter((c) => c.board_id === activeBoardId && !c.archived)
  }, [cards, activeBoardId])

  const archivedCards = useMemo(() => {
    if (!activeBoardId || activeBoardId === '__all__') return []
    return Object.values(cards).filter((c) => c.board_id === activeBoardId && c.archived)
  }, [cards, activeBoardId])

  const uniqueAssignees = useMemo(() => {
    const names = new Set()
    boardCards.forEach((c) => {
      if (c.assignee_name && c.assignee_name.trim()) {
        names.add(c.assignee_name.trim())
      }
    })
    return Array.from(names).sort()
  }, [boardCards])

  const uniqueLabels = useMemo(() => {
    const labelMap = new Map()
    boardCards.forEach((c) => {
      if (c.labels && Array.isArray(c.labels)) {
        c.labels.forEach((lbl) => {
          if (lbl.text && !labelMap.has(lbl.text)) {
            labelMap.set(lbl.text, lbl)
          }
        })
      }
    })
    return Array.from(labelMap.values()).sort((a, b) => a.text.localeCompare(b.text))
  }, [boardCards])

  const activeFilterCount =
    (filters?.priority?.length || 0) +
    (filters?.assignee ? 1 : 0) +
    (filters?.label?.length || 0) +
    (filters?.due ? 1 : 0)

  const clearFilters = useCallback(() => {
    setFilters({ priority: [], assignee: null, label: [], due: null })
  }, [setFilters])

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl hover:bg-[var(--surface-raised)] transition-colors"
            >
              <span className="w-5 h-5 flex items-center justify-center text-[var(--text-muted)]">
                {activeBoardId === '__all__' ? (
                  <Layers className="w-4 h-4" />
                ) : activeBoard?.icon ? (
                  <DynamicIcon name={activeBoard.icon} className="w-4 h-4" />
                ) : (
                  <LayoutGrid className="w-4 h-4" />
                )}
              </span>
              <span>{activeBoardId === '__all__' ? 'All Tasks' : activeBoard?.name || 'Select board'}</span>
              <ChevronDown
                className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${
                  open ? 'rotate-180' : ''
                }`}
              />
            </button>

            {open && (
              <div className="absolute left-0 top-full mt-1 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-lg py-1 z-30 w-64">
                {/* All Tasks option */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveBoard('__all__')
                    setOpen(false)
                  }}
                  className={`flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm transition-colors ${
                    activeBoardId === '__all__'
                      ? 'bg-[var(--accent-lime-wash)] text-[var(--text-primary)] font-medium'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
                  }`}
                >
                  <span className="w-5 h-5 flex items-center justify-center text-[var(--text-muted)] shrink-0">
                    <Layers className="w-4 h-4" />
                  </span>
                  All Tasks
                </button>
                <div className="border-t border-[var(--border-default)] my-1" />
                {boardList.map((board) => (
                  <button
                    key={board.id}
                    type="button"
                    onClick={() => {
                      setActiveBoard(board.id)
                      setOpen(false)
                    }}
                    className={`flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm transition-colors ${
                      board.id === activeBoardId
                        ? 'bg-[var(--accent-lime-wash)] text-[var(--text-primary)] font-medium'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
                    }`}
                  >
                    <span className="w-5 h-5 flex items-center justify-center text-[var(--text-muted)] shrink-0">
                      {board.icon ? (
                        <DynamicIcon name={board.icon} className="w-4 h-4" />
                      ) : (
                        <LayoutGrid className="w-4 h-4" />
                      )}
                    </span>
                    {board.name}
                  </button>
                ))}

                <div className="border-t border-[var(--border-default)] mt-1 pt-1">
                  <button
                    type="button"
                    onClick={() => { setOpen(false); onCreateBoard() }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    New board
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Share button — visible for board owners */}
          {activeBoard && activeBoardId !== '__all__' && isOwner && (
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl hover:bg-[var(--surface-raised)] transition-colors"
            >
              <Users className="w-4 h-4" />
              Share
            </button>
          )}

          {/* Sort dropdown */}
          {activeBoardId && activeBoardId !== '__all__' && (
            <FilterPill label={sortBy === 'manual' ? 'Sort' : SORT_OPTIONS.find((o) => o.value === sortBy)?.label} active={sortBy !== 'manual'}>
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSortBy(opt.value)}
                  className={`flex items-center justify-between gap-2 w-full px-3 py-1.5 text-sm transition-colors ${
                    sortBy === opt.value ? 'bg-[var(--accent-lime-wash)] text-[#A8BA32] font-medium' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
                  }`}
                >
                  {opt.label}
                  {sortBy === opt.value && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </FilterPill>
          )}

          {/* Filter toggle button */}
          {activeBoardId && activeBoardId !== '__all__' && (
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'bg-[var(--accent-lime-wash)] text-[#A8BA32] border-[var(--border-focus)] hover:bg-[var(--accent-lime-wash)]'
                  : 'text-[var(--text-secondary)] bg-[var(--surface-card)] border-[var(--border-default)] hover:bg-[var(--surface-raised)]'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filter
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center w-4 h-4 text-[10px] font-semibold text-white bg-[#C2D64A] rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}

          {/* Archive toggle */}
          {activeBoardId && activeBoardId !== '__all__' && archivedCards.length > 0 && (
            <button
              type="button"
              onClick={() => setShowArchived(!showArchived)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border transition-colors ${
                showArchived
                  ? 'bg-[#F5EDCF] text-[#D4A843] border-[#D4A843] hover:bg-[#F5EDCF]'
                  : 'text-[var(--text-secondary)] bg-[var(--surface-card)] border-[var(--border-default)] hover:bg-[var(--surface-raised)]'
              }`}
            >
              <Archive className="w-4 h-4" />
              Archived ({archivedCards.length})
            </button>
          )}
        </div>

        {/* Filter bar */}
        {showFilters && activeBoardId && activeBoardId !== '__all__' && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <PriorityFilter filters={filters} setFilters={setFilters} />
            <AssigneeFilter filters={filters} setFilters={setFilters} assignees={uniqueAssignees} />
            <LabelFilter filters={filters} setFilters={setFilters} labels={uniqueLabels} />
            <DueFilter filters={filters} setFilters={setFilters} />
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                <X className="w-3 h-3" />
                Clear all
              </button>
            )}
          </div>
        )}
        {/* Archived cards panel */}
        {showArchived && archivedCards.length > 0 && (
          <div className="bg-[#F5EDCF]/50 border border-[#D4A843] rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[#8B7355] uppercase tracking-wider">Archived Tasks</span>
              <button type="button" onClick={() => setShowArchived(false)} className="text-[#D4A843] hover:text-[#8B7355]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {archivedCards.map((card) => (
                <div key={card.id} className="flex items-center justify-between py-1.5 px-2 bg-[var(--surface-card)] rounded-lg group">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[var(--text-secondary)] truncate">{card.title}</p>
                    <p className="text-[10px] text-[var(--text-faint)]">{columns[card.column_id]?.title || 'Unknown section'}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => unarchiveCard(card.id)}
                      className="p-1 text-[var(--text-faint)] hover:text-[#A8BA32] transition-colors"
                      title="Restore"
                    >
                      <ArchiveRestore className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCard(card.id)}
                      className="p-1 text-[var(--text-faint)] hover:text-[#7A5C44] transition-colors"
                      title="Delete permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Share modal */}
      {showShareModal && activeBoard && (
        <Suspense fallback={null}>
          <BoardShareModal
            board={activeBoard}
            onClose={() => setShowShareModal(false)}
          />
        </Suspense>
      )}
    </>
  )
}
