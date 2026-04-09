import { useState, useEffect } from 'react'
import { capture } from '../../lib/analytics'
import { X, UserPlus, Trash2, Mail, Crown, Users } from 'lucide-react'
import { showToast } from '../../utils/toast'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useIsMobile } from '../../hooks/useMediaQuery'

export default function BoardShareModal({ board, onClose }) {
  const isMobile = useIsMobile()
  const [members, setMembers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    fetchMembers()
    fetchInvitations()
  }, [board.id])

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('board_members')
      .select('user_id, role, profiles(id, email, display_name, icon, color)')
      .eq('board_id', board.id)
    setMembers(data || [])
  }

  const fetchInvitations = async () => {
    const { data } = await supabase
      .from('board_invitations')
      .select('*')
      .eq('board_id', board.id)
      .eq('status', 'pending')
    setInvitations(data || [])
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    setError('')
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return

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
      // Update local state directly instead of refetching
      if (invData) setInvitations((prev) => [...prev, invData])
      setEmail('')
      showToast.success('Invitation sent')
      capture('member_invited')
    }

    setLoading(false)
  }

  const handleRemoveMember = async (userId) => {
    if (userId === board.owner_id) return
    // Optimistic remove
    setMembers((prev) => prev.filter((m) => m.user_id !== userId))
    const { error } = await supabase
      .from('board_members')
      .delete()
      .eq('board_id', board.id)
      .eq('user_id', userId)
    if (error) fetchMembers() // Rollback by refetching
  }

  const handleCancelInvitation = async (invId) => {
    // Optimistic remove
    setInvitations((prev) => prev.filter((inv) => inv.id !== invId))
    const { error } = await supabase.from('board_invitations').delete().eq('id', invId)
    if (error) fetchInvitations() // Rollback by refetching
  }

  const isOwner = user?.id === board.owner_id

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      data-modal
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={`bg-[var(--surface-card)] shadow-xl ${
        isMobile
          ? 'fixed inset-0'
          : 'rounded-2xl w-full max-w-md mx-4'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--text-secondary)]" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Share "{board.name}"</h2>
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
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  placeholder="Invite by email..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-[var(--border-default)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-lime-wash)]"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#1B1B18] text-white text-sm font-medium rounded-xl hover:bg-[#1B1B18] disabled:opacity-50 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Invite
              </button>
            </div>
            {error && (
              <p className="text-xs text-[#7A5C44] mt-1.5">{error}</p>
            )}
          </form>
        )}

        {/* Members list */}
        <div className="px-5 py-3 max-h-64 overflow-y-auto">
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
            Members ({members.length})
          </p>
          <div className="space-y-1">
            {members.map((m) => (
              <div
                key={m.user_id}
                className="flex items-center justify-between py-2 group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${m.profiles?.color || 'bg-[#E0DBD5]'}`}>
                    {(m.profiles?.display_name || '?')[0].toUpperCase()}
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
                    <span className="flex items-center gap-1 text-xs text-[#D4A843] bg-[#F5EDCF] px-2 py-0.5 rounded-full">
                      <Crown className="w-3 h-3" />
                      Owner
                    </span>
                  ) : isOwner ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.user_id)}
                      className="p-1 text-[var(--text-muted)] hover:text-[#7A5C44] opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">Member</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pending invitations */}
          {invitations.length > 0 && (
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
                        <Mail className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      </div>
                      <p className="text-sm text-[var(--text-secondary)]">{inv.invited_email}</p>
                    </div>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleCancelInvitation(inv.id)}
                        className="p-1 text-[var(--text-muted)] hover:text-[#7A5C44] opacity-0 group-hover:opacity-100 transition-opacity"
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
    </div>
  )
}
