import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { useBoardStore } from '../../store/boardStore'

export default function BoardSelector() {
  const [open, setOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const dropdownRef = useRef(null)
  const createInputRef = useRef(null)

  const boards = useBoardStore((s) => s.boards)
  const activeBoardId = useBoardStore((s) => s.activeBoardId)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
  const addBoard = useBoardStore((s) => s.addBoard)

  const boardList = Object.values(boards)
  const activeBoard = boards[activeBoardId]

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
        setIsCreating(false)
        setNewName('')
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

  const handleCreate = () => {
    const trimmed = newName.trim()
    if (trimmed) {
      addBoard(trimmed)
    }
    setNewName('')
    setIsCreating(false)
    setOpen(false)
  }

  const handleCreateKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleCreate()
    } else if (e.key === 'Escape') {
      setNewName('')
      setIsCreating(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <span>{activeBoard?.name || 'Select board'}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-30 w-56">
          {boardList.map((board) => (
            <button
              key={board.id}
              type="button"
              onClick={() => {
                setActiveBoard(board.id)
                setOpen(false)
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                board.id === activeBoardId
                  ? 'bg-primary-50 text-primary-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {board.name}
            </button>
          ))}

          <div className="border-t border-gray-100 mt-1 pt-1">
            {isCreating ? (
              <div className="px-3 py-1.5">
                <input
                  ref={createInputRef}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={handleCreateKeyDown}
                  onBlur={handleCreate}
                  placeholder="Board name..."
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              >
                <Plus className="w-4 h-4" />
                New board
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
