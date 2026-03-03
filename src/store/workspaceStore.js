import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'
import { useBoardStore } from './boardStore'

export const useWorkspaceStore = create((set, get) => ({
  invitations: [],
  sharedBoards: [],
  loading: false,

  // ============================================================
  // FETCH INVITATIONS
  // ============================================================
  fetchInvitations: async () => {
    const profile = useAuthStore.getState().profile
    if (!profile?.email) return

    set({ loading: true })

    try {
      const { data, error } = await supabase
        .from('board_invitations')
        .select(`
          id,
          board_id,
          invited_email,
          invited_by,
          status,
          created_at,
          boards(id, name, icon),
          inviter:profiles!board_invitations_invited_by_profiles_fkey(id, display_name, email, color)
        `)
        .eq('invited_email', profile.email)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to fetch invitations:', error)
        set({ loading: false })
        return
      }

      set({ invitations: data || [], loading: false })
    } catch (err) {
      console.error('fetchInvitations failed:', err)
      set({ loading: false })
    }
  },

  // ============================================================
  // FETCH SHARED BOARDS
  // ============================================================
  fetchSharedBoards: async () => {
    const user = useAuthStore.getState().user
    if (!user) return

    set({ loading: true })

    try {
      // Get boards where the user is a member but NOT the owner
      const { data: memberships, error: memberError } = await supabase
        .from('board_members')
        .select(`
          board_id,
          role,
          created_at,
          boards(id, name, icon, owner_id, created_at)
        `)
        .eq('user_id', user.id)
        .neq('role', 'owner')

      if (memberError) {
        console.error('Failed to fetch shared boards:', memberError)
        set({ loading: false })
        return
      }

      if (!memberships?.length) {
        set({ sharedBoards: [], loading: false })
        return
      }

      // Collect unique owner IDs and board IDs for enrichment
      const ownerIds = [...new Set(memberships.map((m) => m.boards?.owner_id).filter(Boolean))]
      const boardIds = memberships.map((m) => m.board_id)

      // Fetch owner profiles and member counts in parallel
      const [profilesRes, countsRes] = await Promise.all([
        ownerIds.length > 0
          ? supabase.from('profiles').select('id, display_name, color').in('id', ownerIds)
          : { data: [], error: null },
        supabase
          .from('board_members')
          .select('board_id', { count: 'exact', head: false })
          .in('board_id', boardIds),
      ])

      if (profilesRes.error) console.error('Failed to fetch owner profiles:', profilesRes.error)
      if (countsRes.error) console.error('Failed to fetch member counts:', countsRes.error)

      // Build lookup maps
      const ownerMap = {}
      ;(profilesRes.data || []).forEach((p) => { ownerMap[p.id] = p })

      const countMap = {}
      ;(countsRes.data || []).forEach((row) => {
        countMap[row.board_id] = (countMap[row.board_id] || 0) + 1
      })

      // Enrich shared boards
      const sharedBoards = memberships
        .filter((m) => m.boards) // skip if board was deleted
        .map((m) => {
          const ownerProfile = ownerMap[m.boards.owner_id]
          return {
            ...m.boards,
            ownerName: ownerProfile?.display_name || 'Unknown',
            ownerColor: ownerProfile?.color || 'bg-gray-300',
            memberCount: countMap[m.board_id] || 0,
          }
        })

      set({ sharedBoards, loading: false })
    } catch (err) {
      console.error('fetchSharedBoards failed:', err)
      set({ loading: false })
    }
  },

  // ============================================================
  // ACCEPT INVITATION
  // ============================================================
  acceptInvitation: async (invitationId) => {
    const user = useAuthStore.getState().user
    if (!user) return

    const invitation = get().invitations.find((inv) => inv.id === invitationId)
    if (!invitation) {
      console.error('acceptInvitation: invitation not found in local state', invitationId)
      return
    }

    try {
      // Add user as board member
      const { error: memberError } = await supabase
        .from('board_members')
        .insert({ board_id: invitation.board_id, user_id: user.id, role: 'member' })

      if (memberError) {
        console.error('Failed to add board member:', memberError)
        return
      }

      // Update invitation status to accepted
      const { error: updateError } = await supabase
        .from('board_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId)

      if (updateError) {
        console.error('Failed to update invitation status:', updateError)
        return
      }

      // Refetch invitations, shared boards, and board store
      await Promise.all([
        get().fetchInvitations(),
        get().fetchSharedBoards(),
        useBoardStore.getState().fetchBoards(),
      ])
    } catch (err) {
      console.error('acceptInvitation failed:', err)
    }
  },

  // ============================================================
  // DECLINE INVITATION
  // ============================================================
  declineInvitation: async (invitationId) => {
    try {
      const { error } = await supabase
        .from('board_invitations')
        .update({ status: 'declined' })
        .eq('id', invitationId)

      if (error) {
        console.error('Failed to decline invitation:', error)
        return
      }

      await get().fetchInvitations()
    } catch (err) {
      console.error('declineInvitation failed:', err)
    }
  },
}))
