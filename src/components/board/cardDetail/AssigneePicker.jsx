import { useState } from 'react'
import { Check, Plus, User, X } from '@phosphor-icons/react'
import Avatar from '../../ui/Avatar'
import DynamicIcon from '../DynamicIcon'
import { resolveProfileColor } from '../../../constants/colors'

const SIZES = {
  sm: {
    avatar: 'w-5 h-5',
    glyph: 'w-3 h-3',
    overflowText: 'text-[9px]',
    spacing: '-space-x-1.5',
    avatarSize: 'sm',
    avatarTextClass: 'text-[8px]',
  },
  lg: {
    avatar: 'w-7 h-7',
    glyph: 'w-3.5 h-3.5',
    overflowText: 'text-[10px]',
    spacing: '-space-x-2',
    avatarSize: 'lg',
    avatarTextClass: 'text-[11px]',
  },
}

const PLACEMENT = {
  'bottom-end': 'right-0 top-full mt-2',
  'top-end': 'right-0 bottom-full mb-2',
}

export default function AssigneePicker({
  assignees,
  setAssignees,
  boardMemberNames,
  profile,
  scheduleSave,
  open,
  onOpenChange,
  size = 'lg',
  placement = 'bottom-end',
}) {
  const [search, setSearch] = useState('')

  const sz = SIZES[size] || SIZES.lg
  const isMeName = (n) => profile?.display_name && n.trim().toLowerCase() === profile.display_name.trim().toLowerCase()
  const { style: profileStyle, fallbackClass: profileFallback } = resolveProfileColor(profile?.color)

  const maxVisible = 3
  const visible = assignees.slice(0, maxVisible)
  const overflow = Math.max(0, assignees.length - maxVisible)

  const toggleAssignee = (name) => {
    const next = assignees.some((a) => a.toLowerCase() === name.toLowerCase())
      ? assignees.filter((a) => a.toLowerCase() !== name.toLowerCase())
      : [...assignees, name]
    setAssignees(next)
    scheduleSave?.()
  }

  const trimmed = search.trim()
  const trimmedLower = trimmed.toLowerCase()
  const externalNames = assignees
    .filter((a) => !boardMemberNames.some((m) => m.toLowerCase() === a.toLowerCase()))
    .filter((a) => !trimmed || a.toLowerCase().includes(trimmedLower))

  const memberMatches = boardMemberNames.filter((m) => !trimmed || m.toLowerCase().includes(trimmedLower))
  const showAddNew =
    trimmed &&
    !boardMemberNames.some((m) => m.toLowerCase() === trimmedLower) &&
    !assignees.some((a) => a.toLowerCase() === trimmedLower)

  return (
    <div className="relative shrink-0" data-menu-root>
      <button
        type="button"
        onClick={() => { onOpenChange(open ? null : 'assignee'); setSearch('') }}
        className="flex items-center cursor-pointer"
        title={assignees.length === 0 ? 'Assign someone' : assignees.join(', ')}
      >
        {assignees.length === 0 ? (
          <span className={`${sz.avatar} rounded-full flex items-center justify-center bg-[var(--surface-hover)] text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors`}>
            <User className={sz.glyph} />
          </span>
        ) : (
          <span className={`flex ${sz.spacing}`}>
            {visible.map((name) => {
              const isMe = isMeName(name)
              if (isMe && profile?.icon) {
                return (
                  <span
                    key={name}
                    className={`${sz.avatar} rounded-full flex items-center justify-center ring-2 ring-[var(--surface-page)] ${profileFallback}`}
                    style={profileStyle}
                  >
                    <DynamicIcon name={profile.icon} className={sz.glyph} />
                  </span>
                )
              }
              return <Avatar key={name} name={name} size={sz.avatarSize} ringed className={`ring-[var(--surface-page)] ${sz.avatar} ${sz.avatarTextClass}`} />
            })}
            {overflow > 0 && (
              <span className={`${sz.avatar} rounded-full flex items-center justify-center ring-2 ring-[var(--surface-page)] bg-[var(--surface-hover)] ${sz.overflowText} font-medium text-[var(--text-secondary)]`}>
                +{overflow}
              </span>
            )}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute ${PLACEMENT[placement] || PLACEMENT['bottom-end']} p-1.5 bg-[var(--surface-card)] border-0.5 border-[var(--color-mist)] rounded-xl min-w-[14rem] text-[var(--text-primary)] shadow-[0px_2px_8px_0px_rgba(0,0,0,0.08)] z-50 overflow-hidden`}>
          <div className="px-1.5 pb-1.5">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const name = search.trim()
                  if (!name) return
                  if (!assignees.some((a) => a.toLowerCase() === name.toLowerCase())) {
                    toggleAssignee(name)
                  }
                  setSearch('')
                } else if (e.key === 'Escape') {
                  onOpenChange(null)
                }
              }}
              autoFocus
              placeholder="Search or type name..."
              className="w-full text-sm rounded-lg px-2 py-1.5 border border-[var(--border-default)] hover:border-[var(--color-mist)] focus:border-[var(--border-focus)] focus:outline-none placeholder-[var(--text-faint)]"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {/* External (not-in-board-members) selected names appear first */}
            {externalNames.map((name) => (
              <div
                key={`ext-${name}`}
                role="menuitem"
                onClick={() => toggleAssignee(name)}
                className="min-h-7 px-2 py-1 rounded-lg cursor-pointer whitespace-nowrap grid grid-cols-[minmax(0,_1fr)_auto] gap-1.5 items-center select-none hover:bg-[var(--surface-hover)] text-xs bg-[var(--surface-hover)] font-medium"
              >
                <div className="flex items-center gap-2 w-full">
                  <Avatar name={name} />
                  <span className="flex-1 truncate">{name}</span>
                </div>
                <Check className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              </div>
            ))}

            {/* Board / workspace members */}
            {memberMatches.map((member) => {
              const checked = assignees.some((a) => a.toLowerCase() === member.toLowerCase())
              return (
                <div
                  key={member}
                  role="menuitem"
                  onClick={() => toggleAssignee(member)}
                  className={`min-h-7 px-2 py-1 rounded-lg cursor-pointer whitespace-nowrap grid grid-cols-[minmax(0,_1fr)_auto] gap-1.5 items-center select-none hover:bg-[var(--surface-hover)] text-xs ${checked ? 'bg-[var(--surface-hover)] font-medium' : ''}`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Avatar name={member} />
                    <span className="flex-1 truncate">{member}</span>
                  </div>
                  {checked && <Check className="w-3.5 h-3.5 text-[var(--text-secondary)]" />}
                </div>
              )
            })}

            {/* Free-text "add" — when search doesn't match anyone and not already assigned */}
            {showAddNew && (
              <>
                <div role="separator" className="h-[0.5px] bg-[var(--border-subtle)] my-1.5 mx-2" />
                <div
                  role="menuitem"
                  onClick={() => { toggleAssignee(trimmed); setSearch('') }}
                  className="min-h-7 px-2 py-1 rounded-lg cursor-pointer whitespace-nowrap grid grid-cols-[minmax(0,_1fr)_auto] gap-1.5 items-center select-none hover:bg-[var(--surface-hover)] text-xs text-[var(--text-secondary)]"
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
                <div role="separator" className="h-[0.5px] bg-[var(--border-subtle)] my-1.5 mx-2" />
                <div
                  role="menuitem"
                  onClick={() => { setAssignees([]); scheduleSave?.() }}
                  className="min-h-7 px-2 py-1 rounded-lg cursor-pointer whitespace-nowrap grid grid-cols-[minmax(0,_1fr)_auto] gap-1.5 items-center select-none hover:bg-[var(--surface-hover)] text-xs text-[var(--text-muted)]"
                >
                  <div className="flex items-center gap-2 w-full">
                    <div style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X className="w-3.5 h-3.5" /></div>
                    <span className="flex-1 truncate">Clear all</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
