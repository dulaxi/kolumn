import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Kanban, Check, X, UserPlus, Mail, LogOut } from 'lucide-react'
import { showToast } from '../utils/toast'
import { useWorkspaceStore } from '../store/workspaceStore'
import { useBoardStore } from '../store/boardStore'
import DynamicIcon from '../components/board/DynamicIcon'
import ActionCard from '../components/ActionCard'
import { formatDistanceToNow } from 'date-fns'

export default function WorkspacePage() {
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
    fetchInvitations()
    fetchSharedBoards()
  }, [])

  function handleAccept(id) {
    acceptInvitation(id)
    showToast.success('Invitation accepted')
  }

  function handleDecline(id) {
    declineInvitation(id)
    showToast.info('Invitation declined')
  }

  function handleBoardClick(boardId) {
    setActiveBoard(boardId)
    navigate('/boards')
  }

  const steps = [
    { icon: Kanban, color: 'bg-[var(--accent-lime-wash)] text-[#A8BA32]', label: 'Open a board', desc: 'Navigate to one of your boards' },
    { icon: UserPlus, color: 'bg-[#E8DDE2] text-[#6E5A65]', label: 'Click Share', desc: 'Hit the Share button in the top bar' },
    { icon: Mail, color: 'bg-[#F5EDCF] text-[#D4A843]', label: 'Invite by email', desc: "Enter your teammate's email" },
    { icon: Check, color: 'bg-[var(--accent-lime-wash)] text-[#A8BA32]', label: 'They accept here', desc: 'Invitations appear in their Workspace' },
  ]

  return (
    <div className="w-full space-y-8">
      {/* ============================================================ */}
      {/*  Step-by-step guide — top of page                             */}
      {/* ============================================================ */}
      <section className="bg-[var(--surface-card)] rounded-3xl border border-[var(--border-default)] shadow-sm p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-7 h-7 rounded-lg bg-[var(--surface-hover)] flex items-center justify-center">
            <Users className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">How collaboration works</h2>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {steps.map((step, i) => (
            <div key={i} className="text-center">
              <div className="relative inline-flex mb-2">
                <div className={`w-10 h-10 rounded-xl ${step.color} flex items-center justify-center`}>
                  <step.icon className="w-4.5 h-4.5" />
                </div>
                <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-[var(--btn-primary-bg)] text-white text-[9px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <p className="text-xs font-medium text-[var(--text-primary)]">{step.label}</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* NEW: ActionCard quick actions */}
      <div className="flex w-full flex-col gap-3">
        <ActionCard
          icon={Kanban}
          title="Open a board to invite"
          description="Go to one of your boards and hit Share to add teammates."
          onClick={() => navigate('/boards')}
        />
        <ActionCard
          icon={Mail}
          title={invitations.length > 0 ? `${invitations.length} pending invitation${invitations.length > 1 ? 's' : ''}` : 'No pending invitations'}
          description={invitations.length > 0 ? 'Review and accept team invites below.' : 'Invitations from teammates will appear here.'}
          disabled={invitations.length === 0}
          onClick={() => {
            const el = document.getElementById('invitations-section')
            if (el) el.scrollIntoView({ behavior: 'smooth' })
          }}
        />
        <ActionCard
          icon={Users}
          title={sharedBoards.length > 0 ? `${sharedBoards.length} shared board${sharedBoards.length > 1 ? 's' : ''}` : 'No shared boards yet'}
          description={sharedBoards.length > 0 ? 'Jump into boards your teammates have shared with you.' : 'Boards shared with you will appear here.'}
          disabled={sharedBoards.length === 0}
          onClick={() => {
            const el = document.getElementById('shared-boards-section')
            if (el) el.scrollIntoView({ behavior: 'smooth' })
          }}
        />
      </div>

      {/* ============================================================ */}
      {/*  1. Pending Invitations                                       */}
      {/* ============================================================ */}
      <section id="invitations-section">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4 text-[var(--text-muted)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Invitations</h2>
            {invitations.length > 0 && (
              <span className="text-[11px] font-semibold bg-[var(--accent-lime-wash)] text-[#A8BA32] px-1.5 py-0.5 rounded-full">
                {invitations.length}
              </span>
            )}
          </div>

          {invitations.length === 0 ? (
            <div className="bg-[var(--surface-card)] rounded-3xl border border-[var(--border-default)] shadow-sm py-10 flex flex-col items-center justify-center">
              <UserPlus className="w-10 h-10 text-[var(--text-muted)] mb-2" />
              <p className="text-sm text-[var(--text-muted)]">No pending invitations</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-[var(--surface-card)] rounded-3xl border border-[var(--border-default)] shadow-sm p-4 flex items-center gap-4"
                >
                  {/* Left: board icon + info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[var(--surface-hover)] flex items-center justify-center shrink-0">
                      {inv.boards?.icon ? (
                        <DynamicIcon name={inv.boards.icon} className="w-5 h-5 text-[var(--text-secondary)]" />
                      ) : (
                        <Kanban className="w-5 h-5 text-[var(--text-muted)]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {inv.boards?.name || 'Unknown Board'}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] truncate">
                        Invited by{' '}
                        <span className="text-[var(--text-secondary)] font-medium">
                          {inv.inviter?.display_name || inv.inviter?.email || 'Someone'}
                        </span>{' '}
                        &middot;{' '}
                        {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  {/* Right: action buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleDecline(inv.id)}
                      className="p-2 text-[var(--text-secondary)] bg-[var(--surface-hover)] hover:bg-[var(--border-default)] rounded-lg cursor-pointer transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAccept(inv.id)}
                      className="p-2 text-white bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] rounded-lg cursor-pointer transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      {/* ============================================================ */}
      {/*  2. Shared With Me                                            */}
      {/* ============================================================ */}
      <section id="shared-boards-section">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-[var(--text-muted)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Shared with me</h2>
          </div>

          {sharedBoards.length === 0 ? (
            <div className="bg-[var(--surface-card)] rounded-3xl border border-[var(--border-default)] shadow-sm py-10 flex flex-col items-center justify-center">
              <Users className="w-10 h-10 text-[var(--text-muted)] mb-2" />
              <p className="text-sm text-[var(--text-muted)]">No shared boards yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sharedBoards.map((board) => (
                <div
                  key={board.id}
                  onClick={() => handleBoardClick(board.id)}
                  className="bg-[var(--surface-card)] rounded-3xl border border-[var(--border-default)] shadow-sm p-4 text-left cursor-pointer hover:border-[var(--border-default)] hover:shadow-sm transition-all group relative"
                >
                  {/* Leave button — top right, visible on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (window.confirm(`Leave "${board.name}"? You'll need a new invitation to rejoin.`)) {
                        leaveBoard(board.id)
                      }
                    }}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[#7A5C44] hover:bg-[#F0E0D2] opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    title="Leave board"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>

                  {/* Top row: icon + name */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--surface-hover)] flex items-center justify-center shrink-0">
                      {board.icon ? (
                        <DynamicIcon name={board.icon} className="w-4.5 h-4.5 text-[var(--text-secondary)]" />
                      ) : (
                        <Kanban className="w-4.5 h-4.5 text-[var(--text-muted)]" />
                      )}
                    </div>
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate pr-6">
                      {board.name}
                    </p>
                  </div>

                  {/* Bottom row: owner avatar + name | member count */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-full ${board.ownerColor || 'bg-[#E0DBD5]'} flex items-center justify-center shrink-0`}
                      >
                        <span className="text-[10px] font-medium text-white leading-none">
                          {(board.ownerName || '?')[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs text-[var(--text-muted)] truncate">
                        {board.ownerName || 'Unknown'}
                      </span>
                    </div>
                    <span className="text-xs text-[var(--text-muted)] shrink-0">
                      {board.memberCount} member{board.memberCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
    </div>
  )
}
