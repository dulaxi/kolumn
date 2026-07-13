import { X } from '@phosphor-icons/react'
import DynamicIcon from '../board/DynamicIcon'
import Skeleton from '../ui/Skeleton'
import { getAvatarColor, getAvatarTextColor, getInitials } from '../../utils/formatting'

export default function WorkspaceMembers({ members, membersLoaded, currentUserId, isOwner, onRemove }) {
  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">Members</h2>
      <p className="mt-1 text-xs text-[var(--text-muted)]">Everyone in this workspace can see all its boards and be assigned to cards.</p>

      <div className="mt-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] overflow-hidden">
        {!membersLoaded ? (
          <ul className="divide-y divide-[var(--border-default)]">
            {[0, 1].map((i) => (
              <li key={`sk-${i}`} className="flex items-center gap-3 px-4 py-3">
                <Skeleton variant="circle" width={32} height={32} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <Skeleton variant="line" width={112} height={12} />
                  <Skeleton variant="line" width={144} height={10} className="mt-1.5 opacity-60" />
                </div>
              </li>
            ))}
          </ul>
        ) : members.length === 0 ? (
          <div className="p-4 text-sm text-[var(--text-muted)]">No members yet.</div>
        ) : (
          <ul className="divide-y divide-[var(--border-default)]">
            {members.map((m) => {
              const isSelf = m.user_id === currentUserId
              const bg = m.color || getAvatarColor(m.display_name || 'User')
              const textColor = getAvatarTextColor(bg)
              return (
                <li key={m.user_id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${bg} ${textColor}`}>
                    {m.icon ? (
                      <DynamicIcon name={m.icon} className="w-4 h-4" />
                    ) : (
                      <span className="text-xs font-medium">{getInitials(m.display_name || 'U')}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {m.display_name}{isSelf ? ' (you)' : ''}
                      </span>
                      {m.role === 'owner' && (
                        <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-[var(--surface-hover)] text-[var(--text-muted)]">Owner</span>
                      )}
                    </div>
                    {m.email && (
                      <div className="text-xs text-[var(--text-muted)] truncate">{m.email}</div>
                    )}
                  </div>
                  {isOwner && m.role !== 'owner' && (
                    <button
                      type="button"
                      onClick={() => onRemove(m.user_id)}
                      aria-label={`Remove ${m.display_name}`}
                      className="h-8 w-8 rounded-md inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
