import { useState, useEffect } from 'react'
import { capture } from '../../lib/analytics'
import { Envelope, ShareNetwork, SignOut, Trash, UserPlus, Users, X } from '@phosphor-icons/react'
import { showToast } from '../../utils/toast'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useBoardSharingStore } from '../../store/boardSharingStore'

// Stable empty-array reference — returning a fresh `[]` from a Zustand
// selector triggers a re-render every time (Object.is([], []) is false),
// which produced "Maximum update depth exceeded" here.
const EMPTY = []
import { useIsMobile } from '../../hooks/useMediaQuery'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import DynamicIcon from './DynamicIcon'
import ConfirmModal from './ConfirmModal'
import Tooltip from '../ui/Tooltip'
import Skeleton from '../ui/Skeleton'
import { useBoardStore } from '../../store/boardStore'
import { useNavigate } from 'react-router-dom'
import { getAvatarColor, getAvatarTextColor, getInitials } from '../../utils/formatting'
import FieldError from '../ui/FieldError'

export default function BoardShareModal({ board, onClose }) {
  const isMobile = useIsMobile()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false)
  const user = useAuthStore((s) => s.user)
  const leaveBoard = useBoardSharingStore((s) => s.leaveBoard)
  const activeBoardId = useBoardStore((s) => s.activeBoardId)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)
  const navigate = useNavigate()

  // SWR pattern: read members + invitations from the per-board cache so
  // the modal renders instantly on subsequent opens (no spinner, no
  // empty→full reflow). The fetchers below run in the background to
  // revalidate. Realtime on `board_members` keeps the cache fresh while
  // the app is open, so re-opens after the first usually find a current
  // list and the network round-trip is invisible.
  const members = useBoardSharingStore((s) => s.boardMembers[board.id] || EMPTY)
  const invitations = useBoardSharingStore((s) => s.boardSentInvitations[board.id] || EMPTY)
  const fetchBoardMembers = useBoardSharingStore((s) => s.fetchBoardMembers)
  const fetchBoardSentInvitations = useBoardSharingStore((s) => s.fetchBoardSentInvitations)
  const removeBoardMemberLocal = useBoardSharingStore((s) => s.removeBoardMemberLocal)
  const addBoardSentInvitationLocal = useBoardSharingStore((s) => s.addBoardSentInvitationLocal)
  const removeBoardSentInvitationLocal = useBoardSharingStore((s) => s.removeBoardSentInvitationLocal)

  // Track first-load-for-this-board so we can show a skeleton ONLY on
  // truly empty cache. Subsequent opens have data and skip the skeleton
  // entirely — the modal feels instant.
  const hasCachedMembers = useBoardSharingStore((s) => Boolean(s.boardMembers[board.id]))
  const showSkeleton = !hasCachedMembers

  useEffect(() => {
    fetchBoardMembers(board.id)
    fetchBoardSentInvitations(board.id)
  }, [board.id, fetchBoardMembers, fetchBoardSentInvitations])

  const handleInvite = async (e) => {
    e.preventDefault()
    setError('')
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return

    // Block self-invite — caught here BEFORE the membership check so the
    // error reads "you can't invite yourself" instead of the generic
    // "already a member" (true for the owner, but unhelpful messaging).
    if (user?.email?.toLowerCase() === trimmed) {
      setError("You can't invite yourself")
      return
    }

    // Check if already a member
    const alreadyMember = members.some(
      (m) => m.profiles?.email?.toLowerCase() === trimmed
    )
    if (alreadyMember) {
      setError('This user is already a member')
      return
    }

    // Check if already invited
    const alreadyInvited = invitations.some(
      (inv) => inv.invited_email.toLowerCase() === trimmed
    )
    if (alreadyInvited) {
      setError('This email has already been invited')
      return
    }

    setLoading(true)

    // Server-side double-check — local `members`/`invitations` can be
    // stale (e.g. someone accepted on another device); without this, the
    // insert fails with a unique-constraint message that's not friendly.
    const [{ data: memberRows }, { data: inviteRow }] = await Promise.all([
      supabase
        .from('board_members')
        .select('user_id, profiles!board_members_user_id_profiles_fkey(email)')
        .eq('board_id', board.id),
      supabase
        .from('board_invitations')
        .select('id, invited_email, status')
        .eq('board_id', board.id)
        .eq('status', 'pending')
        .eq('invited_email', trimmed)
        .maybeSingle(),
    ])

    if ((memberRows || []).some((m) => m.profiles?.email?.toLowerCase() === trimmed)) {
      setError('This user is already a member')
      setLoading(false)
      return
    }
    if (inviteRow) {
      setError('This email has already been invited')
      setLoading(false)
      return
    }

    const { data: invData, error: invError } = await supabase
      .from('board_invitations')
      .insert({
        board_id: board.id,
        invited_email: trimmed,
        invited_by: user.id,
      })
      .select()
      .single()

    if (invError) {
      setError(invError.message)
    } else {
      // Optimistic cache update — store action keeps the modal in sync
      // across re-opens without an extra round-trip.
      if (invData) addBoardSentInvitationLocal(board.id, invData)
      setEmail('')
      showToast.success('Invitation sent')
      capture('member_invited')
    }

    setLoading(false)
  }

  const handleRemoveMember = async (userId) => {
    if (userId === board.owner_id) return
    removeBoardMemberLocal(board.id, userId)
    const { error } = await supabase
      .from('board_members')
      .delete()
      .eq('board_id', board.id)
      .eq('user_id', userId)
    if (error) fetchBoardMembers(board.id) // Rollback by refetching
  }

  const handleCancelInvitation = async (invId) => {
    removeBoardSentInvitationLocal(board.id, invId)
    const { error } = await supabase.from('board_invitations').delete().eq('id', invId)
    if (error) fetchBoardSentInvitations(board.id) // Rollback
  }

  const isOwner = user?.id === board.owner_id

  return (
    <Modal open onClose={onClose} contentClassName="flex items-center justify-center">
      <div className={`bg-[var(--surface-card)] shadow-[var(--shadow-raised)] ${
        isMobile
          ? 'fixed inset-0'
          : 'rounded-xl w-full max-w-md mx-4'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            {isOwner ? (
              <ShareNetwork className="w-5 h-5 text-[var(--text-secondary)]" />
            ) : (
              <Users className="w-5 h-5 text-[var(--text-secondary)]" />
            )}
            <h2 className="font-heading text-lg font-light text-[var(--text-primary)]">
              {isOwner ? `Share "${board.name}"` : `Members of "${board.name}"`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Invite form */}
        {isOwner && (
          <form onSubmit={handleInvite} className="px-5 py-3 border-b border-[var(--border-subtle)]">
            <div className="flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                placeholder="Invite by email..."
                leadingIcon={<Envelope className="w-4 h-4" />}
                error={!!error}
                wrapperClassName="flex-1"
              />
              <Button
                type="submit"
                disabled={loading || !email.trim()}
                loading={loading}
                loadingText="Inviting"
              >
                <UserPlus className="w-4 h-4" />
                Invite
              </Button>
            </div>
            <FieldError>{error}</FieldError>
          </form>
        )}

        {/* Members list */}
        <div className="px-5 py-3 max-h-64 overflow-y-auto">
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
            Members{members.length ? ` (${members.length})` : ''}
          </p>
          <div className="space-y-1">
            {/* First-open skeleton — only when there's truly no cached
                data for this board. Two ghost rows keep the panel
                height stable so members landing doesn't push the
                modal taller. */}
            {showSkeleton && members.length === 0 && (
              <>
                {[0, 1].map((i) => (
                  <div key={`sk-${i}`} className="flex items-center gap-2.5 py-2">
                    <Skeleton variant="circle" width={28} height={28} className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Skeleton variant="line" width={96} height={12} />
                      <Skeleton variant="line" width={128} height={10} className="mt-1.5 opacity-60" />
                    </div>
                  </div>
                ))}
              </>
            )}
            {members.map((m) => {
              const displayName = m.profiles?.display_name || 'Unknown'
              const bg = m.profiles?.color || getAvatarColor(displayName)
              const textColor = getAvatarTextColor(bg)
              return (
              <div
                key={m.user_id}
                className="flex items-center justify-between py-2 group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${bg} ${textColor}`}>
                    {m.profiles?.icon ? (
                      <DynamicIcon name={m.profiles.icon} className="w-3.5 h-3.5" />
                    ) : (
                      <span className="text-[10px] font-medium">{getInitials(displayName)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {m.profiles?.display_name || 'Unknown'}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate">{m.profiles?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {m.role === 'owner' ? (
                    <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-[var(--surface-hover)] text-[var(--text-muted)]">
                      Owner
                    </span>
                  ) : isOwner ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.user_id)}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--label-red-text)] opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  ) : m.user_id === user?.id ? (
                    /* Non-owner viewing their own row: surface a Leave
                       affordance so they can exit the board without
                       hunting for the sidebar icon. */
                    <Tooltip content="Leave this board">
                      <button
                        type="button"
                        onClick={() => setConfirmLeaveOpen(true)}
                        className="inline-flex items-center gap-1 h-6 px-2 text-[11px] font-medium rounded-md text-[var(--text-muted)] hover:text-[var(--label-red-text)] hover:bg-[var(--surface-hover)] transition-colors"
                      >
                        <SignOut className="w-3 h-3" weight="bold" />
                        Leave
                      </button>
                    </Tooltip>
                  ) : null}
                </div>
              </div>
              )
            })}
          </div>

          {/* Pending invitations */}
          {/* Pending invitations are owner-only — non-owner members
              shouldn't see other people's invited emails. */}
          {isOwner && invitations.length > 0 && (
            <>
              <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mt-4 mb-2">
                Pending Invitations ({invitations.length})
              </p>
              <div className="space-y-1">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between py-2 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[var(--surface-hover)] flex items-center justify-center">
                        <Envelope className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      </div>
                      <p className="text-sm text-[var(--text-secondary)]">{inv.invited_email}</p>
                    </div>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleCancelInvitation(inv.id)}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--label-red-text)] opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {confirmLeaveOpen && (
        <ConfirmModal
          title="Leave board"
          message="You'll lose access to this board. The owner can re-invite you later."
          confirmLabel="Leave"
          onConfirm={() => {
            leaveBoard(board.id)
            setConfirmLeaveOpen(false)
            if (activeBoardId === board.id) {
              setActiveBoard(null)
              navigate('/dashboard')
            }
            onClose()
          }}
          onCancel={() => setConfirmLeaveOpen(false)}
        />
      )}
    </Modal>
  )
}
