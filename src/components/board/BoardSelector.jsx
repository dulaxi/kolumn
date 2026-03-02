import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, LayoutGrid, Layers, Users } from 'lucide-react'
import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import DynamicIcon from './DynamicIcon'
import IconPicker from './IconPicker'
import BoardShareModal from './BoardShareModal'

export default function BoardSelector() {
  const [open, setOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState(null)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const dropdownRef = useRef(null)
  const createInputRef = useRef(null)

  const boards = useBoardStore((s) => s.boards)
  const activeBoardId = useBoardStore((s) => s.activeBoardId)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
  const addBoard = useBoardStore((s) => s.addBoard)
  const user = useAuthStore((s) => s.user)

  const boardList = Object.values(boards)
  const activeBoard = boards[activeBoardId]
  const isOwner = activeBoard && user && activeBoard.owner_id === user.id

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
      <div className="flex items-center gap-2">
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <span className="w-5 h-5 flex items-center justify-center text-gray-400">
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
              className={`w-4 h-4 text-gray-500 transition-transform ${
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
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="w-5 h-5 flex items-center justify-center text-gray-400 shrink-0">
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
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span className="w-5 h-5 flex items-center justify-center text-gray-400 shrink-0">
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
                          className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors shrink-0"
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
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-900"
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
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Users className="w-4 h-4" />
            Share
          </button>
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
