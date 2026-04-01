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
  Briefcase,
  Star,
} from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { useWorkspaceStore } from '../../store/workspaceStore'
import DynamicIcon from '../board/DynamicIcon'
import IconPicker from '../board/IconPicker'
import ConfirmModal from '../board/ConfirmModal'

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
  { to: '/notes', icon: StickyNote, label: 'Notes' },
]

export default function Sidebar() {
  const invitationCount = useWorkspaceStore((s) => s.invitations.length)
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed)
  const toggle = useSettingsStore((s) => s.toggleSidebar)
  const mobileMenuOpen = useSettingsStore((s) => s.mobileMenuOpen)
  const closeMobileMenu = useSettingsStore((s) => s.closeMobileMenu)
  const isDesktop = useIsDesktop()
  const user = useAuthStore((s) => s.user)
  const allBoards = useBoardStore((s) => s.boards)
  const activeBoardId = useBoardStore((s) => s.activeBoardId)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
  const addBoard = useBoardStore((s) => s.addBoard)
  const deleteBoard = useBoardStore((s) => s.deleteBoard)
  const renameBoard = useBoardStore((s) => s.renameBoard)
  const updateBoardIcon = useBoardStore((s) => s.updateBoardIcon)
  const location = useLocation()
  const navigate = useNavigate()

  const sharedBoards = useWorkspaceStore((s) => s.sharedBoards)
  const [boardsOpen, setBoardsOpen] = useState(true)
  const [workspaceOpen, setWorkspaceOpen] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [iconPickerBoardId, setIconPickerBoardId] = useState(null)
  const [renamingBoardId, setRenamingBoardId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDeleteBoardId, setConfirmDeleteBoardId] = useState(null)

  const favoriteBoards = useSettingsStore((s) => s.favoriteBoards)
  const toggleFavorite = useSettingsStore((s) => s.toggleFavorite)

  // Only show boards the user owns in the Boards dropdown (shared boards go under Workspace)
  const ownedBoards = Object.fromEntries(
    Object.entries(allBoards).filter(([, b]) => b.owner_id === user?.id)
  )

  // Sort boards: favorites first, then the rest
  const sortedOwnedBoards = Object.values(ownedBoards).sort((a, b) => {
    const aFav = favoriteBoards.includes(a.id)
    const bFav = favoriteBoards.includes(b.id)
    if (aFav && !bFav) return -1
    if (!aFav && bFav) return 1
    return 0
  })

  const isBoardsActive = location.pathname.startsWith('/boards')

  const [savingBoard, setSavingBoard] = useState(false)

  const handleCreate = async () => {
    if (!newName.trim() || savingBoard) return
    setSavingBoard(true)
    await addBoard(newName.trim())
    setSavingBoard(false)
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
    setConfirmDeleteBoardId(boardId)
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
        className={`fixed top-0 left-0 h-screen bg-[#FAF8F6] border-r border-[#E0DBD5] flex flex-col transition-all duration-200 z-40 ${
          isDesktop
            ? collapsed
              ? 'w-16'
              : 'w-60'
            : `w-60 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`
        }`}
      >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-16 border-b border-[#E0DBD5]">
        <GambitLogo />
        {!showCollapsed && (
          <span className="text-lg font-bold text-[#1B1B18] tracking-tight font-heading">
            Gambit
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {/* Dashboard */}
        <NavLink
          to="/dashboard"
          onClick={closeMobileMenu}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-[#EEF2D6] text-[#1B1B18]'
                : 'text-[#5C5C57] hover:bg-[#E8E2DB]'
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
                  ? 'bg-[#EEF2D6] text-[#1B1B18]'
                  : 'text-[#5C5C57] hover:bg-[#E8E2DB]'
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
                  ? 'bg-[#EEF2D6] text-[#1B1B18]'
                  : 'text-[#5C5C57] hover:bg-[#E8E2DB]'
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
              <div className="ml-5 mt-1 pl-3 border-l border-[#E0DBD5] space-y-0.5">
                {/* All Tasks — permanent entry */}
                <div
                  onClick={() => handleSelectBoard('__all__')}
                  className={`flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-sm transition-colors group cursor-pointer ${
                    isBoardsActive && activeBoardId === '__all__'
                      ? 'text-[#1B1B18] font-medium bg-[#EEF2D6]'
                      : 'text-[#5C5C57] hover:text-[#1B1B18] hover:bg-[#E8E2DB]'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Layers className="w-4 h-4 text-[#8E8E89] shrink-0" />
                    <span className="truncate">All Tasks</span>
                  </span>
                </div>

                {sortedOwnedBoards.map((board) => {
                  const isFav = favoriteBoards.includes(board.id)
                  return (
                    <div
                      key={board.id}
                      onClick={() => handleSelectBoard(board.id)}
                      className={`flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-sm transition-colors group cursor-pointer relative ${
                        isBoardsActive && activeBoardId === board.id
                          ? 'text-[#1B1B18] font-medium bg-[#EEF2D6]'
                          : 'text-[#5C5C57] hover:text-[#1B1B18] hover:bg-[#E8E2DB]'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setIconPickerBoardId(iconPickerBoardId === board.id ? null : board.id)
                          }}
                          className="shrink-0 hover:bg-[#E0DBD5] rounded p-0.5 transition-colors"
                          title="Change icon"
                        >
                          {board.icon ? (
                            <DynamicIcon name={board.icon} className="w-4 h-4 text-[#8E8E89]" />
                          ) : (
                            <Kanban className="w-4 h-4 text-[#8E8E89]" />
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
                            className="flex-1 text-sm bg-white border border-[#C2D64A] rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#EEF2D6] min-w-0"
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
                      <span className="flex items-center gap-0.5 shrink-0">
                        <Star
                          className={`w-3.5 h-3.5 transition-all cursor-pointer ${
                            isFav
                              ? 'text-[#D4A843] fill-[#D4A843]'
                              : 'text-[#8E8E89] opacity-0 group-hover:opacity-100 hover:text-[#D4A843]'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavorite(board.id)
                          }}
                        />
                        {Object.keys(ownedBoards).length > 1 && (
                          <Trash2
                            className="w-3.5 h-3.5 text-[#8E8E89] hover:text-[#7A5C44] opacity-0 group-hover:opacity-100 shrink-0"
                            onClick={(e) => handleDeleteBoard(e, board.id)}
                          />
                        )}
                      </span>
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
                  )
                })}

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
                      className="w-full px-2 py-1 text-sm rounded-md border border-[#E0DBD5] focus:border-[#C2D64A] focus:outline-none focus:ring-1 focus:ring-[#EEF2D6]"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setCreating(true)}
                    className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-sm text-[#8E8E89] hover:text-[#1B1B18] hover:bg-[#E8E2DB] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New board</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Workspace with dropdown */}
        {showCollapsed ? (
          <NavLink
            to="/workspace"
            className={({ isActive }) =>
              `flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#EEF2D6] text-[#1B1B18]'
                  : 'text-[#5C5C57] hover:bg-[#E8E2DB]'
              }`
            }
          >
            <span className="relative">
              <Users className="w-5 h-5 shrink-0" />
              {invitationCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#C2D64A] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {invitationCount > 9 ? '9+' : invitationCount}
                </span>
              )}
            </span>
          </NavLink>
        ) : (
          <div>
            <button
              onClick={() => setWorkspaceOpen(!workspaceOpen)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full ${
                location.pathname.startsWith('/workspace')
                  ? 'bg-[#EEF2D6] text-[#1B1B18]'
                  : 'text-[#5C5C57] hover:bg-[#E8E2DB]'
              }`}
            >
              <span className="relative">
                <Users className="w-5 h-5 shrink-0" />
                {invitationCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-[#C2D64A] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {invitationCount > 9 ? '9+' : invitationCount}
                  </span>
                )}
              </span>
              <span className="flex-1 text-left">Workspace</span>
              {workspaceOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {workspaceOpen && (
              <div className="ml-5 mt-1 pl-3 border-l border-[#E0DBD5] space-y-0.5">
                {/* Invitations link */}
                <div
                  onClick={() => { navigate('/workspace'); closeMobileMenu() }}
                  className={`flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${
                    location.pathname === '/workspace' && !activeBoardId?.startsWith('ws_')
                      ? 'text-[#1B1B18] font-medium bg-[#EEF2D6]'
                      : 'text-[#5C5C57] hover:text-[#1B1B18] hover:bg-[#E8E2DB]'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Briefcase className="w-4 h-4 text-[#8E8E89] shrink-0" />
                    <span className="truncate">Overview</span>
                  </span>
                  {invitationCount > 0 && (
                    <span className="text-[10px] font-semibold bg-[#EEF2D6] text-[#A8BA32] px-1.5 py-0.5 rounded-full">
                      {invitationCount}
                    </span>
                  )}
                </div>

                {/* Shared boards */}
                {sharedBoards.map((board) => (
                  <div
                    key={board.id}
                    onClick={() => { setActiveBoard(board.id); navigate('/boards'); closeMobileMenu() }}
                    className={`flex items-center w-full px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${
                      isBoardsActive && activeBoardId === board.id
                        ? 'text-[#1B1B18] font-medium bg-[#EEF2D6]'
                        : 'text-[#5C5C57] hover:text-[#1B1B18] hover:bg-[#E8E2DB]'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      {board.icon ? (
                        <DynamicIcon name={board.icon} className="w-4 h-4 text-[#8E8E89] shrink-0" />
                      ) : (
                        <Kanban className="w-4 h-4 text-[#8E8E89] shrink-0" />
                      )}
                      <span className="truncate">{board.name}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Other nav items */}
        {navItems.slice(1).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={closeMobileMenu}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#EEF2D6] text-[#1B1B18]'
                  : 'text-[#5C5C57] hover:bg-[#E8E2DB]'
              } ${showCollapsed ? 'justify-center' : ''}`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!showCollapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-[#E0DBD5] py-4 px-2 space-y-1">
        <NavLink
          to="/settings"
          onClick={closeMobileMenu}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-[#EEF2D6] text-[#1B1B18]'
                : 'text-[#5C5C57] hover:bg-[#E8E2DB]'
            } ${showCollapsed ? 'justify-center' : ''}`
          }
        >
          <Settings className="w-5 h-5 shrink-0" />
          {!showCollapsed && <span>Settings</span>}
        </NavLink>

        {isDesktop && (
          <button
            onClick={toggle}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#5C5C57] hover:bg-[#E8E2DB] transition-colors w-full ${
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

    {confirmDeleteBoardId && (
      <ConfirmModal
        title="Delete board"
        message="This will permanently delete the board and all its tasks."
        onConfirm={() => {
          deleteBoard(confirmDeleteBoardId)
          setConfirmDeleteBoardId(null)
        }}
        onCancel={() => setConfirmDeleteBoardId(null)}
      />
    )}
    </>
  )
}
