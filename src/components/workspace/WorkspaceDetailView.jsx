import { useEffect, useMemo } from 'react'
import { useWorkspacesStore } from '../../store/workspacesStore'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../lib/supabase'
import WorkspaceHeader from './WorkspaceHeader'
import WorkspaceMembers from './WorkspaceMembers'
import WorkspaceInvitations from './WorkspaceInvitations'
import WorkspaceDangerZone from './WorkspaceDangerZone'
import NotFoundState from '../ui/NotFoundState'

// Stable empty-array reference — if put inline as `|| []` inside a Zustand selector,
// useSyncExternalStore sees a new reference every render and re-renders infinitely.
const EMPTY = []

export default function WorkspaceDetailView({ workspaceId }) {
  const user = useAuthStore((s) => s.user)

  const workspace = useWorkspacesStore((s) => s.workspaces[workspaceId])
  const membersLoaded = useWorkspacesStore((s) => workspaceId in s.members)
  const members = useWorkspacesStore((s) => s.members[workspaceId]) || EMPTY
  const sentInvitations = useWorkspacesStore((s) => s.sentInvitations[workspaceId]) || EMPTY

  const fetchMembers = useWorkspacesStore((s) => s.fetchMembers)
  const fetchSentInvitations = useWorkspacesStore((s) => s.fetchSentInvitations)
  const renameWorkspace = useWorkspacesStore((s) => s.renameWorkspace)
  const inviteToWorkspace = useWorkspacesStore((s) => s.inviteToWorkspace)
  const cancelInvitation = useWorkspacesStore((s) => s.cancelInvitation)
  const removeMember = useWorkspacesStore((s) => s.removeMember)
  const deleteWorkspace = useWorkspacesStore((s) => s.deleteWorkspace)
  const leaveWorkspace = useWorkspacesStore((s) => s.leaveWorkspace)

  const isOwner = !!(workspace && user && workspace.owner_id === user.id)

  useEffect(() => {
    if (!workspaceId) return
    fetchMembers(workspaceId)
    fetchSentInvitations(workspaceId)

    // Live-refresh when membership or invitations change from other clients —
    // without this, a member leaving / being removed / accepting an invite
    // would stay stale in the viewer's panel until the page remounted.
    const channel = supabase
      .channel(`ws-members-${workspaceId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'workspace_members',
        filter: `workspace_id=eq.${workspaceId}`,
      }, () => { fetchMembers(workspaceId) })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'workspace_invitations',
        filter: `workspace_id=eq.${workspaceId}`,
      }, () => { fetchSentInvitations(workspaceId) })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [workspaceId, fetchMembers, fetchSentInvitations])

  const ownerMember = useMemo(
    () => members.find((m) => m.role === 'owner'),
    [members],
  )

  if (!workspace) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <NotFoundState
          title="This workspace isn't here"
          body="You may have been removed from it, or it was deleted."
          actions={[{ label: 'All workspaces', to: '/workspace' }]}
        />
      </div>
    )
  }

  const handleRename = async (name) => {
    await renameWorkspace(workspaceId, name)
  }

  const handleIconChange = async (name) => {
    const { error } = await supabase
      .from('workspaces')
      .update({ icon: name })
      .eq('id', workspaceId)
    if (!error) {
      useWorkspacesStore.setState((s) => ({
        workspaces: { ...s.workspaces, [workspaceId]: { ...s.workspaces[workspaceId], icon: name } },
      }))
    }
  }

  return (
    <div className="w-full">
      <WorkspaceHeader
        workspace={workspace}
        isOwner={isOwner}
        memberCount={members.length}
        ownerName={ownerMember?.display_name}
        onRename={handleRename}
        onIconChange={handleIconChange}
      />

      <WorkspaceMembers
        members={members}
        membersLoaded={membersLoaded}
        currentUserId={user?.id}
        isOwner={isOwner}
        onRemove={(userId) => removeMember(workspaceId, userId)}
      />

      {isOwner && (
        <WorkspaceInvitations
          sentInvitations={sentInvitations}
          onInvite={(email) => inviteToWorkspace(workspaceId, email)}
          onCancelInvitation={(id) => cancelInvitation(id, workspaceId)}
        />
      )}

      <WorkspaceDangerZone
        isOwner={isOwner}
        onDelete={() => deleteWorkspace(workspaceId)}
        onLeave={() => leaveWorkspace(workspaceId)}
      />
    </div>
  )
}
