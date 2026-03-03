import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard,
  Kanban,
  Calendar,
  StickyNote,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Layers,
  Users,
} from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import { useBoardStore } from '../../store/boardStore'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { useWorkspaceStore } from '../../store/workspaceStore'
import DynamicIcon from '../board/DynamicIcon'
import IconPicker from '../board/IconPicker'

function GambitLogo({ size = 28 }) {
  return (
    <span
      className="material-symbols-outlined text-black shrink-0"
      style={{
        fontSize: `${size}px`,
        lineHeight: `${size}px`,
        fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
      }}
    >
      owl
    </span>
  )
}

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/workspace', icon: Users, label: 'Workspace', badge: true },
  { to: '/notes', icon: StickyNote, label: 'Notes' },
]

export default function Sidebar() {
  const invitationCount = useWorkspaceStore((s) => s.invitations.length)
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed)
  const toggle = useSettingsStore((s) => s.toggleSidebar)
  const mobileMenuOpen = useSettingsStore((s) => s.mobileMenuOpen)
  const closeMobileMenu = useSettingsStore((s) => s.closeMobileMenu)
  const isDesktop = useIsDesktop()
  const boards = useBoardStore((s) => s.boards)
  const activeBoardId = useBoardStore((s) => s.activeBoardId)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
  const addBoard = useBoardStore((s) => s.addBoard)
  const deleteBoard = useBoardStore((s) => s.deleteBoard)
  const renameBoard = useBoardStore((s) => s.renameBoard)
  const updateBoardIcon = useBoardStore((s) => s.updateBoardIcon)
  const location = useLocation()
  const navigate = useNavigate()

  const [boardsOpen, setBoardsOpen] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [iconPickerBoardId, setIconPickerBoardId] = useState(null)
  const [renamingBoardId, setRenamingBoardId] = useState(null)
  const [renameValue, setRenameValue] = useState('')

  const isBoardsActive = location.pathname.startsWith('/boards')

  const handleCreate = () => {
    if (!newName.trim()) return
    addBoard(newName.trim())
    setNewName('')
    setCreating(false)
    navigate('/boards')
  }

  const handleSelectBoard = (boardId) => {
    setActiveBoard(boardId)
    navigate('/boards')
    closeMobileMenu()
  }

  const handleDeleteBoard = (e, boardId) => {
    e.stopPropagation()
    deleteBoard(boardId)
  }

  // On mobile, sidebar is always expanded (w-60) since collapse toggle is hidden
  const showCollapsed = isDesktop && collapsed

  return (
    <>
      {/* Backdrop for mobile drawer */}
      {!isDesktop && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 transition-opacity"
          onClick={closeMobileMenu}
        />
      )}
      <aside
        className={`fixed top-0 left-0 h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-200 z-40 ${
          isDesktop
            ? collapsed
              ? 'w-16'
              : 'w-60'
            : `w-60 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`
        }`}
      >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-16 border-b border-gray-200">
        <GambitLogo />
        {!showCollapsed && (
          <span className="text-lg font-bold text-gray-900 tracking-tight">
            Gambit
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {/* Dashboard */}
        <NavLink
          to="/"
          end
          onClick={closeMobileMenu}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-50 text-gray-900'
                : 'text-gray-600 hover:bg-gray-100'
            } ${showCollapsed ? 'justify-center' : ''}`
          }
        >
          <LayoutDashboard className="w-5 h-5 shrink-0" />
          {!showCollapsed && <span>Dashboard</span>}
        </NavLink>

        {/* Boards with dropdown */}
        {showCollapsed ? (
          <NavLink
            to="/boards"
            className={({ isActive }) =>
              `flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <Kanban className="w-5 h-5 shrink-0" />
          </NavLink>
        ) : (
          <div>
            <button
              onClick={() => setBoardsOpen(!boardsOpen)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full ${
                isBoardsActive
                  ? 'bg-blue-50 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Kanban className="w-5 h-5 shrink-0" />
              <span className="flex-1 text-left">Boards</span>
              {boardsOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {boardsOpen && (
              <div className="ml-5 mt-1 pl-3 border-l border-gray-200 space-y-0.5">
                {/* All Tasks — permanent entry */}
                <div
                  onClick={() => handleSelectBoard('__all__')}
                  className={`flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-sm transition-colors group cursor-pointer ${
                    isBoardsActive && activeBoardId === '__all__'
                      ? 'text-gray-900 font-medium bg-blue-50'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Layers className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate">All Tasks</span>
                  </span>
                </div>

                {Object.values(boards).map((board) => (
                  <div
                    key={board.id}
                    onClick={() => handleSelectBoard(board.id)}
                    className={`flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-sm transition-colors group cursor-pointer relative ${
                      isBoardsActive && activeBoardId === board.id
                        ? 'text-gray-900 font-medium bg-blue-50'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setIconPickerBoardId(iconPickerBoardId === board.id ? null : board.id)
                        }}
                        className="shrink-0 hover:bg-gray-200 rounded p-0.5 transition-colors"
                        title="Change icon"
                      >
                        {board.icon ? (
                          <DynamicIcon name={board.icon} className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Kanban className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      {renamingBoardId === board.id ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const trimmed = renameValue.trim()
                              if (trimmed) renameBoard(board.id, trimmed)
                              setRenamingBoardId(null)
                            } else if (e.key === 'Escape') {
                              setRenamingBoardId(null)
                            }
                          }}
                          onBlur={() => {
                            const trimmed = renameValue.trim()
                            if (trimmed) renameBoard(board.id, trimmed)
                            setRenamingBoardId(null)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 text-sm bg-white border border-blue-400 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-100 min-w-0"
                        />
                      ) : (
                        <span
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            setRenamingBoardId(board.id)
                            setRenameValue(board.name)
                          }}
                          className="truncate"
                        >
                          {board.name}
                        </span>
                      )}
                    </span>
                    {Object.keys(boards).length > 1 && (
                      <Trash2
                        className="w-3.5 h-3.5 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 shrink-0"
                        onClick={(e) => handleDeleteBoard(e, board.id)}
                      />
                    )}
                    {iconPickerBoardId === board.id && (
                      <div className="absolute left-0 top-full z-40" onClick={(e) => e.stopPropagation()}>
                        <IconPicker
                          value={board.icon}
                          onChange={(icon) => updateBoardIcon(board.id, icon)}
                          onClose={() => setIconPickerBoardId(null)}
                        />
                      </div>
                    )}
                  </div>
                ))}

                {creating ? (
                  <div className="px-1 py-1">
                    <input
                      autoFocus
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreate()
                        if (e.key === 'Escape') {
                          setCreating(false)
                          setNewName('')
                        }
                      }}
                      onBlur={() => {
                        if (!newName.trim()) {
                          setCreating(false)
                          setNewName('')
                        }
                      }}
                      placeholder="Board name..."
                      className="w-full px-2 py-1 text-sm rounded-md border border-gray-200 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setCreating(true)}
                    className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New board</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Other nav items */}
        {navItems.slice(1).map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            onClick={closeMobileMenu}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-100'
              } ${showCollapsed ? 'justify-center' : ''}`
            }
          >
            <span className="relative">
              <Icon className="w-5 h-5 shrink-0" />
              {badge && invitationCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {invitationCount > 9 ? '9+' : invitationCount}
                </span>
              )}
            </span>
            {!showCollapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-gray-200 py-4 px-2 space-y-1">
        <NavLink
          to="/settings"
          onClick={closeMobileMenu}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-50 text-gray-900'
                : 'text-gray-600 hover:bg-gray-100'
            } ${showCollapsed ? 'justify-center' : ''}`
          }
        >
          <Settings className="w-5 h-5 shrink-0" />
          {!showCollapsed && <span>Settings</span>}
        </NavLink>

        {isDesktop && (
          <button
            onClick={toggle}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors w-full ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            {collapsed ? (
              <ChevronsRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronsLeft className="w-5 h-5" />
                <span>Collapse</span>
              </>
            )}
          </button>
        )}
      </div>
    </aside>
    </>
  )
}
