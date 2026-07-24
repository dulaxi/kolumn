import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'

import { useSettingsStore } from '../../store/settingsStore'
import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import { useIsDesktop, useMediaQuery } from '../../hooks/useMediaQuery'
import { useBoardSharingStore } from '../../store/boardSharingStore'
import { useWorkspacesStore } from '../../store/workspacesStore'
import { Plus } from '@phosphor-icons/react'
import ConfirmModal from '../board/ConfirmModal'
import SidebarNav from './SidebarNav'
import SidebarBoardItem from './SidebarBoardItem'
import SidebarBottom from './SidebarBottom'
import SidebarChecklist from './SidebarChecklist'
import DynamicIcon from '../board/DynamicIcon'
import Tooltip from '../ui/Tooltip'
import KolumnLogo from './KolumnLogo'

// Dispatches a "new board" event with a small retry to handle the case where
// BoardsPage hasn't mounted yet — used by the Plus buttons in section headers.
function dispatchCreateBoard(detail) {
  let attempts = 0
  let handled = false
  const onHandled = () => { handled = true }
  window.addEventListener('kolumn:create-board-ack', onHandled, { once: true })
  const tryDispatch = () => {
    if (handled) { window.removeEventListener('kolumn:create-board-ack', onHandled); return }
    window.dispatchEvent(new CustomEvent('kolumn:create-board', { detail }))
    if (++attempts < 10) setTimeout(tryDispatch, 100)
  }
  setTimeout(tryDispatch, 50)
}

function SectionHeader({ label, collapsed, onToggle, onPlusClick, plusTitle }) {
  // No Tooltip on the row itself: the hover-revealed "Show/Hide" text IS the
  // affordance, and a row-level tooltip would nest around the plus button's
  // tooltip (double bubble, mis-anchored over the full row width).
  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={!collapsed}
      aria-label={collapsed ? `Show ${label}` : `Hide ${label}`}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle?.() }
      }}
      className="flex w-full items-center justify-between gap-2 px-2 mb-px group/sec cursor-pointer select-none"
    >
      <span className="text-xs text-[var(--text-muted)] truncate">{label}</span>
      <span className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-[var(--text-faint)] opacity-0 group-hover/sec:opacity-75 transition-opacity">
          {collapsed ? 'Show' : 'Hide'}
        </span>
        {/* left placement keeps the bubble inside the sidebar — the nav's
            overflow-y-auto clips anything that crosses its right edge */}
        {onPlusClick && (
          <Tooltip content={plusTitle} placement="left">
            <button
              type="button"
              aria-label={plusTitle}
              onClick={(e) => { e.stopPropagation(); onPlusClick() }}
              className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors"
            >
              <Plus className="w-5 h-5" weight="light" />
            </button>
          </Tooltip>
        )}
      </span>
    </div>
  )
}

export default function Sidebar() {
  // Workspace nav badge counts both kinds of pending invitations:
  // workspace invites (handled on the Workspace page) AND board invites
  // (now surfaced in the workspace sub-sidebar's "Shared with me"
  // section). The notification bell shows the same items, so the badges
  // intentionally agree.
  const workspaceInvitationCount = useWorkspacesStore((s) => s.invitations.length)
  const boardInvitationCount = useBoardSharingStore((s) => s.invitations.length)
  const invitationCount = workspaceInvitationCount + boardInvitationCount
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed)
  const toggle = useSettingsStore((s) => s.toggleSidebar)
  const setSidebarCollapsed = useSettingsStore((s) => s.setSidebarCollapsed)
  const mobileMenuOpen = useSettingsStore((s) => s.mobileMenuOpen)
  const closeMobileMenu = useSettingsStore((s) => s.closeMobileMenu)
  const toggleWorkspaceSidebar = useSettingsStore((s) => s.toggleWorkspaceSidebar)
  const workspaceSidebarOpen = useSettingsStore((s) => s.workspaceSidebarOpen)
  const isDesktop = useIsDesktop()
  const isWide = useMediaQuery('(min-width: 1280px)')

  // Auto-collapse only on the WIDE → NARROW transition (1280px boundary).
  // Previously this fired on every mount and overrode the persisted user
  // choice on every reload. prevIsWide tracks the last-seen value so the
  // initial mount is a no-op (persisted state wins). The opposite
  // transition (narrow → wide) does NOT auto-expand — user's pinned
  // choice survives until they toggle manually.
  const prevIsWide = useRef(isWide)
  useEffect(() => {
    if (!isDesktop || workspaceSidebarOpen) {
      prevIsWide.current = isWide
      return
    }
    if (prevIsWide.current && !isWide) {
      setSidebarCollapsed(true)
    }
    prevIsWide.current = isWide
  }, [isDesktop, isWide, workspaceSidebarOpen, setSidebarCollapsed])

  // While mobile drawer is open: lock body scroll + Escape closes
  useEffect(() => {
    if (isDesktop || !mobileMenuOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e) => { if (e.key === 'Escape') closeMobileMenu() }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isDesktop, mobileMenuOpen, closeMobileMenu])

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
  const leaveBoard = useBoardSharingStore((s) => s.leaveBoard)
  const [iconPickerBoardId, setIconPickerBoardId] = useState(null)
  const [renamingBoardId, setRenamingBoardId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDeleteBoardId, setConfirmDeleteBoardId] = useState(null)
  const [confirmLeaveBoardId, setConfirmLeaveBoardId] = useState(null)

  // "Boards" section = personal boards only (owned by me, not tied to a workspace).
  // Workspace boards live under the Spaces section below.
  const workspaces = useWorkspacesStore((s) => s.workspaces)
  // Sidebar-list filter, driven by WorkspaceDropdown:
  //   null         = All workspaces (default, aggregate — every section renders)
  //   'personal'   = Personal only (personal boards + shared, no Spaces)
  //   <uuid>       = that single workspace
  const activeWorkspaceId = useWorkspacesStore((s) => s.activeWorkspaceId)
  const collapsedSpaces = useSettingsStore((s) => s.collapsedSpaces)
  const toggleSpaceCollapsed = useSettingsStore((s) => s.toggleSpaceCollapsed)
  const boardsCollapsed = useSettingsStore((s) => s.boardsCollapsed)
  const toggleBoardsCollapsed = useSettingsStore((s) => s.toggleBoardsCollapsed)
  const sharedBoardsCollapsed = useSettingsStore((s) => s.sharedBoardsCollapsed)
  const toggleSharedBoardsCollapsed = useSettingsStore((s) => s.toggleSharedBoardsCollapsed)
  const personalBoards = Object.values(allBoards).filter(
    (b) => b.owner_id === user?.id && !b.workspace_id,
  )
  // null = All (every section), 'personal' = Personal + Shared only, uuid = that workspace only.
  const isAll = activeWorkspaceId === null
  const isPersonal = activeWorkspaceId === 'personal'
  const workspaceList = isAll
    ? Object.values(workspaces)
    : isPersonal
      ? []
      : Object.values(workspaces).filter((ws) => ws.id === activeWorkspaceId)
  const showPersonalBoards = isAll || isPersonal
  const showSharedBoards = isAll || isPersonal

  const isBoardsActive = location.pathname.startsWith('/boards')

  const handleSelectBoard = (boardId) => {
    setActiveBoard(boardId)
    navigate('/boards')
    closeMobileMenu()
  }

  const handleStartRename = (board) => {
    setRenamingBoardId(board.id)
    setRenameValue(board.name)
  }

  const commitRename = () => {
    const trimmed = renameValue.trim()
    if (trimmed && renamingBoardId) renameBoard(renamingBoardId, trimmed)
    setRenamingBoardId(null)
  }

  const cancelRename = () => setRenamingBoardId(null)

  // Per-row prop-builder so each row gets the right rename / icon-picker context
  const itemPropsFor = (board, { editable, deletable, leavable = false }) => ({
    board,
    active: isBoardsActive && activeBoardId === board.id,
    editable,
    deletable,
    leavable,
    onSelect: handleSelectBoard,
    onUpdateIcon: updateBoardIcon,
    onDelete: (id) => setConfirmDeleteBoardId(id),
    onLeave: (id) => setConfirmLeaveBoardId(id),
    iconPickerOpen: iconPickerBoardId === board.id,
    onToggleIconPicker: (id) => setIconPickerBoardId(id ?? null),
    renaming: renamingBoardId === board.id,
    renameValue,
    onRenameChange: setRenameValue,
    onCommitRename: commitRename,
    onCancelRename: cancelRename,
    onStartRename: handleStartRename,
  })

  const showCollapsed = isDesktop && collapsed

  return (
    <>
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
        <div className={`flex items-center ${showCollapsed ? 'justify-center px-1 h-12' : 'gap-2 px-2 h-16'}`}>
          <button
            type="button"
            onClick={() => { closeMobileMenu(); navigate('/dashboard') }}
            aria-label="Go to Home"
            className="flex items-center gap-2 cursor-pointer"
          >
            <KolumnLogo size={showCollapsed ? 22 : 30} />
            {!showCollapsed && (
              <span className="text-[23px] font-[500] text-[var(--text-primary)] tracking-tight leading-none font-logo">
                Kolumn
              </span>
            )}
          </button>
        </div>

        {/* Nav items */}
        <nav className={`flex-1 pt-2 overflow-y-auto ${showCollapsed ? 'px-1' : 'px-2'}`}>
          <SidebarNav
            collapsed={showCollapsed}
            isDesktop={isDesktop}
            workspaceSidebarOpen={workspaceSidebarOpen}
            toggleWorkspaceSidebar={toggleWorkspaceSidebar}
            pathname={location.pathname}
            navigate={navigate}
            closeMobileMenu={closeMobileMenu}
            invitationCount={invitationCount}
          />

          {/* ── Boards section ── (hidden when filtering to a specific workspace) */}
          {!showCollapsed && showPersonalBoards && (
            <div className="flex flex-col pt-4">
              <SectionHeader
                label="Boards"
                collapsed={boardsCollapsed}
                onToggle={toggleBoardsCollapsed}
                onPlusClick={() => { navigate('/boards'); dispatchCreateBoard(); closeMobileMenu() }}
                plusTitle="New board"
              />
              <div className={`flex flex-col gap-px ${boardsCollapsed ? 'hidden' : ''}`}>
                {personalBoards.map((board) => (
                  <SidebarBoardItem key={board.id} {...itemPropsFor(board, { editable: true, deletable: true })} />
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
                <div className="flex flex-col pt-4">
                  <SectionHeader
                    label={ws.name}
                    collapsed={isCollapsed}
                    onToggle={() => toggleSpaceCollapsed(ws.id)}
                    onPlusClick={() => { navigate('/boards'); dispatchCreateBoard({ workspaceId: ws.id }); closeMobileMenu() }}
                    plusTitle={`New board in ${ws.name}`}
                  />
                </div>
                <div className={`flex flex-col gap-px ${isCollapsed ? 'hidden' : ''}`}>
                  {wsBoards.map((board) => {
                    const canEdit = board.owner_id === user?.id
                    return (
                      <SidebarBoardItem
                        key={board.id}
                        {...itemPropsFor(board, { editable: canEdit, deletable: canEdit })}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* ── Shared with me ── (hidden when filtering to a specific workspace) */}
          {!showCollapsed && showSharedBoards && sharedBoards.length > 0 && (
            <div className="flex flex-col pt-4">
              <SectionHeader
                label="Shared with me"
                collapsed={sharedBoardsCollapsed}
                onToggle={toggleSharedBoardsCollapsed}
              />
              <div className={`flex flex-col gap-px ${sharedBoardsCollapsed ? 'hidden' : ''}`}>
                {sharedBoards.map((board) => (
                  <SidebarBoardItem key={board.id} {...itemPropsFor(board, { editable: false, deletable: false, leavable: true })} />
                ))}
              </div>
            </div>
          )}

          {/* Collapsed: show the active board's icon (last opened) — falls
              back to Kanban when no real board is active. '__all__' is the
              pseudo "All tasks" id and has no icon, so it falls through too. */}
          {showCollapsed && (() => {
            const activeBoard = activeBoardId && activeBoardId !== '__all__' ? allBoards[activeBoardId] : null
            // flex-col wrapper stretches Tooltip's inline-flex span to the
            // rail width (the plain-block <nav> won't); w-full + h-8 on the
            // NavLink then match SidebarNav's ROW_BASE so this rail item
            // sizes identically to its siblings (Search/Chats/Builder).
            return (
              <div className="flex flex-col">
              <Tooltip content={activeBoard?.name || 'Boards'} placement="right">
                <NavLink
                  to="/boards"
                  className={({ isActive }) =>
                    `flex w-full items-center justify-center h-8 px-2 rounded-lg text-sm transition-colors duration-75 overflow-hidden ${
                      isActive
                        ? 'bg-[var(--color-mauve-cream)] text-[var(--text-primary)]'
                        : 'text-[var(--text-primary)] hover:bg-[var(--surface-raised)] active:bg-[var(--surface-raised)]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <DynamicIcon
                      name={activeBoard?.icon || 'cards-three'}
                      weight={isActive ? 'fill' : 'regular'}
                      className="w-5 h-5 shrink-0"
                    />
                  )}
                </NavLink>
              </Tooltip>
              </div>
            )
          })()}
        </nav>

        {isDesktop && !showCollapsed && <SidebarChecklist />}

        {isDesktop && (
          <SidebarBottom
            collapsed={collapsed}
            showCollapsed={showCollapsed}
            onToggle={toggle}
            workspaceSidebarOpen={workspaceSidebarOpen}
          />
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

      {confirmLeaveBoardId && (
        <ConfirmModal
          title="Leave board"
          message="You'll lose access to this board. The owner can re-invite you later."
          confirmLabel="Leave"
          onConfirm={() => {
            leaveBoard(confirmLeaveBoardId)
            setConfirmLeaveBoardId(null)
            // If the user leaves the board they're currently viewing,
            // bounce them off it so they don't see a "no access" flash.
            if (activeBoardId === confirmLeaveBoardId) {
              setActiveBoard(null)
              navigate('/dashboard')
            }
          }}
          onCancel={() => setConfirmLeaveBoardId(null)}
        />
      )}
    </>
  )
}
