import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Kanban, Check, X, UserPlus, Mail, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import { useWorkspaceStore } from '../store/workspaceStore'
import { useBoardStore } from '../store/boardStore'
import DynamicIcon from '../components/board/DynamicIcon'
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
    toast.success('Invitation accepted')
  }

  function handleDecline(id) {
    declineInvitation(id)
    toast.success('Invitation declined')
  }

  function handleBoardClick(boardId) {
    setActiveBoard(boardId)
    navigate('/boards')
  }

  const steps = [
    { icon: Kanban, color: 'bg-blue-50 text-blue-500', label: 'Open a board', desc: 'Navigate to one of your boards' },
    { icon: UserPlus, color: 'bg-violet-50 text-violet-500', label: 'Click Share', desc: 'Hit the Share button in the top bar' },
    { icon: Mail, color: 'bg-amber-50 text-amber-500', label: 'Invite by email', desc: "Enter your teammate's email" },
    { icon: Check, color: 'bg-emerald-50 text-emerald-500', label: 'They accept here', desc: 'Invitations appear in their Workspace' },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* ============================================================ */}
      {/*  Step-by-step guide — always visible                         */}
      {/* ============================================================ */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
            <Users className="w-4 h-4 text-gray-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">How collaboration works</h2>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {steps.map((step, i) => (
            <div key={i} className="text-center">
              <div className="relative inline-flex mb-2">
                <div className={`w-10 h-10 rounded-xl ${step.color} flex items-center justify-center`}>
                  <step.icon className="w-4.5 h-4.5" />
                </div>
                <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-gray-900 text-white text-[9px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <p className="text-xs font-medium text-gray-900">{step.label}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/*  1. Pending Invitations                                       */}
      {/* ============================================================ */}
      <section>
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">Invitations</h2>
            {invitations.length > 0 && (
              <span className="text-[11px] font-semibold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">
                {invitations.length}
              </span>
            )}
          </div>

          {invitations.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 py-10 flex flex-col items-center justify-center">
              <UserPlus className="w-10 h-10 text-gray-500 mb-2" />
              <p className="text-sm text-gray-500">No pending invitations</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4"
                >
                  {/* Left: board icon + info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                      {inv.boards?.icon ? (
                        <DynamicIcon name={inv.boards.icon} className="w-5 h-5 text-gray-600" />
                      ) : (
                        <Kanban className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {inv.boards?.name || 'Unknown Board'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        Invited by{' '}
                        <span className="text-gray-600 font-medium">
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
                      className="p-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAccept(inv.id)}
                      className="p-2 text-white bg-gray-900 hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
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
      <section>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">Shared with me</h2>
          </div>

          {sharedBoards.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 py-10 flex flex-col items-center justify-center">
              <Users className="w-10 h-10 text-gray-500 mb-2" />
              <p className="text-sm text-gray-500">No shared boards yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sharedBoards.map((board) => (
                <div
                  key={board.id}
                  onClick={() => handleBoardClick(board.id)}
                  className="bg-white rounded-xl border border-gray-200 p-4 text-left cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all group relative"
                >
                  {/* Leave button — top right, visible on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (window.confirm(`Leave "${board.name}"? You'll need a new invitation to rejoin.`)) {
                        leaveBoard(board.id)
                      }
                    }}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    title="Leave board"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>

                  {/* Top row: icon + name */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      {board.icon ? (
                        <DynamicIcon name={board.icon} className="w-4.5 h-4.5 text-gray-600" />
                      ) : (
                        <Kanban className="w-4.5 h-4.5 text-gray-500" />
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate pr-6">
                      {board.name}
                    </p>
                  </div>

                  {/* Bottom row: owner avatar + name | member count */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-full ${board.ownerColor || 'bg-gray-300'} flex items-center justify-center shrink-0`}
                      >
                        <span className="text-[10px] font-medium text-white leading-none">
                          {(board.ownerName || '?')[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 truncate">
                        {board.ownerName || 'Unknown'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 shrink-0">
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
