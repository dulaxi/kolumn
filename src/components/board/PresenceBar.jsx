import { usePresenceStore } from '../../store/presenceStore'
import { othersOf } from '../../store/presence'
import { useAuthStore } from '../../store/authStore'
import { resolveProfileColor } from '../../constants/colors'
import DynamicIcon from './DynamicIcon'
import Tooltip from '../ui/Tooltip'
import { getInitials } from '../../utils/formatting'

function PresenceAvatar({ member }) {
  const { style, fallbackClass } = resolveProfileColor(member.color)
  return (
    <span
      className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] font-medium -ml-2 first:ml-0 ring-2 ring-[var(--surface-page)] ${member.icon ? fallbackClass : 'bg-[var(--surface-hover)] text-[var(--text-secondary)]'}`}
      style={member.icon ? style : undefined}
    >
      {member.icon ? <DynamicIcon name={member.icon} className="w-3.5 h-3.5" /> : getInitials(member.name).toLowerCase()}
    </span>
  )
}

// Live "who's on this board" — the current user is excluded (you know you're here).
export default function PresenceBar() {
  const members = usePresenceStore((s) => s.members)
  const selfId = useAuthStore((s) => s.profile?.id)
  const others = othersOf(members, selfId)
  if (others.length === 0) return null

  const shown = others.slice(0, 4)
  const overflow = others.length - shown.length
  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className="flex">
        {shown.map((mem) => (
          <Tooltip key={mem.user_id} content={mem.name} placement="bottom">
            <PresenceAvatar member={mem} />
          </Tooltip>
        ))}
        {overflow > 0 && (
          <span className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-semibold -ml-2 ring-2 ring-[var(--surface-page)] bg-[var(--surface-hover)] text-[var(--text-secondary)]">
            +{overflow}
          </span>
        )}
      </span>
      <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">{others.length} here</span>
    </div>
  )
}
