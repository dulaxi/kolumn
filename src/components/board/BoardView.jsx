import { useState, useRef, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { useBoardStore } from '../../store/boardStore'
import Column from './Column'

export default function BoardView({ boardId, onCardClick }) {
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const inputRef = useRef(null)

  const board = useBoardStore((s) => s.boards[boardId])
  const addColumn = useBoardStore((s) => s.addColumn)

  useEffect(() => {
    if (isAddingColumn && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAddingColumn])

  if (!board) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)] text-gray-400">
        No board selected
      </div>
    )
  }

  const handleAddColumn = () => {
    const trimmed = newColumnTitle.trim()
    if (trimmed) {
      addColumn(boardId, trimmed)
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
    <div className="flex gap-4 overflow-x-auto h-[calc(100vh-10rem)] pb-4">
      {board.columns.map((column) => (
        <Column
          key={column.id}
          column={column}
          boardId={boardId}
          onCardClick={onCardClick}
        />
      ))}

      {/* Add column */}
      <div className="shrink-0 w-72">
        {isAddingColumn ? (
          <div className="bg-gray-100 rounded-xl p-3 space-y-2">
            <input
              ref={inputRef}
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleAddColumn}
              placeholder="Column title..."
              className="w-full text-sm bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddColumn}
                className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Add column
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewColumnTitle('')
                  setIsAddingColumn(false)
                }}
                className="p-1 rounded hover:bg-gray-200 text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAddingColumn(true)}
            className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-gray-500 bg-gray-100/60 hover:bg-gray-100 rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add column
          </button>
        )}
      </div>
    </div>
  )
}
