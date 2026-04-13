import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ChevronRight, Users, UserPlus, Kanban, Check, LogOut } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { useBoardStore } from '../../store/boardStore'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import DynamicIcon from '../board/DynamicIcon'
import { formatDistanceToNow } from 'date-fns'
import { showToast } from '../../utils/toast'

export default function WorkspaceSidebar() {
  const open = useSettingsStore((s) => s.workspaceSidebarOpen)
  const close = useSettingsStore((s) => s.closeWorkspaceSidebar)
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()

  const invitations = useWorkspaceStore((s) => s.invitations)
  const sharedBoards = useWorkspaceStore((s) => s.sharedBoards)
  const fetchInvitations = useWorkspaceStore((s) => s.fetchInvitations)
  const fetchSharedBoards = useWorkspaceStore((s) => s.fetchSharedBoards)
  const acceptInvitation = useWorkspaceStore((s) => s.acceptInvitation)
  const declineInvitation = useWorkspaceStore((s) => s.declineInvitation)
  const leaveBoard = useWorkspaceStore((s) => s.leaveBoard)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)

  useEffect(() => {
    if (open) {
      fetchInvitations()
      fetchSharedBoards()
    }
  }, [open])

  if (!open || !isDesktop) return null

  const handleAccept = (id) => {
    acceptInvitation(id)
    showToast.success('Invitation accepted')
  }

  const handleDecline = (id) => {
    declineInvitation(id)
    showToast.info('Invitation declined')
  }

  const handleBoardClick = (boardId) => {
    setActiveBoard(boardId)
    close()
    navigate('/boards')
  }

  return (
    <aside className="fixed top-0 left-12 h-screen w-[280px] xl:w-[320px] bg-[var(--surface-sidebar)] border-r border-0.5 border-[var(--border-default)] flex flex-col z-30 animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 min-h-14">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Workspace</h2>
        <button
          type="button"
          onClick={close}
          aria-label="Close workspace sidebar"
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3">
        {/* Invitations section */}
        <div className="mb-2">
          <div className="flex items-center justify-between px-2 pb-2">
            <span className="text-xs text-[var(--text-muted)]">
              Invitations
              {invitations.length > 0 && (
                <span className="ml-1.5 text-[10px] font-semibold bg-[var(--surface-hover)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded-full">
                  {invitations.length}
                </span>
              )}
            </span>
          </div>

          {invitations.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <p className="text-xs text-[var(--text-faint)]">No pending invitations</p>
            </div>
          ) : (
            <div className="flex flex-col gap-px">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors hover:bg-[var(--surface-raised)]"
                >
                  <span className="flex-shrink-0 flex items-center justify-center w-6 h-6">
                    <div className="shrink-0 bg-[var(--surface-card)] border-[var(--border-default)] border-0.5 shadow-sm flex items-center justify-center" style={{ width: 24, height: 24, borderRadius: '6.48px' }}>
                      {inv.boards?.icon ? (
                        <DynamicIcon name={inv.boards.icon} className="w-4 h-4 text-[var(--text-secondary)]" />
                      ) : (
                        <Kanban className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      )}
                    </div>
                  </span>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {inv.boards?.name || 'Unknown Board'}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)] truncate">
                      from {inv.inviter?.display_name || 'Someone'} · {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDecline(inv.id)}
                      className="p-1 rounded text-[var(--text-faint)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
                      title="Decline"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAccept(inv.id)}
                      className="p-1 rounded text-[var(--text-faint)] hover:text-[var(--accent-lime-dark)] hover:bg-[var(--accent-lime-wash)] transition-colors"
                      title="Accept"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-px bg-[var(--border-subtle)] mx-3 my-2" />

        {/* Shared boards section */}
        <div>
          <div className="flex items-center justify-between px-2 pb-2">
            <span className="text-xs text-[var(--text-muted)]">Shared boards</span>
          </div>

          {sharedBoards.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <p className="text-xs text-[var(--text-faint)]">No shared boards yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-px">
              {sharedBoards.map((board) => (
                <div
                  key={board.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleBoardClick(board.id)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors cursor-pointer hover:bg-[var(--surface-raised)] group"
                >
                  <span className="flex-shrink-0 flex items-center justify-center w-6 h-6">
                    <div className="shrink-0 bg-[var(--surface-card)] border-[var(--border-default)] border-0.5 shadow-sm flex items-center justify-center" style={{ width: 24, height: 24, borderRadius: '6.48px' }}>
                      {board.icon ? (
                        <DynamicIcon name={board.icon} className="w-4 h-4 text-[var(--text-secondary)]" />
                      ) : (
                        <Kanban className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      )}
                    </div>
                  </span>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm text-[var(--text-primary)] truncate">{board.name}</span>
                    <span className="text-[11px] text-[var(--text-muted)] truncate">
                      {board.ownerName} · {board.memberCount} member{board.memberCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (window.confirm(`Leave "${board.name}"? You'll need a new invitation to rejoin.`)) {
                        leaveBoard(board.id)
                      }
                    }}
                    className="p-1 rounded text-[var(--text-faint)] hover:text-[#C27A4A] opacity-0 group-hover:opacity-100 transition-all"
                    title="Leave board"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
