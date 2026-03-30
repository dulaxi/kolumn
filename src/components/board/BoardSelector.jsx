import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { ChevronDown, Plus, LayoutGrid, Layers, Users, Filter, X, Check } from 'lucide-react'
import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import DynamicIcon from './DynamicIcon'
import IconPicker from './IconPicker'
import BoardShareModal from './BoardShareModal'

function FilterPill({ label, active, children }) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors ${
          active
            ? 'bg-blue-50 text-blue-600 border border-blue-200'
            : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'
        }`}
      >
        {label}
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-40 min-w-[160px]">
          {children}
        </div>
      )}
    </div>
  )
}

function PriorityFilter({ filters, setFilters }) {
  const priorities = [
    { value: 'low', label: 'Low', color: 'bg-emerald-400' },
    { value: 'medium', label: 'Medium', color: 'bg-amber-400' },
    { value: 'high', label: 'High', color: 'bg-rose-400' },
  ]
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
          className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
            selected.includes(p.value) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
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
        <div className="px-3 py-2 text-xs text-gray-500">No assignees</div>
      ) : (
        assignees.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => select(name)}
            className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm transition-colors ${
              selected === name ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-600 shrink-0">
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
    red: 'bg-[#FFE0DB] text-[#CF222E]',
    blue: 'bg-[#DAF0FF] text-[#3094FF]',
    green: 'bg-[#D1FDE0] text-[#08872B]',
    yellow: 'bg-[#FFF4D4] text-[#9A6700]',
    purple: 'bg-[#EDD8FD] text-[#8534F3]',
    pink: 'bg-[#FFD6EA] text-[#BF3989]',
    gray: 'bg-[#E4EBE6] text-[#909692]',
  }

  return (
    <FilterPill label="Label" active={selected.length > 0}>
      {labels.length === 0 ? (
        <div className="px-3 py-2 text-xs text-gray-500">No labels</div>
      ) : (
        labels.map((lbl) => (
          <button
            key={lbl.text}
            type="button"
            onClick={() => toggle(lbl.text)}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
              selected.includes(lbl.text) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
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
            selected === opt.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </FilterPill>
  )
}

export default function BoardSelector({ filters, setFilters }) {
  const [open, setOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState(null)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const dropdownRef = useRef(null)
  const createInputRef = useRef(null)

  const boards = useBoardStore((s) => s.boards)
  const activeBoardId = useBoardStore((s) => s.activeBoardId)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
  const addBoard = useBoardStore((s) => s.addBoard)
  const cards = useBoardStore((s) => s.cards)
  const user = useAuthStore((s) => s.user)

  const boardList = Object.values(boards)
  const activeBoard = boards[activeBoardId]
  const isOwner = activeBoard && user && activeBoard.owner_id === user.id

  // Derive unique assignees and labels from cards on the current board
  const boardCards = useMemo(() => {
    if (!activeBoardId || activeBoardId === '__all__') return []
    return Object.values(cards).filter((c) => c.board_id === activeBoardId)
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

  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
        setIsCreating(false)
        setNewName('')
        setNewIcon(null)
        setShowIconPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    if (isCreating && createInputRef.current) {
      createInputRef.current.focus()
    }
  }, [isCreating])

  const handleCreate = async () => {
    const trimmed = newName.trim()
    if (trimmed) {
      await addBoard(trimmed, newIcon)
    }
    setNewName('')
    setNewIcon(null)
    setIsCreating(false)
    setShowIconPicker(false)
    setOpen(false)
  }

  const handleCreateKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCreate()
    } else if (e.key === 'Escape') {
      setNewName('')
      setNewIcon(null)
      setIsCreating(false)
      setShowIconPicker(false)
    }
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <span className="w-5 h-5 flex items-center justify-center text-gray-500">
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
                className={`w-4 h-4 text-gray-600 transition-transform ${
                  open ? 'rotate-180' : ''
                }`}
              />
            </button>

            {open && (
              <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-30 w-64">
                {/* All Tasks option */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveBoard('__all__')
                    setOpen(false)
                  }}
                  className={`flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm transition-colors ${
                    activeBoardId === '__all__'
                      ? 'bg-blue-50 text-gray-900 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="w-5 h-5 flex items-center justify-center text-gray-500 shrink-0">
                    <Layers className="w-4 h-4" />
                  </span>
                  All Tasks
                </button>
                <div className="border-t border-gray-200 my-1" />
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
                        ? 'bg-blue-50 text-gray-900 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="w-5 h-5 flex items-center justify-center text-gray-500 shrink-0">
                      {board.icon ? (
                        <DynamicIcon name={board.icon} className="w-4 h-4" />
                      ) : (
                        <LayoutGrid className="w-4 h-4" />
                      )}
                    </span>
                    {board.name}
                  </button>
                ))}

                <div className="border-t border-gray-200 mt-1 pt-1">
                  {isCreating ? (
                    <div className="px-3 py-1.5 space-y-2">
                      <div className="flex items-center gap-2">
                        {/* Icon pick button */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowIconPicker(!showIconPicker)}
                            className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors shrink-0"
                          >
                            {newIcon ? (
                              <DynamicIcon name={newIcon} className="w-4 h-4" />
                            ) : (
                              <LayoutGrid className="w-4 h-4" />
                            )}
                          </button>
                          {showIconPicker && (
                            <IconPicker
                              value={newIcon}
                              onChange={(icon) => setNewIcon(icon)}
                              onClose={() => setShowIconPicker(false)}
                            />
                          )}
                        </div>
                        <input
                          ref={createInputRef}
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={handleCreateKeyDown}
                          placeholder="Board name..."
                          className="flex-1 text-sm rounded-lg px-2 py-1.5 border border-gray-200 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100"
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsCreating(true)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    >
                      <Plus className="w-4 h-4" />
                      New board
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Share button — visible for board owners */}
          {activeBoard && activeBoardId !== '__all__' && isOwner && (
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <Users className="w-4 h-4" />
              Share
            </button>
          )}

          {/* Filter toggle button */}
          {activeBoardId && activeBoardId !== '__all__' && (
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                  : 'text-gray-600 bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filter
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center w-4 h-4 text-[10px] font-semibold text-white bg-blue-500 rounded-full">
                  {activeFilterCount}
                </span>
              )}
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
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-gray-500 hover:text-gray-600 transition-colors"
              >
                <X className="w-3 h-3" />
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Share modal */}
      {showShareModal && activeBoard && (
        <BoardShareModal
          board={activeBoard}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  )
}
