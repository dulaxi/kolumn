import { useState } from 'react'
import { Check, Users, X } from '@phosphor-icons/react'
import { useWorkspacesStore } from '../store/workspacesStore'
import WorkspaceCreateModal from '../components/workspace/WorkspaceCreateModal'
import WorkspaceDetailView from '../components/workspace/WorkspaceDetailView'
import DynamicIcon from '../components/board/DynamicIcon'
import Button from '../components/ui/Button'
import Tooltip from '../components/ui/Tooltip'
import EmptyState from '../components/ui/EmptyState'
import { TOOLBAR_BTN, TOOLBAR_BTN_FILL_PRIMARY } from '../constants/buttonStyles'

/**
 * WorkspacePage — routes between two views:
 *  - Landing (activeWorkspaceId === null): centered illustration + action cards
 *  - Detail (activeWorkspaceId set): members, invite form, danger zone
 */
export default function WorkspacePage() {
  const workspaces = useWorkspacesStore((s) => s.workspaces)
  const activeWorkspaceId = useWorkspacesStore((s) => s.activeWorkspaceId)
  const invitations = useWorkspacesStore((s) => s.invitations)
  const acceptInvitation = useWorkspacesStore((s) => s.acceptInvitation)
  const declineInvitation = useWorkspacesStore((s) => s.declineInvitation)
  const [createOpen, setCreateOpen] = useState(false)
  const invitationsCount = invitations.length

  // Detail view when a workspace is active (and still exists)
  if (activeWorkspaceId && workspaces[activeWorkspaceId]) {
    return <WorkspaceDetailView workspaceId={activeWorkspaceId} />
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-10 w-full" style={{ maxWidth: 530 }}>
          {/* Illustration + heading */}
          <EmptyState
            klay="duo"
            klayLabel="Klay joined by a teammate"
            title="Your workspaces"
            body={
              <>
                Workspaces group your team's boards, members, and invitations.
                {' '}You have {Object.keys(workspaces).length} workspace{Object.keys(workspaces).length !== 1 ? 's' : ''}
                {invitationsCount > 0 ? ` and ${invitationsCount} pending invitation${invitationsCount !== 1 ? 's' : ''}` : ''}.
              </>
            }
            action={
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className={`${TOOLBAR_BTN} ${TOOLBAR_BTN_FILL_PRIMARY}`}
              >
                New workspace
              </button>
            }
          />

          {/* Pending invitations */}
          {invitations.length > 0 && (
            <div className="flex w-full flex-col gap-2">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Pending invitations</h2>
              {invitations.map((inv) => {
                const ws = inv.workspaces
                const inviter = inv.inviter
                return (
                  <div
                    key={inv.id}
                    className="flex items-center gap-3 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 shadow-sm"
                  >
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-[var(--surface-raised)] border-0.5 border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)]">
                      {ws?.icon ? (
                        <DynamicIcon name={ws.icon} className="w-5 h-5" />
                      ) : (
                        <Users className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex flex-1 min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                        {ws?.name || 'Workspace'}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] truncate">
                        Invited by {inviter?.display_name || inviter?.email || 'a teammate'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Tooltip content="Decline" placement="top">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => declineInvitation(inv.id)}
                          aria-label="Decline"
                          className="!rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </Tooltip>
                      <Button size="sm" onClick={() => acceptInvitation(inv.id)}>
                        <Check className="w-4 h-4" />
                        Accept
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <WorkspaceCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
