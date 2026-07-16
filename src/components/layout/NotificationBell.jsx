import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ArrowRight, At, Bell, ChatCircle, Check, Kanban, UserPlus, Users, X } from '@phosphor-icons/react'
import { useNotificationStore } from '../../store/notificationStore'
import { useBoardStore } from '../../store/boardStore'
import { useBoardSharingStore } from '../../store/boardSharingStore'
import { useWorkspacesStore } from '../../store/workspacesStore'
import Popover from '../ui/Popover'
import Tooltip from '../ui/Tooltip'

/* ─── shared bits used by both invitation + notification rows ───── */

const ROW_BASE =
  'flex items-start gap-2.5 w-full px-4 py-2.5 text-left ' +
  'border-b border-[var(--border-subtle)] last:border-b-0 ' +
  'transition-colors'

const ICON_BASE = 'mt-0.5 shrink-0'
const ICON_SIZE = 'w-3.5 h-3.5'

function SectionLabel({ children }) {
  return (
    <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
      {children}
    </p>
  )
}

function AcceptButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 h-6 px-2 text-[11px] font-medium rounded-md bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:bg-[var(--btn-primary-hover)] transition-colors"
    >
      <Check className="w-3 h-3" weight="bold" />
      Accept
    </button>
  )
}

function DeclineButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 h-6 px-2 text-[11px] font-medium rounded-md text-[var(--text-muted)] hover:text-[var(--color-copper)] hover:bg-[var(--surface-hover)] transition-colors"
    >
      <X className="w-3 h-3" weight="bold" />
      Decline
    </button>
  )
}

/* Single invitation row — same shell for board and workspace types,
   the only differences are the icon and the body copy. */
function InvitationRow({ icon, body, onAccept, onDecline }) {
  return (
    <div className={ROW_BASE}>
      <div className={ICON_BASE}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-[var(--text-secondary)] leading-snug">{body}</p>
        <div className="flex items-center gap-1 mt-2">
          <AcceptButton onClick={onAccept} />
          <DeclineButton onClick={onDecline} />
        </div>
      </div>
    </div>
  )
}

/* ─── component ─────────────────────────────────────────────────── */

// `placement` controls the dropdown panel's anchor.
// `tooltipPlacement` (optional) overrides the hover-tooltip anchor —
// pass "right" when the bell is in a collapsed sidebar so the tooltip
// flies out sideways instead of clipping against the narrow column.
export default function NotificationBell({ placement = 'top', tooltipPlacement }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const notifications = useNotificationStore((s) => s.notifications)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const markAsRead = useNotificationStore((s) => s.markAsRead)
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead)
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard)

  // Board invitations: actionable in the bell (Accept / Decline inline).
  // Workspace invitations: visible in the bell as a passive notice that
  // routes the user to the Workspace page (which is where the actual
  // accept/decline UI lives — single source of truth for workspace flow).
  const boardInvitations = useBoardSharingStore((s) => s.invitations)
  const acceptBoardInvitation = useBoardSharingStore((s) => s.acceptInvitation)
  const declineBoardInvitation = useBoardSharingStore((s) => s.declineInvitation)
  const workspaceInvitations = useWorkspacesStore((s) => s.invitations)

  const invitationCount = boardInvitations.length + workspaceInvitations.length
  // Badge counts unread notifications + pending invitations; both are
  // "things requiring your attention."
  const badgeCount = unreadCount + invitationCount
  const isEmpty = notifications.length === 0 && invitationCount === 0
  // Section labels render only when both kinds of items are present —
  // a single section reads cleanly without a header above it.
  const showSectionLabels = invitationCount > 0 && notifications.length > 0

  const popoverPlacement = placement === 'top' ? 'top-start' : 'bottom-end'
  const finalTooltipPlacement = tooltipPlacement || (placement === 'top' ? 'top' : 'bottom')

  const panel = (
    <div className="w-80 -m-1 overflow-hidden rounded-[10px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-subtle)]">
        <span className="text-sm font-semibold text-[var(--text-primary)]">Notifications</span>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto">
        {/* Invitations — actionable, sit at the top */}
        {invitationCount > 0 && (
          <>
            {showSectionLabels && <SectionLabel>Invitations</SectionLabel>}
            {boardInvitations.map((inv) => {
              const boardName = inv.boards?.name || 'Untitled board'
              const inviter = inv.inviter?.display_name || inv.inviter?.email || 'Someone'
              return (
                <InvitationRow
                  key={`board-inv-${inv.id}`}
                  icon={<Kanban className={`${ICON_SIZE} text-[var(--color-mauve)]`} />}
                  body={
                    <>
                      <span className="font-medium">{inviter}</span> invited you to{' '}
                      <span className="font-medium text-[var(--text-primary)]">{boardName}</span>
                    </>
                  }
                  onAccept={() => acceptBoardInvitation(inv.id)}
                  onDecline={() => declineBoardInvitation(inv.id)}
                />
              )
            })}
            {/* Workspace invitations — passive notice. Clicking the row
                navigates to /workspace where the actual Accept/Decline
                UI lives (single source of truth for workspace flow). */}
            {workspaceInvitations.map((inv) => {
              const wsName = inv.workspaces?.name || inv.workspace?.name || 'Workspace'
              const inviter = inv.inviter?.display_name || inv.inviter?.email || 'Someone'
              return (
                <button
                  key={`ws-inv-${inv.id}`}
                  type="button"
                  onClick={() => { setOpen(false); navigate('/workspace') }}
                  className={`${ROW_BASE} hover:bg-[var(--surface-raised)] cursor-pointer`}
                >
                  <div className={ICON_BASE}>
                    <Users className={`${ICON_SIZE} text-[var(--color-mauve)]`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-[var(--text-secondary)] leading-snug">
                      <span className="font-medium">{inviter}</span> invited you to the{' '}
                      <span className="font-medium text-[var(--text-primary)]">{wsName}</span> workspace
                    </p>
                    <p className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-[var(--text-muted)]">
                      Manage in Workspace
                      <ArrowRight className="w-3 h-3" weight="bold" />
                    </p>
                  </div>
                </button>
              )
            })}
          </>
        )}

        {/* Notifications — passive, sit below invitations */}
        {notifications.length > 0 && (
          <>
            {showSectionLabels && <SectionLabel>Activity</SectionLabel>}
            {notifications.map((n) => {
              const icon =
                n.type === 'mention' ? <At className={`${ICON_SIZE} text-[var(--color-lime-dark)]`} />
                  : n.type === 'assigned' ? <UserPlus className={`${ICON_SIZE} text-[var(--color-lime-dark)]`} />
                  : n.type === 'moved' ? <ArrowRight className={`${ICON_SIZE} text-[var(--color-mauve)]`} />
                  : <ChatCircle className={`${ICON_SIZE} text-[var(--text-faint)]`} />

              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    if (!n.read) markAsRead(n.id)
                    if (n.card_id && n.board_id) {
                      setActiveBoard(n.board_id)
                      setOpen(false)
                      navigate('/boards')
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('kolumn:open-card', { detail: { cardId: n.card_id } }))
                      }, 100)
                    }
                  }}
                  className={`${ROW_BASE} hover:bg-[var(--surface-raised)] cursor-pointer ${
                    !n.read ? 'bg-[var(--surface-raised)]' : ''
                  }`}
                >
                  <div className={ICON_BASE}>{icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-[var(--text-secondary)] leading-snug">
                      <span className="font-medium">{n.actor_name || 'Someone'}</span>{' '}
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">{n.body}</p>
                    )}
                    <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-[var(--color-lime)] shrink-0" />
                  )}
                </button>
              )
            })}
          </>
        )}

        {/* Empty state — only when both sections are empty */}
        {isEmpty && (
          <p className="px-4 py-8 text-sm text-[var(--text-muted)] text-center">No notifications yet</p>
        )}
      </div>
    </div>
  )

  return (
    <Popover open={open} onOpenChange={setOpen} placement={popoverPlacement} panel={panel} panelClassName="p-0 overflow-hidden" className="inline-flex">
      <Tooltip content="Notifications" placement={finalTooltipPlacement} disabled={open}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={`Notifications${badgeCount > 0 ? ` (${badgeCount} pending)` : ''}`}
          className="relative p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors shrink-0 inline-flex items-center justify-center"
        >
          <Bell size={18} weight={open ? 'fill' : 'regular'} />
          {badgeCount > 0 && (
            <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-[var(--color-copper)] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {badgeCount > 9 ? '9+' : badgeCount}
            </span>
          )}
        </button>
      </Tooltip>
    </Popover>
  )
}
