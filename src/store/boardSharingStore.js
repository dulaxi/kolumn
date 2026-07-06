import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'
import { useBoardStore } from './boardStore'
import { logError } from '../utils/logger'
import { showToast } from '../utils/toast'
import { fetchProfilesByIds } from '../utils/supabaseHelpers'

/**
 * boardSharingStore — legacy per-board sharing (one-off invites to a single board).
 *
 * Distinct from `workspacesStore` which owns the newer team-level Workspaces
 * feature. Board sharing stays as a lightweight way to share a personal board
 * without creating a whole workspace (e.g. one-off client access). If board
 * sharing is ever retired, all of this — plus the `board_members` /
 * `board_invitations` tables — can be removed in one sweep.
 *
 * Renamed from `workspaceStore` in CL-1 so the two concerns don't collide
 * in imports and so the singular/plural difference stops being load-bearing.
 */
export const useBoardSharingStore = create((set, get) => ({
  invitations: [],
  sharedBoards: [],
  // Per-board caches for the share modal. Shape:
  //   boardMembers:        { [boardId]: [{ user_id, role, profiles: {...} }] }
  //   boardSentInvitations:{ [boardId]: [{ id, invited_email, status, ... }] }
  //
  // SWR pattern: the modal reads these instantly (no spinner) on subsequent
  // opens, then `fetchBoardMembers` / `fetchBoardSentInvitations` refresh
  // them in the background. Realtime on `board_members` already keeps the
  // member list current while the user has the app open.
  boardMembers: {},
  boardSentInvitations: {},
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  // Clear all state on sign-out / user-switch so the next user doesn't see the
  // previous user's shared boards or pending invitations during the fetch gap.
  resetStore: () => set({
    invitations: [],
    sharedBoards: [],
    boardMembers: {},
    boardSentInvitations: {},
    loading: false,
    error: null,
  }),

  // ============================================================
  // PER-BOARD MEMBERS (SWR cache)
  // ============================================================
  fetchBoardMembers: async (boardId) => {
    if (!boardId) return
    const { data, error } = await supabase
      .from('board_members')
      .select('user_id, role, profiles!board_members_user_id_profiles_fkey(id, email, display_name, icon, color)')
      .eq('board_id', boardId)
    if (error) {
      logError('fetchBoardMembers failed:', error)
      return
    }
    set((s) => ({ boardMembers: { ...s.boardMembers, [boardId]: data || [] } }))
  },

  fetchBoardSentInvitations: async (boardId) => {
    if (!boardId) return
    const { data, error } = await supabase
      .from('board_invitations')
      .select('*')
      .eq('board_id', boardId)
      .eq('status', 'pending')
    if (error) {
      logError('fetchBoardSentInvitations failed:', error)
      return
    }
    set((s) => ({ boardSentInvitations: { ...s.boardSentInvitations, [boardId]: data || [] } }))
  },

  // Local-only mutators — used by BoardShareModal for optimistic updates.
  // The next background fetch reconciles any drift from the server.
  removeBoardMemberLocal: (boardId, userId) => set((s) => ({
    boardMembers: {
      ...s.boardMembers,
      [boardId]: (s.boardMembers[boardId] || []).filter((m) => m.user_id !== userId),
    },
  })),

  addBoardSentInvitationLocal: (boardId, invitation) => set((s) => ({
    boardSentInvitations: {
      ...s.boardSentInvitations,
      [boardId]: [...(s.boardSentInvitations[boardId] || []), invitation],
    },
  })),

  removeBoardSentInvitationLocal: (boardId, invitationId) => set((s) => ({
    boardSentInvitations: {
      ...s.boardSentInvitations,
      [boardId]: (s.boardSentInvitations[boardId] || []).filter((i) => i.id !== invitationId),
    },
  })),

  // ============================================================
  // FETCH INVITATIONS
  // ============================================================
  fetchInvitations: async () => {
    // Use user.email (synchronous with user in authStore) instead of
    // profile.email — profile is a separate round-trip and AppLayout's
    // [user] effect fires before it lands, which used to cause this
    // function to silently return with no invitations.
    const user = useAuthStore.getState().user
    const email = user?.email?.toLowerCase()
    if (!email) return

    if (get().invitations.length === 0 && get().sharedBoards.length === 0) set({ loading: true })

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
        .eq('invited_email', email)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) {
        logError('Failed to fetch invitations:', error)
        showToast.error('Failed to load invitations')
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

    if (get().invitations.length === 0 && get().sharedBoards.length === 0) set({ loading: true })

    try {
      // Boards where the user is a member but NOT the owner AND not a workspace
      // board (workspace boards have their own sidebar section and shouldn't
      // double-appear under "Shared with me").
      const { data: memberships, error: memberError } = await supabase
        .from('board_members')
        .select(`
          board_id,
          role,
          created_at,
          boards(id, name, icon, owner_id, workspace_id, created_at)
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

      // Filter out workspace boards — they render under their workspace heading
      const personalShared = memberships.filter((m) => m.boards && !m.boards.workspace_id)
      const ownerIds = [...new Set(personalShared.map((m) => m.boards?.owner_id).filter(Boolean))]
      const boardIds = personalShared.map((m) => m.board_id)

      if (boardIds.length === 0) {
        set({ sharedBoards: [], loading: false })
        return
      }

      const [ownerMap, countsRes] = await Promise.all([
        fetchProfilesByIds(ownerIds, 'id, display_name, color'),
        supabase
          .from('board_members')
          .select('board_id', { count: 'exact', head: false })
          .in('board_id', boardIds),
      ])

      if (countsRes.error) logError('Failed to fetch member counts:', countsRes.error)

      const countMap = {}
      ;(countsRes.data || []).forEach((row) => {
        countMap[row.board_id] = (countMap[row.board_id] || 0) + 1
      })

      const sharedBoards = personalShared.map((m) => {
        const ownerProfile = ownerMap.get(m.boards.owner_id)
        return {
          ...m.boards,
          ownerName: ownerProfile?.display_name || 'Unknown',
          ownerColor: ownerProfile?.color || 'bg-[var(--color-sand)]',
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
        showToast.error('Failed to accept invitation')
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
        showToast.error('Failed to decline invitation')
        return
      }

      await get().fetchInvitations()
    } catch (err) {
      logError('declineInvitation failed:', err)
    }
  },

  // ============================================================
  // REALTIME SUBSCRIPTION
  // ============================================================
  // Listen for new / removed `board_invitations` rows addressed to this
  // user's email so the bell + sub-sidebar update without a reload.
  // Also listens on `board_members` so newly accepted shares appear in
  // "Shared with me" the moment another user shares a board with us.
  subscribeToInvitations: (email, userId) => {
    if (!email) return () => {}
    const lower = email.toLowerCase()

    const channel = supabase
      .channel(`board-invites:${lower}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'board_invitations', filter: `invited_email=eq.${lower}` },
        () => { get().fetchInvitations() }
      )

    if (userId) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'board_members', filter: `user_id=eq.${userId}` },
        () => { get().fetchSharedBoards() }
      )
    }

    channel.subscribe()
    return () => supabase.removeChannel(channel)
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
        showToast.error('Failed to leave board')
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
