import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  Kanban,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Layers,
  Briefcase,
  GripVertical,
} from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import { useIsDesktop, useMediaQuery } from '../../hooks/useMediaQuery'
import { useBoardSharingStore } from '../../store/boardSharingStore'
import { useWorkspacesStore } from '../../store/workspacesStore'
import { Kanban as PhosphorKanban, SidebarSimple, ChatsCircle, MagnifyingGlass, CalendarDots, Notepad, UsersThree } from '@phosphor-icons/react'
import DynamicIcon from '../board/DynamicIcon'
import IconPicker from '../board/IconPicker'
import ConfirmModal from '../board/ConfirmModal'

function KolumnLogo({ size = 30 }) {
  return <PhosphorKanban size={size} weight="fill" className="shrink-0 text-[#8BA32E]" />
}


export default function Sidebar() {
  const boardInvitationCount = useBoardSharingStore((s) => s.invitations.length)
  const workspaceInvitationCount = useWorkspacesStore((s) => s.invitations.length)
  const invitationCount = boardInvitationCount + workspaceInvitationCount
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed)
  const toggle = useSettingsStore((s) => s.toggleSidebar)
  const setSidebarCollapsed = useSettingsStore((s) => s.setSidebarCollapsed)
  const mobileMenuOpen = useSettingsStore((s) => s.mobileMenuOpen)
  const closeMobileMenu = useSettingsStore((s) => s.closeMobileMenu)
  const toggleWorkspaceSidebar = useSettingsStore((s) => s.toggleWorkspaceSidebar)
  const workspaceSidebarOpen = useSettingsStore((s) => s.workspaceSidebarOpen)
  const isDesktop = useIsDesktop()
  const isWide = useMediaQuery('(min-width: 1280px)')

  // Auto-collapse on narrow desktop viewports (1024–1280px)
  // Skip when workspace sub-sidebar is open — it owns the collapsed state in that case.
  useEffect(() => {
    if (isDesktop && !workspaceSidebarOpen) setSidebarCollapsed(!isWide)
  }, [isDesktop, isWide, workspaceSidebarOpen, setSidebarCollapsed])
  const user = useAuthStore((s) => s.user)
  const allBoards = useBoardStore((s) => s.boards)
  const activeBoardId = useBoardStore((s) => s.activeBoardId)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
  const deleteBoard = useBoardStore((s) => s.deleteBoard)
  const renameBoard = useBoardStore((s) => s.renameBoard)
  const updateBoardIcon = useBoardStore((s) => s.updateBoardIcon)
  const location = useLocation()
  const navigate = useNavigate()

  const sharedBoards = useBoardSharingStore((s) => s.sharedBoards)
  const [boardsOpen, setBoardsOpen] = useState(true)
  const [workspaceOpen, setWorkspaceOpen] = useState(true)
  const [iconPickerBoardId, setIconPickerBoardId] = useState(null)
  const [renamingBoardId, setRenamingBoardId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDeleteBoardId, setConfirmDeleteBoardId] = useState(null)

  // "Boards" section = personal boards only (owned by me, not tied to a workspace).
  // Workspace boards live under the Spaces section below.
  const workspaces = useWorkspacesStore((s) => s.workspaces)
  const setActiveWorkspace = useWorkspacesStore((s) => s.setActiveWorkspace)
  const collapsedSpaces = useSettingsStore((s) => s.collapsedSpaces)
  const toggleSpaceCollapsed = useSettingsStore((s) => s.toggleSpaceCollapsed)
  const boardsCollapsed = useSettingsStore((s) => s.boardsCollapsed)
  const toggleBoardsCollapsed = useSettingsStore((s) => s.toggleBoardsCollapsed)
  const sharedBoardsCollapsed = useSettingsStore((s) => s.sharedBoardsCollapsed)
  const toggleSharedBoardsCollapsed = useSettingsStore((s) => s.toggleSharedBoardsCollapsed)
  const personalBoards = Object.values(allBoards).filter(
    (b) => b.owner_id === user?.id && !b.workspace_id,
  )
  const sortedOwnedBoards = personalBoards
  const workspaceList = Object.values(workspaces)

  const isBoardsActive = location.pathname.startsWith('/boards')

  const handleSelectBoard = (boardId) => {
    setActiveBoard(boardId)
    navigate('/boards')
    closeMobileMenu()
  }

  const handleDeleteBoard = (e, boardId) => {
    e.stopPropagation()
    setConfirmDeleteBoardId(boardId)
  }

  // On mobile, sidebar is always expanded (w-[287px]) since collapse toggle is hidden
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
        className={`fixed top-0 left-0 h-screen bg-[var(--surface-sidebar)] border-r border-[var(--border-default)] flex flex-col transition-all duration-200 z-40 ${
          isDesktop
            ? collapsed
              ? 'w-12'
              : 'w-[287px]'
            : `w-[287px] ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`
        }`}
      >
      {/* Logo — clicks to Home */}
      <div className={`flex items-center ${showCollapsed ? 'justify-center px-1 h-12' : 'gap-2 px-4 h-16'}`}>
        <button
          type="button"
          onClick={() => { closeMobileMenu(); navigate('/dashboard') }}
          aria-label="Go to Home"
          className="flex items-center gap-2 cursor-pointer"
        >
          <KolumnLogo size={showCollapsed ? 22 : 30} />
          {!showCollapsed && (
            <span className="text-[23px] font-[450] text-[var(--text-primary)] tracking-tight leading-none font-logo">
              Kolumn
            </span>
          )}
        </button>
      </div>

      {/* Nav items */}
      <nav className={`flex-1 pt-2 overflow-y-auto ${showCollapsed ? 'px-1' : 'px-2'}`}>
        {/* ── Flat top nav ── */}
        <div className="flex flex-col gap-px">
          {/* Search */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('kolumn:focus-search'))}
            title={showCollapsed ? 'Search' : undefined}
            className={`flex items-center h-8 rounded-lg text-sm transition-colors duration-75 overflow-hidden text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:bg-[var(--surface-hover)] ${showCollapsed ? 'justify-center px-2' : 'gap-3 py-1.5 px-4'}`}
          >
            <span className="relative flex items-center justify-center" style={{ width: 16, height: 16 }}>
              <MagnifyingGlass size={16} weight="regular" className="shrink-0" />
            </span>
            {!showCollapsed && <span className="truncate flex-1 text-left">Search</span>}
          </button>

          {/* Chat */}
          <NavLink
            to="/chat"
            onClick={closeMobileMenu}
            title={showCollapsed ? 'Chat' : undefined}
            className={({ isActive }) =>
              `flex items-center h-8 rounded-lg text-sm transition-colors duration-75 overflow-hidden ${
                isActive || location.pathname.startsWith('/chat')
                  ? 'bg-[var(--accent-lime-wash)] text-[var(--text-primary)]'
                  : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:bg-[var(--surface-hover)]'
              } ${showCollapsed ? 'justify-center px-2' : 'gap-3 py-1.5 px-4'}`
            }
          >
            <span className="relative flex items-center justify-center" style={{ width: 16, height: 16 }}>
              <ChatsCircle size={16} weight="regular" className="shrink-0" />
            </span>
            {!showCollapsed && <span className="truncate flex-1">Chats</span>}
          </NavLink>

          {[
            { to: '/calendar', icon: CalendarDots, label: 'Calendar' },
            { to: '/notes', icon: Notepad, label: 'Notes' },
          ].map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeMobileMenu}
              title={showCollapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center h-8 rounded-lg text-sm transition-colors duration-75 overflow-hidden ${
                  isActive
                    ? 'bg-[var(--accent-lime-wash)] text-[var(--text-primary)]'
                    : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:bg-[var(--surface-hover)]'
                } ${showCollapsed ? 'justify-center px-2' : 'gap-3 py-1.5 px-4'}`
              }
            >
              <span className="relative flex items-center justify-center" style={{ width: 16, height: 16 }}>
                <Icon className="w-4 h-4 shrink-0" />
              </span>
              {!showCollapsed && <span className="truncate flex-1">{label}</span>}
            </NavLink>
          ))}

          {/* Workspace — toggles sub-sidebar + navigates to /workspace on desktop */}
          {isDesktop ? (
            <button
              type="button"
              onClick={() => {
                toggleWorkspaceSidebar()
                if (!workspaceSidebarOpen) {
                  // Always land on the workspace index (no workspace selected)
                  useWorkspacesStore.getState().setActiveWorkspace(null)
                  navigate('/workspace')
                }
              }}
              title={showCollapsed ? 'Workspace' : undefined}
              className={`flex items-center h-8 rounded-lg text-sm transition-colors duration-75 overflow-hidden ${
                workspaceSidebarOpen || location.pathname === '/workspace'
                  ? 'bg-[var(--accent-lime-wash)] text-[var(--text-primary)]'
                  : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:bg-[var(--surface-hover)]'
              } ${showCollapsed ? 'justify-center px-2 w-full' : 'gap-3 py-1.5 px-4 w-full'}`}
            >
              <span className="relative flex items-center justify-center" style={{ width: 16, height: 16 }}>
                <UsersThree className="w-4 h-4 shrink-0" />
                {showCollapsed && invitationCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-[#C2D64A] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {invitationCount > 9 ? '9+' : invitationCount}
                  </span>
                )}
              </span>
              {!showCollapsed && (
                <>
                  <span className="truncate flex-1 text-left">Workspace</span>
                  {invitationCount > 0 && (
                    <span className="text-[10px] font-semibold bg-[var(--surface-hover)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded-full">
                      {invitationCount}
                    </span>
                  )}
                </>
              )}
            </button>
          ) : (
            <NavLink
              to="/workspace"
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `flex items-center h-8 rounded-lg text-sm transition-colors duration-75 overflow-hidden ${
                  isActive
                    ? 'bg-[var(--accent-lime-wash)] text-[var(--text-primary)]'
                    : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:bg-[var(--surface-hover)]'
                } gap-3 py-1.5 px-4`
              }
            >
              <span className="relative flex items-center justify-center" style={{ width: 16, height: 16 }}>
                <UsersThree className="w-4 h-4 shrink-0" />
              </span>
              <span className="truncate flex-1">Workspace</span>
              {invitationCount > 0 && (
                <span className="text-[10px] font-semibold bg-[var(--surface-hover)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded-full">
                  {invitationCount}
                </span>
              )}
            </NavLink>
          )}
        </div>

        {/* ── Boards section ── */}
        {!showCollapsed && (
          <div className="pt-4">
            <div
              role="button"
              tabIndex={0}
              aria-expanded={!boardsCollapsed}
              onClick={toggleBoardsCollapsed}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleBoardsCollapsed() }
              }}
              className="flex items-center justify-between gap-2 px-4 mb-px group/boards cursor-pointer select-none"
              title={boardsCollapsed ? 'Show boards' : 'Hide boards'}
            >
              <span className="text-xs text-[var(--text-muted)] truncate">Boards</span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-[var(--text-faint)] opacity-0 group-hover/boards:opacity-75 transition-opacity">
                  {boardsCollapsed ? 'Show' : 'Hide'}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate('/boards')
                    let attempts = 0
                    let handled = false
                    const onHandled = () => { handled = true }
                    window.addEventListener('kolumn:create-board-ack', onHandled, { once: true })
                    const tryDispatch = () => {
                      if (handled) { window.removeEventListener('kolumn:create-board-ack', onHandled); return }
                      window.dispatchEvent(new CustomEvent('kolumn:create-board'))
                      if (++attempts < 10) setTimeout(tryDispatch, 100)
                    }
                    setTimeout(tryDispatch, 50)
                    closeMobileMenu()
                  }}
                  className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                  title="New board"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </span>
            </div>

            <div className={`flex flex-col gap-px ${boardsCollapsed ? 'hidden' : ''}`}>
              {/* Owned boards */}
              {sortedOwnedBoards.map((board) => (
                <div
                  key={board.id}
                  onClick={() => handleSelectBoard(board.id)}
                  className={`flex items-center justify-between w-full h-8 py-1.5 px-4 rounded-lg text-sm transition-colors duration-75 group cursor-pointer relative overflow-hidden ${
                    isBoardsActive && activeBoardId === board.id
                      ? 'text-[var(--text-primary)] bg-[var(--accent-lime-wash)]'
                      : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:bg-[var(--surface-hover)]'
                  }`}
                >
                  <span className="flex items-center gap-3 truncate">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setIconPickerBoardId(iconPickerBoardId === board.id ? null : board.id)
                      }}
                      className="shrink-0 hover:bg-[var(--border-default)] rounded p-0.5 transition-colors flex items-center justify-center"
                      style={{ width: 16, height: 16 }}
                      title="Change icon"
                    >
                      {board.icon ? (
                        <DynamicIcon name={board.icon} className={`w-4 h-4 ${isBoardsActive && activeBoardId === board.id ? 'text-[#8BA32E]' : 'text-[var(--text-muted)]'}`} />
                      ) : (
                        <Kanban className={`w-4 h-4 ${isBoardsActive && activeBoardId === board.id ? 'text-[#8BA32E]' : 'text-[var(--text-muted)]'}`} />
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
                        className="flex-1 text-sm bg-[var(--surface-card)] border border-[var(--border-default)] rounded px-1.5 py-0.5 focus:outline-none focus:border-[var(--text-primary)] min-w-0"
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
                    <Trash2
                      role="button"
                      aria-label={`Delete board ${board.name}`}
                      className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-[#7A5C44] opacity-0 group-hover:opacity-100 shrink-0"
                      onClick={(e) => handleDeleteBoard(e, board.id)}
                    />
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
              ))}
            </div>
          </div>
        )}

        {/* ── Workspaces: each workspace name is its own small subheading ── */}
        {!showCollapsed && workspaceList.map((ws) => {
          const wsBoards = Object.values(allBoards).filter((b) => b.workspace_id === ws.id)
          const isCollapsed = !!collapsedSpaces[ws.id]
          return (
            <div key={ws.id}>
              <div
                role="button"
                tabIndex={0}
                aria-expanded={!isCollapsed}
                onClick={() => toggleSpaceCollapsed(ws.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSpaceCollapsed(ws.id) }
                }}
                className="flex items-center justify-between gap-2 px-4 pt-4 mb-px group/ws cursor-pointer select-none"
                title={isCollapsed ? `Show ${ws.name} boards` : `Hide ${ws.name} boards`}
              >
                <span className="text-xs text-[var(--text-muted)] truncate">
                  {ws.name}
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-[var(--text-faint)] opacity-0 group-hover/ws:opacity-75 transition-opacity">
                    {isCollapsed ? 'Show' : 'Hide'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate('/boards')
                      let attempts = 0
                      let handled = false
                      const onHandled = () => { handled = true }
                      window.addEventListener('kolumn:create-board-ack', onHandled, { once: true })
                      const tryDispatch = () => {
                        if (handled) { window.removeEventListener('kolumn:create-board-ack', onHandled); return }
                        window.dispatchEvent(new CustomEvent('kolumn:create-board', { detail: { workspaceId: ws.id } }))
                        if (++attempts < 10) setTimeout(tryDispatch, 100)
                      }
                      setTimeout(tryDispatch, 50)
                      closeMobileMenu()
                    }}
                    className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                    title={`New board in ${ws.name}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </span>
              </div>

              <div className={`flex flex-col gap-px ${isCollapsed ? 'hidden' : ''}`}>
                {wsBoards.map((board) => {
                  const canDelete = board.owner_id === user?.id
                  // Workspace-board owner can change the icon, same as for personal boards.
                  // Non-owners see a static icon glyph (no click affordance).
                  return (
                    <div
                      key={board.id}
                      onClick={() => handleSelectBoard(board.id)}
                      className={`flex items-center justify-between w-full h-8 py-1.5 px-4 rounded-lg text-sm transition-colors duration-75 group cursor-pointer overflow-hidden relative ${
                        isBoardsActive && activeBoardId === board.id
                          ? 'text-[var(--text-primary)] bg-[var(--accent-lime-wash)]'
                          : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      <span className="flex items-center gap-3 truncate">
                        {canDelete ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setIconPickerBoardId(iconPickerBoardId === board.id ? null : board.id)
                            }}
                            className="shrink-0 hover:bg-[var(--border-default)] rounded p-0.5 transition-colors flex items-center justify-center"
                            style={{ width: 16, height: 16 }}
                            title="Change icon"
                          >
                            {board.icon ? (
                              <DynamicIcon name={board.icon} className={`w-4 h-4 ${isBoardsActive && activeBoardId === board.id ? 'text-[#8BA32E]' : 'text-[var(--text-muted)]'}`} />
                            ) : (
                              <Kanban className={`w-4 h-4 ${isBoardsActive && activeBoardId === board.id ? 'text-[#8BA32E]' : 'text-[var(--text-muted)]'}`} />
                            )}
                          </button>
                        ) : (
                          <span className="flex items-center justify-center shrink-0" style={{ width: 16, height: 16 }}>
                            {board.icon ? (
                              <DynamicIcon name={board.icon} className={`w-4 h-4 ${isBoardsActive && activeBoardId === board.id ? 'text-[#8BA32E]' : 'text-[var(--text-muted)]'}`} />
                            ) : (
                              <Kanban className={`w-4 h-4 ${isBoardsActive && activeBoardId === board.id ? 'text-[#8BA32E]' : 'text-[var(--text-muted)]'}`} />
                            )}
                          </span>
                        )}
                        <span className="truncate">{board.name}</span>
                      </span>
                      {canDelete && (
                        <span className="flex items-center gap-0.5 shrink-0">
                          <Trash2
                            role="button"
                            aria-label={`Delete board ${board.name}`}
                            className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-[#7A5C44] opacity-0 group-hover:opacity-100 shrink-0"
                            onClick={(e) => handleDeleteBoard(e, board.id)}
                          />
                        </span>
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
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* ── Shared with me (always at the bottom) ── */}
        {!showCollapsed && sharedBoards.length > 0 && (
          <div className="pt-4">
            <div
              role="button"
              tabIndex={0}
              aria-expanded={!sharedBoardsCollapsed}
              onClick={toggleSharedBoardsCollapsed}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSharedBoardsCollapsed() }
              }}
              className="flex items-center justify-between gap-2 px-4 mb-px group/shared cursor-pointer select-none"
              title={sharedBoardsCollapsed ? 'Show shared boards' : 'Hide shared boards'}
            >
              <span className="text-xs text-[var(--text-muted)] truncate">Shared with me</span>
              <span className="text-xs text-[var(--text-faint)] opacity-0 group-hover/shared:opacity-75 transition-opacity">
                {sharedBoardsCollapsed ? 'Show' : 'Hide'}
              </span>
            </div>
            <div className={`flex flex-col gap-px ${sharedBoardsCollapsed ? 'hidden' : ''}`}>
              {sharedBoards.map((board) => (
                <div
                  key={board.id}
                  onClick={() => { setActiveBoard(board.id); navigate('/boards'); closeMobileMenu() }}
                  className={`flex items-center w-full h-8 py-1.5 px-4 rounded-lg text-sm transition-colors duration-75 cursor-pointer overflow-hidden ${
                    isBoardsActive && activeBoardId === board.id
                      ? 'text-[var(--text-primary)] bg-[var(--accent-lime-wash)]'
                      : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:bg-[var(--surface-hover)]'
                  }`}
                >
                  <span className="flex items-center gap-3 truncate">
                    <span className="flex items-center justify-center shrink-0" style={{ width: 16, height: 16 }}>
                      {board.icon ? (
                        <DynamicIcon name={board.icon} className="w-4 h-4 text-[var(--text-muted)]" />
                      ) : (
                        <Kanban className="w-4 h-4 text-[var(--text-muted)]" />
                      )}
                    </span>
                    <span className="truncate">{board.name}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collapsed: just show Boards icon */}
        {showCollapsed && (
          <NavLink
            to="/boards"
            title="Boards"
            className={({ isActive }) =>
              `flex items-center justify-center p-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--accent-lime-wash)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
              }`
            }
          >
            <Kanban className="w-4 h-4 shrink-0" />
          </NavLink>
        )}
      </nav>

      {/* Collapse toggle — bottom right */}
      {isDesktop && (
        <div className={`flex items-center ${showCollapsed ? 'justify-center py-3' : 'justify-end px-3 py-3'}`}>
          <button
            onClick={toggle}
            disabled={workspaceSidebarOpen}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={workspaceSidebarOpen ? 'Close workspaces to expand' : undefined}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--text-muted)]"
          >
            <SidebarSimple size={18} weight="regular" />
          </button>
        </div>
      )}
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
