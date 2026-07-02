import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Cube, Plus, X } from '@phosphor-icons/react'
import { resolveWorkspaceColor } from '../../constants/colors'
import { useSettingsStore } from '../../store/settingsStore'
import { useWorkspacesStore } from '../../store/workspacesStore'
import { useBoardSharingStore } from '../../store/boardSharingStore'
import { useBoardStore } from '../../store/boardStore'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import WorkspaceCreateModal from '../workspace/WorkspaceCreateModal'
import ConfirmModal from '../board/ConfirmModal'
import SidebarBoardItem from './SidebarBoardItem'
import DynamicIcon from '../board/DynamicIcon'
import Tooltip from '../ui/Tooltip'

/**
 * WorkspaceSidebar — Claude skills/connectors style list of workspaces.
 * Each item: icon + name, click to set active, hover & active states.
 * "Personal" is always first and is the default (activeWorkspaceId === null).
 */
export default function WorkspaceSidebar() {
  const open = useSettingsStore((s) => s.workspaceSidebarOpen)
  const close = useSettingsStore((s) => s.closeWorkspaceSidebar)
  const isDesktop = useIsDesktop()

  const workspaces = useWorkspacesStore((s) => s.workspaces)
  const activeWorkspaceId = useWorkspacesStore((s) => s.activeWorkspaceId)
  const fetchWorkspaces = useWorkspacesStore((s) => s.fetchWorkspaces)
  const setActiveWorkspace = useWorkspacesStore((s) => s.setActiveWorkspace)

  // Shared boards section: pending invitations (with accept/decline) +
  // accepted shared boards (click-through to /boards).
  const boardInvitations = useBoardSharingStore((s) => s.invitations)
  const sharedBoards = useBoardSharingStore((s) => s.sharedBoards)
  const acceptBoardInvitation = useBoardSharingStore((s) => s.acceptInvitation)
  const declineBoardInvitation = useBoardSharingStore((s) => s.declineInvitation)
  const leaveBoard = useBoardSharingStore((s) => s.leaveBoard)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
  const activeBoardId = useBoardStore((s) => s.activeBoardId)
  const hasShared = boardInvitations.length > 0 || sharedBoards.length > 0

  const location = useLocation()
  const navigate = useNavigate()

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [confirmLeaveId, setConfirmLeaveId] = useState(null)

  useEffect(() => {
    if (open) fetchWorkspaces()
  }, [open, fetchWorkspaces])

  // Auto-close on real navigation (not initial mount or first render with stale path)
  const prevPathRef = useRef(location.pathname)
  useEffect(() => {
    const prev = prevPathRef.current
    prevPathRef.current = location.pathname
    if (prev !== location.pathname && open && location.pathname !== '/workspace') {
      close()
    }
  }, [location.pathname, open, close])

  if (!open || !isDesktop) return null

  const workspaceList = Object.values(workspaces)

  return (
    <>
    <aside className="fixed top-0 left-12 h-screen w-[280px] bg-[var(--surface-sidebar)] border-r border-0.5 border-[var(--border-default)] flex flex-col z-30 animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center gap-2 py-3 px-4">
        <button
          type="button"
          onClick={() => { close(); navigate('/dashboard') }}
          aria-label="Back to dashboard"
          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-base font-semibold text-[var(--text-primary)] flex-1">Workspaces</span>
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          aria-label="Create workspace"
          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable list — Claude skills/connectors pattern */}
      <div className="flex flex-col gap-px flex-1 overflow-y-auto p-2">
        {/* Workspace list */}
        {workspaceList.map((ws) => {
          const isActive = activeWorkspaceId === ws.id
          return (
            <button
              key={ws.id}
              type="button"
              onClick={() => {
                setActiveWorkspace(ws.id)
                if (location.pathname !== '/workspace') navigate('/workspace')
              }}
              className={`flex items-center rounded-lg text-sm transition-colors duration-75 gap-3 px-4 py-1.5 ${
                isActive
                  ? 'bg-[var(--color-mauve-cream)] text-[var(--text-primary)]'
                  : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              <span className="flex size-5 items-center justify-center">
                <Cube weight="fill" className="w-4 h-4" style={{ color: resolveWorkspaceColor(ws) }} />
              </span>
              <span className="truncate text-left flex-1">{ws.name}</span>
            </button>
          )
        })}

        {/* Empty state hint for first-time users (when no workspaces yet) */}
        {workspaceList.length === 0 && (
          <div className="px-4 py-4 text-center">
            <p className="text-xs text-[var(--text-faint)]">No workspaces yet.</p>
            <p className="text-xs text-[var(--text-faint)] mt-1">Create one from the header.</p>
          </div>
        )}

        {/* ── Shared with me ── matches the main sidebar's section
            pattern exactly: text-xs muted header + SidebarBoardItem
            rows for accepted shares. Pending invitations get the same
            row dimensions (h-8 py-1.5 px-4 rounded-lg text-sm) but with
            italic name + tick/cross actions on the right. */}
        {hasShared && (
          <div className="pt-4">
            <div className="flex items-center justify-between gap-2 px-4 mb-px">
              <span className="text-xs text-[var(--text-muted)] truncate">Shared with me</span>
            </div>
            <div className="flex flex-col gap-px">
              {/* Pending invitations — same row chrome as SidebarBoardItem
                  (h-8, px-4, board-icon glyph, plain name). Right-side
                  actions: black check (accept), faded X (decline). */}
              {boardInvitations.map((inv) => {
                const boardName = inv.boards?.name || 'Untitled board'
                const boardIcon = inv.boards?.icon
                return (
                  <div
                    key={`inv-${inv.id}`}
                    className="flex items-center justify-between w-full h-8 py-1.5 px-4 rounded-lg text-sm text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors group"
                    title={`Invitation to "${boardName}"`}
                  >
                    <span className="flex items-center gap-3 truncate">
                      <span className="flex items-center justify-center shrink-0" style={{ width: 16, height: 16 }}>
                        <DynamicIcon
                          name={boardIcon || 'cards-three'}
                          className="w-4 h-4 text-[var(--text-muted)]"
                        />
                      </span>
                      <span className="truncate">{boardName}</span>
                    </span>
                    <span className="flex items-center gap-0.5 shrink-0">
                      <Tooltip content="Accept" placement="top">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); acceptBoardInvitation(inv.id) }}
                          aria-label={`Accept invitation to ${boardName}`}
                          className="w-5 h-5 rounded inline-flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--border-default)] transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" weight="bold" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Decline" placement="top">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); declineBoardInvitation(inv.id) }}
                          aria-label={`Decline invitation to ${boardName}`}
                          className="w-5 h-5 rounded inline-flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--text-muted)] hover:bg-[var(--border-default)] transition-colors"
                        >
                          <X className="w-3.5 h-3.5" weight="bold" />
                        </button>
                      </Tooltip>
                    </span>
                  </div>
                )
              })}
              {/* Accepted shared boards — same SidebarBoardItem the main
                  sidebar uses, so the row chrome is identical. */}
              {sharedBoards.map((board) => (
                <SidebarBoardItem
                  key={board.id}
                  board={board}
                  active={false}
                  editable={false}
                  deletable={false}
                  leavable
                  onSelect={(id) => { setActiveBoard(id); navigate('/boards') }}
                  onLeave={(id) => setConfirmLeaveId(id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>

    <WorkspaceCreateModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} />

    {confirmLeaveId && (
      <ConfirmModal
        title="Leave board"
        message="You'll lose access to this board. The owner can re-invite you later."
        confirmLabel="Leave"
        onConfirm={() => {
          leaveBoard(confirmLeaveId)
          if (activeBoardId === confirmLeaveId) {
            setActiveBoard(null)
            navigate('/dashboard')
          }
          setConfirmLeaveId(null)
        }}
        onCancel={() => setConfirmLeaveId(null)}
      />
    )}
    </>
  )
}
