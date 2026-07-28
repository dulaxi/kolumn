import { useState } from 'react'
import { Check, Plus, User, X } from '@phosphor-icons/react'
import Avatar from '../../ui/Avatar'
import DynamicIcon from '../DynamicIcon'
import Popover from '../../ui/Popover'
import Tooltip from '../../ui/Tooltip'
import { resolveProfileColor } from '../../../constants/colors'

const SIZES = {
  sm: {
    avatar: 'w-5 h-5',
    glyph: 'w-3 h-3',
    overflowText: 'text-[9px]',
    spacing: '-space-x-1.5',
    avatarSize: 'sm',
  },
  lg: {
    // 32px everywhere — must equal Avatar's `lg` so members, the
    // profile-icon avatar, and the +N bubble are all the same circle.
    avatar: 'w-8 h-8',
    glyph: 'w-4 h-4',
    overflowText: 'text-[10px]',
    spacing: '-space-x-2',
    avatarSize: 'lg',
  },
}

// `assignees` is an array of { name, id } refs. Members carry their user id
// (captured here at pick time); free-text entries carry id: null.
export default function AssigneePicker({
  assignees,
  setAssignees,
  members = [],
  profile,
  scheduleSave,
  open,
  onOpenChange,
  size = 'lg',
  placement = 'bottom-end',
}) {
  const [search, setSearch] = useState('')

  // Parent keeps its named-menu state ('assignee' | null); Popover speaks
  // booleans — normalize here so both call sites stay untouched.
  const setOpen = (next) => onOpenChange(next ? 'assignee' : null)

  const sz = SIZES[size] || SIZES.lg
  const isMeName = (n) => profile?.display_name && n.trim().toLowerCase() === profile.display_name.trim().toLowerCase()
  // Identity: a member ref is me by id; a free-text ref falls back to name.
  const isMeRef = (ref) => (ref.id ? ref.id === profile?.id : isMeName(ref.name))
  const { style: profileStyle, fallbackClass: profileFallback } = resolveProfileColor(profile?.color)

  const maxVisible = 3
  const visible = assignees.slice(0, maxVisible)
  const overflow = Math.max(0, assignees.length - maxVisible)

  const commit = (next) => { setAssignees(next); scheduleSave?.() }

  // Toggle a real member — matched by id so two members with the same name
  // never collide.
  const toggleMember = (member) => {
    const has = assignees.some((a) => a.id === member.id)
    commit(has
      ? assignees.filter((a) => a.id !== member.id)
      : [...assignees, { name: member.display_name, id: member.id }])
  }

  // Toggle a free-text name (id null), matched case-insensitively by name.
  const toggleFreeText = (name) => {
    const lower = name.toLowerCase()
    const has = assignees.some((a) => !a.id && a.name.toLowerCase() === lower)
    commit(has
      ? assignees.filter((a) => !(!a.id && a.name.toLowerCase() === lower))
      : [...assignees, { name, id: null }])
  }

  const trimmed = search.trim()
  const trimmedLower = trimmed.toLowerCase()

  // Refs whose id isn't a current member (free-text, or a former member) show
  // at the top as removable chips.
  const externalRefs = assignees
    .filter((a) => !members.some((m) => m.id === a.id))
    .filter((a) => !trimmed || a.name.toLowerCase().includes(trimmedLower))

  const memberMatches = members.filter((m) => !trimmed || m.display_name.toLowerCase().includes(trimmedLower))
  const showAddNew =
    trimmed &&
    !members.some((m) => m.display_name.toLowerCase() === trimmedLower) &&
    !assignees.some((a) => a.name.toLowerCase() === trimmedLower)

  const removeRef = (ref) => commit(assignees.filter((a) => a !== ref))

  const panel = (
    <>
      <div className="px-1 pt-0.5 pb-1.5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const name = trimmed
              if (!name) return
              const member = members.find((m) => m.display_name.toLowerCase() === name.toLowerCase())
              if (member) toggleMember(member)
              else if (!assignees.some((a) => a.name.toLowerCase() === name.toLowerCase())) toggleFreeText(name)
              setSearch('')
            } else if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
          autoFocus
          placeholder="Search or type name..."
          className="w-full text-sm rounded-lg px-2 py-1.5 border border-[var(--border-default)] hover:border-[var(--color-mist)] focus:border-[var(--border-focus)] focus:outline-none placeholder-[var(--text-faint)]"
        />
      </div>
      <div className="max-h-56 overflow-y-auto subtle-scrollbar">
        {/* Free-text / former-member selections appear first */}
        {externalRefs.map((ref) => (
          <div
            key={`ext-${ref.id || ref.name}`}
            role="menuitem"
            onClick={() => removeRef(ref)}
            className="min-h-8 px-2 rounded-lg cursor-pointer whitespace-nowrap grid grid-cols-[minmax(0,_1fr)_auto] gap-1.5 items-center select-none hover:bg-[var(--surface-hover)] text-sm font-medium"
          >
            <div className="flex items-center gap-2 w-full">
              <Avatar name={ref.name} />
              <span className="flex-1 truncate">{ref.name}</span>
            </div>
            <Check className="w-4 h-4 text-[var(--text-secondary)]" />
          </div>
        ))}

        {/* Board / workspace members */}
        {memberMatches.map((member) => {
          const checked = assignees.some((a) => a.id === member.id)
          return (
            <div
              key={member.id}
              role="menuitem"
              onClick={() => toggleMember(member)}
              className={`min-h-8 px-2 rounded-lg cursor-pointer whitespace-nowrap grid grid-cols-[minmax(0,_1fr)_auto] gap-1.5 items-center select-none hover:bg-[var(--surface-hover)] text-sm ${checked ? 'font-medium' : ''}`}
            >
              <div className="flex items-center gap-2 w-full">
                <Avatar name={member.display_name} />
                <span className="flex-1 truncate">{member.display_name}</span>
              </div>
              {checked && <Check className="w-4 h-4 text-[var(--text-secondary)]" />}
            </div>
          )
        })}

        {/* Free-text "add" — search matches no member and isn't already assigned */}
        {showAddNew && (
          <>
            <div role="separator" className="h-px bg-[var(--border-subtle)] my-1.5 mx-2" />
            <div
              role="menuitem"
              onClick={() => { toggleFreeText(trimmed); setSearch('') }}
              className="min-h-8 px-2 rounded-lg cursor-pointer whitespace-nowrap grid grid-cols-[minmax(0,_1fr)_auto] gap-1.5 items-center select-none hover:bg-[var(--surface-hover)] text-sm text-[var(--text-secondary)]"
            >
              <div className="flex items-center gap-2 w-full">
                <div style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus className="w-3.5 h-3.5" /></div>
                <span className="flex-1 truncate">Add "{trimmed}"</span>
              </div>
            </div>
          </>
        )}

        {/* Clear all */}
        {assignees.length > 0 && (
          <>
            <div role="separator" className="h-px bg-[var(--border-subtle)] my-1.5 mx-2" />
            <div
              role="menuitem"
              onClick={() => commit([])}
              className="min-h-8 px-2 rounded-lg cursor-pointer whitespace-nowrap grid grid-cols-[minmax(0,_1fr)_auto] gap-1.5 items-center select-none hover:bg-[var(--surface-hover)] text-sm text-[var(--text-muted)]"
            >
              <div className="flex items-center gap-2 w-full">
                <div style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X className="w-3.5 h-3.5" /></div>
                <span className="flex-1 truncate">Clear all</span>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement={placement}
      className="shrink-0"
      panelClassName="min-w-[14rem]"
      panel={panel}
    >
      <Tooltip content={assignees.length === 0 ? 'Assign someone' : assignees.map((a) => a.name).join(', ')}>
        <button
          type="button"
          onClick={() => { setOpen(!open); setSearch('') }}
          className="flex items-center cursor-pointer"
        >
          {assignees.length === 0 ? (
            <span className={`${sz.avatar} rounded-full flex items-center justify-center bg-[var(--surface-hover)] text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors`}>
              <User className={sz.glyph} />
            </span>
          ) : (
            <span className={`flex items-center ${sz.spacing}`}>
              {visible.map((ref) => {
                if (isMeRef(ref) && profile?.icon) {
                  return (
                    <span
                      key={ref.id || ref.name}
                      className={`${sz.avatar} rounded-full flex items-center justify-center ring-2 ring-[var(--surface-page)] ${profileFallback}`}
                      style={profileStyle}
                    >
                      <DynamicIcon name={profile.icon} className={sz.glyph} />
                    </span>
                  )
                }
                return <Avatar key={ref.id || ref.name} name={ref.name} size={sz.avatarSize} ringed ringColor="ring-[var(--surface-page)]" />
              })}
              {overflow > 0 && (
                <span className={`${sz.avatar} rounded-full flex items-center justify-center ring-2 ring-[var(--surface-page)] bg-[var(--surface-hover)] ${sz.overflowText} font-medium text-[var(--text-secondary)]`}>
                  +{overflow}
                </span>
              )}
            </span>
          )}
        </button>
      </Tooltip>
    </Popover>
  )
}
