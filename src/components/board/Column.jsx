import { useState, useRef, useEffect } from 'react'
import { Plus, MoreHorizontal, X, Pencil, Trash2 } from 'lucide-react'
import { useBoardStore } from '../../store/boardStore'
import Card from './Card'

export default function Column({ column, boardId, onCardClick }) {
  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(column.title)
  const inputRef = useRef(null)
  const renameRef = useRef(null)
  const menuRef = useRef(null)

  const cards = useBoardStore((s) => s.cards)
  const addCard = useBoardStore((s) => s.addCard)
  const renameColumn = useBoardStore((s) => s.renameColumn)
  const deleteColumn = useBoardStore((s) => s.deleteColumn)

  const columnCards = column.cardIds
    .map((id) => cards[id])
    .filter(Boolean)

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAdding])

  useEffect(() => {
    if (isRenaming && renameRef.current) {
      renameRef.current.focus()
      renameRef.current.select()
    }
  }, [isRenaming])

  // Close menu on click outside
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

  const handleAdd = () => {
    const trimmed = newTitle.trim()
    if (trimmed) {
      addCard(boardId, column.id, { title: trimmed })
      setNewTitle('')
    }
    setIsAdding(false)
  }

  const handleAddKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAdd()
    } else if (e.key === 'Escape') {
      setNewTitle('')
      setIsAdding(false)
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
    <div className="flex flex-col bg-gray-100 rounded-xl w-72 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        {isRenaming ? (
          <input
            ref={renameRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={handleRename}
            className="text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-primary-500 flex-1 mr-2"
          />
        ) : (
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {column.title}
          </h3>
        )}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 bg-gray-200 rounded-full px-2 py-0.5 font-medium">
            {columnCards.length}
          </span>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 w-36">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    setIsRenaming(true)
                    setRenameValue(column.title)
                  }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
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
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
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
      <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-2 min-h-0">
        {columnCards.map((card) => (
          <Card key={card.id} card={card} onClick={onCardClick} />
        ))}
      </div>

      {/* Add card form */}
      <div className="px-3 pb-3">
        {isAdding ? (
          <div className="space-y-2">
            <input
              ref={inputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleAddKeyDown}
              onBlur={handleAdd}
              placeholder="Card title..."
              className="w-full text-sm bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAdd}
                className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Add card
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewTitle('')
                  setIsAdding(false)
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
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg px-2 py-1.5 w-full transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add a card
          </button>
        )}
      </div>
    </div>
  )
}
