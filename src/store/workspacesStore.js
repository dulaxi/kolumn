import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'
import { logError } from '../utils/logger'
import { showToast } from '../utils/toast'
import { fetchProfilesByIds } from '../utils/supabaseHelpers'

/**
 * workspacesStore — the Workspaces feature (team/org containers).
 *
 * Tables: `workspaces`, `workspace_members`, `workspace_invitations`.
 *
 * Sits alongside `boardSharingStore` which handles the lightweight
 * per-board sharing flow (`board_members`, `board_invitations`). Boards
 * can live in either: workspace-scoped (workspace_id set) OR personal
 * (workspace_id null, optionally shared via board_members).
 */
export const useWorkspacesStore = create(
  persist(
    (set, get) => ({
      // ====== State ======
      workspaces: {},            // { [id]: { id, name, owner_id, icon } }
      members: {},               // { [workspaceId]: [{ user_id, display_name, icon, color, email, role }] }
      invitations: [],           // pending invitations received by current user
      sentInvitations: {},       // { [workspaceId]: [{ id, invited_email, invited_by, status }] }
      activeWorkspaceId: null,   // null = All workspaces (default), 'personal' = Personal, otherwise a workspace UUID
      loading: false,

      // ====== Setters ======
      setActiveWorkspace: (workspaceId) => set({ activeWorkspaceId: workspaceId }),

      // Reset all tenant-scoped state on sign-out / user-switch. Without this,
      // switching users in the same tab leaves the previous user's workspaces
      // briefly rendered in the sidebar before fresh fetches overwrite.
      resetStore: () => set({
        workspaces: {},
        members: {},
        invitations: [],
        sentInvitations: {},
        activeWorkspaceId: null,
        loading: false,
      }),

      // ====== Fetch ======
      fetchWorkspaces: async () => {
        const user = useAuthStore.getState().user
        if (!user) return

        set({ loading: true })
        try {
          // Inner-join with workspace_members on the current user's id so we ONLY
          // return workspaces where we're an actual member. Without this filter,
          // invited-but-unaccepted workspaces leak through (they're readable via
          // the invitees-can-read-workspaces RLS policy) and render in the
          // sidebar as if the user had already joined.
          const { data, error } = await supabase
            .from('workspaces')
            .select('id, name, owner_id, icon, created_at, updated_at, workspace_members!inner(user_id)')
            .eq('workspace_members.user_id', user.id)
            .order('created_at', { ascending: true })

          if (error) {
            logError('Failed to fetch workspaces:', error)
            set({ loading: false })
            return
          }

          const workspaces = {}
          ;(data || []).forEach((w) => {
            // Strip the inner-join side-effect field so it doesn't leak into state
            const { workspace_members: _wm, ...clean } = w
            workspaces[w.id] = clean
          })

          // Validate activeWorkspaceId — if the stored one is a UUID that no
          // longer exists, drop back to All (null). The 'personal' sentinel
          // is always valid (it's a virtual workspace, not a DB row).
          let { activeWorkspaceId } = get()
          if (
            activeWorkspaceId &&
            activeWorkspaceId !== 'personal' &&
            !workspaces[activeWorkspaceId]
          ) {
            activeWorkspaceId = null
          }

          set({ workspaces, activeWorkspaceId, loading: false })
        } catch (err) {
          logError('fetchWorkspaces failed:', err)
          set({ loading: false })
        }
      },

      fetchMembers: async (workspaceId) => {
        try {
          // Step 1: get membership rows (user_id + role). No embed —
          // workspace_members.user_id FKs to auth.users, not profiles, so PostgREST
          // can't auto-resolve a nested select.
          const { data: rows, error } = await supabase
            .from('workspace_members')
            .select('user_id, role')
            .eq('workspace_id', workspaceId)

          if (error) {
            logError('Failed to fetch workspace members:', error)
            return
          }

          const userIds = (rows || []).map((r) => r.user_id)
          if (userIds.length === 0) {
            set((s) => ({ members: { ...s.members, [workspaceId]: [] } }))
            return
          }

          const profileById = await fetchProfilesByIds(userIds)

          const members = rows.map((r) => {
            const p = profileById.get(r.user_id)
            return {
              user_id: r.user_id,
              display_name: p?.display_name || 'Unknown',
              icon: p?.icon || null,
              color: p?.color || 'bg-[var(--color-sand)]',
              email: p?.email || '',
              role: r.role,
            }
          })

          set((s) => ({ members: { ...s.members, [workspaceId]: members } }))
        } catch (err) {
          logError('fetchMembers failed:', err)
        }
      },

      fetchInvitations: async () => {
        // Use the auth user's email (set synchronously during initialize),
        // NOT profile.email — profile is fetched in a second round-trip, so
        // when AppLayout's [user]-scoped effect calls this, profile can still
        // be null. Using user.email closes that race.
        const user = useAuthStore.getState().user
        const email = user?.email?.toLowerCase()
        if (!email) return

        try {
          const { data, error } = await supabase
            .from('workspace_invitations')
            .select('id, workspace_id, invited_email, invited_by, status, created_at, workspaces(id, name, icon), inviter:profiles!workspace_invitations_invited_by_fkey(id, display_name, email)')
            .eq('invited_email', email)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

          if (error) {
            logError('Failed to fetch workspace invitations:', error)
            return
          }

          set({ invitations: data || [] })
        } catch (err) {
          logError('fetchInvitations failed:', err)
        }
      },

      fetchSentInvitations: async (workspaceId) => {
        try {
          const { data, error } = await supabase
            .from('workspace_invitations')
            .select('id, invited_email, invited_by, status, created_at')
            .eq('workspace_id', workspaceId)
            .eq('status', 'pending')

          if (error) {
            logError('Failed to fetch sent invitations:', error)
            return
          }

          set((s) => ({ sentInvitations: { ...s.sentInvitations, [workspaceId]: data || [] } }))
        } catch (err) {
          logError('fetchSentInvitations failed:', err)
        }
      },

      // ====== Realtime ======
      // Listen for workspace_invitation changes addressed to this user
      // and workspace_member changes for this user (so newly accepted
      // workspaces appear in the sidebar without a reload).
      subscribeToInvitations: (email, userId) => {
        if (!email) return () => {}
        const lower = email.toLowerCase()

        const channel = supabase
          .channel(`workspace-invites:${lower}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'workspace_invitations', filter: `invited_email=eq.${lower}` },
            () => { get().fetchInvitations() }
          )

        if (userId) {
          channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'workspace_members', filter: `user_id=eq.${userId}` },
            () => { get().fetchWorkspaces() }
          )
        }

        channel.subscribe()
        return () => supabase.removeChannel(channel)
      },

      // ====== Actions ======
      createWorkspace: async (name, icon = null) => {
        const user = useAuthStore.getState().user
        if (!user) return

        try {
          // Trigger auto-adds the owner as a member, which satisfies SELECT RLS
          const { data, error } = await supabase
            .from('workspaces')
            .insert({ name: name.trim() || 'Untitled workspace', owner_id: user.id, icon: icon || null })
            .select()
            .single()

          if (error) {
            logError('Failed to create workspace:', error)
            showToast.error('Failed to create workspace')
            return
          }

          set((s) => ({
            workspaces: { ...s.workspaces, [data.id]: data },
            activeWorkspaceId: data.id,
          }))

          return data.id
        } catch (err) {
          logError('createWorkspace failed:', err)
        }
      },

      renameWorkspace: async (workspaceId, name) => {
        const trimmed = name.trim()
        if (!trimmed) return
        try {
          const { error } = await supabase
            .from('workspaces')
            .update({ name: trimmed, updated_at: new Date().toISOString() })
            .eq('id', workspaceId)

          if (error) {
            logError('Failed to rename workspace:', error)
            return
          }
          set((s) => ({
            workspaces: { ...s.workspaces, [workspaceId]: { ...s.workspaces[workspaceId], name: trimmed } },
          }))
        } catch (err) {
          logError('renameWorkspace failed:', err)
        }
      },

      deleteWorkspace: async (workspaceId) => {
        try {
          const { error } = await supabase.from('workspaces').delete().eq('id', workspaceId)
          if (error) {
            logError('Failed to delete workspace:', error)
            showToast.error('Failed to delete workspace')
            return
          }
          set((s) => {
            const { [workspaceId]: _, ...rest } = s.workspaces
            return {
              workspaces: rest,
              activeWorkspaceId: s.activeWorkspaceId === workspaceId ? null : s.activeWorkspaceId,
            }
          })
        } catch (err) {
          logError('deleteWorkspace failed:', err)
        }
      },

      inviteToWorkspace: async (workspaceId, email) => {
        const user = useAuthStore.getState().user
        if (!user) return
        const trimmedEmail = (email || '').trim().toLowerCase()
        if (!trimmedEmail) return

        // Block self-invite. RLS would let the row through (the inviter
        // is also a member) and the user would see their own email in
        // the pending list, which is just confusing.
        if (user.email?.toLowerCase() === trimmedEmail) {
          showToast.error("You can't invite yourself")
          return
        }

        // Block invites to people who are already members or already
        // have a pending invitation. Cached in the store first; falls
        // back to a live query so a member added on another device
        // doesn't slip through stale local state.
        const cachedMembers = get().members[workspaceId] || []
        if (cachedMembers.some((m) => m.email?.toLowerCase() === trimmedEmail)) {
          showToast.error('Already a member of this workspace')
          return
        }

        const cachedInvites = get().sentInvitations[workspaceId] || []
        if (cachedInvites.some((inv) => inv.invited_email?.toLowerCase() === trimmedEmail && inv.status === 'pending')) {
          showToast.error('Already invited')
          return
        }

        try {
          // Live duplicate check — covers the case where membership /
          // invites changed on another device and the local cache is stale.
          const [{ data: memberRow }, { data: inviteRow }] = await Promise.all([
            supabase
              .from('workspace_members')
              .select('user_id, profiles!workspace_members_user_id_profiles_fkey(email)')
              .eq('workspace_id', workspaceId),
            supabase
              .from('workspace_invitations')
              .select('id, invited_email, status')
              .eq('workspace_id', workspaceId)
              .eq('status', 'pending')
              .eq('invited_email', trimmedEmail)
              .maybeSingle(),
          ])

          if ((memberRow || []).some((m) => m.profiles?.email?.toLowerCase() === trimmedEmail)) {
            showToast.error('Already a member of this workspace')
            return
          }
          if (inviteRow) {
            showToast.error('Already invited')
            return
          }

          const { error } = await supabase
            .from('workspace_invitations')
            .insert({ workspace_id: workspaceId, invited_email: trimmedEmail, invited_by: user.id, status: 'pending' })

          if (error) {
            logError('Failed to invite to workspace:', error)
            showToast.error('Failed to send invitation')
            return
          }
          showToast.success(`Invited ${trimmedEmail}`)
          get().fetchSentInvitations(workspaceId)
        } catch (err) {
          logError('inviteToWorkspace failed:', err)
        }
      },

      acceptInvitation: async (invitationId) => {
        try {
          const { error } = await supabase.rpc('accept_workspace_invitation', { invitation_id: invitationId })
          if (error) {
            logError('Failed to accept invitation:', error)
            showToast.error('Failed to accept invitation')
            return
          }
          await get().fetchWorkspaces()
          await get().fetchInvitations()
          // Joining a workspace grants read access to its boards. Pull the
          // boardStore back into sync so those boards appear in the sidebar
          // (otherwise the workspace shows up empty until the next full reload).
          // Lazy import avoids circular dep with boardStore.
          const { useBoardStore } = await import('./boardStore')
          await useBoardStore.getState().fetchBoards()
        } catch (err) {
          logError('acceptInvitation failed:', err)
        }
      },

      declineInvitation: async (invitationId) => {
        try {
          const { error } = await supabase.rpc('decline_workspace_invitation', { invitation_id: invitationId })
          if (error) {
            logError('Failed to decline invitation:', error)
            return
          }
          await get().fetchInvitations()
        } catch (err) {
          logError('declineInvitation failed:', err)
        }
      },

      cancelInvitation: async (invitationId, workspaceId) => {
        try {
          const { error } = await supabase.from('workspace_invitations').delete().eq('id', invitationId)
          if (error) {
            logError('Failed to cancel invitation:', error)
            return
          }
          get().fetchSentInvitations(workspaceId)
        } catch (err) {
          logError('cancelInvitation failed:', err)
        }
      },

      leaveWorkspace: async (workspaceId) => {
        try {
          const { error } = await supabase.rpc('leave_workspace', { target_workspace_id: workspaceId })
          if (error) {
            logError('Failed to leave workspace:', error)
            showToast.error(error.message || 'Failed to leave workspace')
            return
          }
          set((s) => {
            const { [workspaceId]: _, ...rest } = s.workspaces
            return {
              workspaces: rest,
              activeWorkspaceId: s.activeWorkspaceId === workspaceId ? null : s.activeWorkspaceId,
            }
          })
          // Leaving revokes read access to that workspace's boards. Resync
          // boardStore + sharedBoards so the now-inaccessible boards drop out
          // of the sidebar, Home grid, AllBoards view, etc. Lazy import avoids
          // circular dep.
          const { useBoardStore } = await import('./boardStore')
          const { useBoardSharingStore } = await import('./boardSharingStore')
          await Promise.all([
            useBoardStore.getState().fetchBoards(),
            useBoardSharingStore.getState().fetchSharedBoards(),
          ])
        } catch (err) {
          logError('leaveWorkspace failed:', err)
        }
      },

      removeMember: async (workspaceId, userId) => {
        try {
          const { error } = await supabase
            .from('workspace_members')
            .delete()
            .eq('workspace_id', workspaceId)
            .eq('user_id', userId)
          if (error) {
            logError('Failed to remove member:', error)
            showToast.error('Failed to remove member')
            return
          }
          get().fetchMembers(workspaceId)
        } catch (err) {
          logError('removeMember failed:', err)
        }
      },
    }),
    {
      name: 'kolumn-workspaces',
      // Persist only activeWorkspaceId so a refresh keeps the user in the
      // same workspace they were viewing. Server data (workspaces, members,
      // invitations) is always re-fetched — RLS is the source of truth.
      // fetchWorkspaces validates this id against the live membership list
      // and resets to null (Personal) if the workspace is gone or access
      // was revoked, so a stale id can't make personal boards look missing.
      partialize: (state) => ({ activeWorkspaceId: state.activeWorkspaceId }),
    }
  )
)
