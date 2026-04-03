import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'
import { useBoardStore } from './boardStore'
import { logError } from '../utils/logger'

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
        logError('Failed to fetch invitations:', error)
        set({ loading: false })
        return
      }

      set({ invitations: data || [], loading: false })
    } catch (err) {
      logError('fetchInvitations failed:', err)
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
        logError('Failed to fetch shared boards:', memberError)
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

      if (profilesRes.error) logError('Failed to fetch owner profiles:', profilesRes.error)
      if (countsRes.error) logError('Failed to fetch member counts:', countsRes.error)

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
            ownerColor: ownerProfile?.color || 'bg-[#E0DBD5]',
            memberCount: countMap[m.board_id] || 0,
          }
        })

      set({ sharedBoards, loading: false })
    } catch (err) {
      logError('fetchSharedBoards failed:', err)
      set({ loading: false })
    }
  },

  // ============================================================
  // ACCEPT INVITATION (via RPC — atomic, bypasses RLS complexity)
  // ============================================================
  acceptInvitation: async (invitationId) => {
    try {
      const { error } = await supabase.rpc('accept_invitation', {
        invitation_id: invitationId,
      })

      if (error) {
        logError('Failed to accept invitation:', error)
        return
      }

      await Promise.all([
        get().fetchInvitations(),
        get().fetchSharedBoards(),
        useBoardStore.getState().fetchBoards(),
      ])
    } catch (err) {
      logError('acceptInvitation failed:', err)
    }
  },

  // ============================================================
  // DECLINE INVITATION (via RPC)
  // ============================================================
  declineInvitation: async (invitationId) => {
    try {
      const { error } = await supabase.rpc('decline_invitation', {
        invitation_id: invitationId,
      })

      if (error) {
        logError('Failed to decline invitation:', error)
        return
      }

      await get().fetchInvitations()
    } catch (err) {
      logError('declineInvitation failed:', err)
    }
  },

  // ============================================================
  // LEAVE BOARD (via RPC)
  // ============================================================
  leaveBoard: async (boardId) => {
    try {
      const { error } = await supabase.rpc('leave_board', {
        target_board_id: boardId,
      })

      if (error) {
        logError('Failed to leave board:', error)
        return
      }

      await Promise.all([
        get().fetchSharedBoards(),
        useBoardStore.getState().fetchBoards(),
      ])
    } catch (err) {
      logError('leaveBoard failed:', err)
    }
  },
}))
