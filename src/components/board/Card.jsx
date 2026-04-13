import { useState, memo } from 'react'
import { format, isPast, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns'
import { CheckCircle2 } from 'lucide-react'
import { CalendarDot, CheckSquare, FileText } from '@phosphor-icons/react'
import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'
import DynamicIcon from './DynamicIcon'
import { LABEL_BG, PRIORITY_DOT, getAvatarColor, getAvatarTextColor, getInitials } from '../../utils/formatting'

export default memo(function Card({ card, onClick, onComplete, isSelected, iconOverride }) {
  const { title, description, labels, priority, due_date: dueDate, checklist, assignee_name: assignee, task_number: taskNumber, completed, icon } = card
  const displayIcon = iconOverride || icon
  const updateCard = useBoardStore((s) => s.updateCard)
  const profile = useAuthStore((s) => s.profile)
  const font = useSettingsStore((s) => s.font)
  const [checklistOpen, setChecklistOpen] = useState(false)

  const checkedCount = checklist?.filter((item) => item.done).length || 0
  const totalCount = checklist?.length || 0
  const hasChecklist = totalCount > 0

  const toggleCheckItem = (index) => {
    const updated = checklist.map((item, i) =>
      i === index ? { ...item, done: !item.done } : item
    )
    updateCard(card.id, { checklist: updated })
  }
  const hasDescription = description && description.trim().length > 0
  const hasAssignee = assignee && assignee.trim().length > 0

  const dueDateObj = dueDate ? parseISO(dueDate) : null
  const overdue = dueDateObj ? isPast(dueDateObj) : false

  const priDot = PRIORITY_DOT[priority] || PRIORITY_DOT.medium

  return (
    <button
      type="button"
      aria-label={`Task: ${title}`}
      onClick={() => onClick(card.id)}
      style={font === 'sf-mono' ? { fontFamily: "'SF Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', monospace" } : undefined}
      className={`w-full flex flex-col gap-3 rounded-2xl border p-4 text-left shadow-sm transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-1 group ${
        isSelected
          ? 'bg-[var(--accent-lime-wash)]/40 border-[var(--accent-lime)]'
          : 'bg-[var(--surface-card)] border-[var(--color-mist)] hover:bg-[var(--surface-page)] hover:shadow-none hover:border-[var(--text-muted)]'
      }`}
    >
      {/* Top row: icon + title + check */}
      <div className="flex items-start gap-3">
        {/* Icon container — Claude skill card style */}
        <div className="flex w-10 h-10 shrink-0 items-center justify-center rounded-lg border-0.5 border-[var(--border-default)] bg-[var(--surface-raised)]">
          <div className="w-5 h-5 flex items-center justify-center">
            {displayIcon ? (
              <DynamicIcon name={displayIcon} className="w-5 h-5 text-[var(--text-primary)]" />
            ) : (
              <FileText size={20} weight="regular" className="text-[var(--text-muted)]" />
            )}
          </div>
        </div>

        {/* Title + meta */}
        <div className="flex min-w-0 grow flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className={`truncate text-sm font-medium flex-1 ${completed ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>
              {title}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (onComplete) onComplete(card.id)
              }}
              aria-label={completed ? 'Mark as incomplete' : 'Mark as complete'}
              className="shrink-0"
            >
              <CheckCircle2 className={`w-4 h-4 transition-colors ${completed ? 'text-[#A8BA32]' : 'text-[var(--text-faint)] group-hover:text-[var(--text-muted)] hover:text-[#C2D64A]'}`} />
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            {labels?.length > 0 && labels.map((label) => (
              <span key={`${label.text}-${label.color}`} className="font-medium text-[var(--text-secondary)] lowercase">/{label.text}</span>
            ))}
            {labels?.length > 0 && <span aria-hidden="true">·</span>}
            <span className={`w-2 h-2 rounded-full ${priDot}`} title={priority} />
            {hasAssignee && (
              <>
                <span aria-hidden="true">·</span>
                {(() => {
                  const isMe = profile?.display_name && assignee.trim().toLowerCase() === profile.display_name.trim().toLowerCase()
                  const lightColors = ['bg-[#8E8E89]', 'bg-[#E0DBD5]', 'bg-[#E8E2DB]', 'bg-[#C2D64A]', 'bg-[#A8BA32]', 'bg-[#D4A843]', 'bg-[#C27A4A]']
                  const iconText = lightColors.includes(profile?.color) ? 'text-[#1B1B18]' : 'text-white'
                  return isMe && profile.icon ? (
                    <span
                      className={`w-4 h-4 rounded-full shrink-0 flex items-center justify-center ${iconText} ${profile.color}`}
                      title={assignee}
                    >
                      <DynamicIcon name={profile.icon} className="w-2.5 h-2.5" />
                    </span>
                  ) : (
                    <span
                      className={`w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[10px] font-heading ${getAvatarColor(assignee)} ${getAvatarTextColor(getAvatarColor(assignee))}`}
                      title={assignee}
                    >
                      {getInitials(assignee).toLowerCase()}
                    </span>
                  )
                })()}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {hasDescription && (
        <p className="line-clamp-2 text-xs text-[var(--text-muted)] leading-relaxed">
          {description}
        </p>
      )}

      {/* Bottom metadata row */}
      {(dueDateObj || hasChecklist) && (
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          {dueDateObj && (
            <span
              className={`font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${
                isYesterday(dueDateObj) || (isPast(dueDateObj) && !isToday(dueDateObj))
                  ? 'bg-[#F2D9C7] text-[#C27A4A]'
                  : isToday(dueDateObj)
                  ? 'bg-[#F5EDCF] text-[#D4A843]'
                  : isTomorrow(dueDateObj)
                  ? 'bg-[#EEF2D6] text-[#A8BA32]'
                  : 'bg-[#EEF2D6] text-[#A8BA32]'
              }`}
            >
              <CalendarDot size={12} weight="bold" />
              {isToday(dueDateObj) ? 'Today' : isYesterday(dueDateObj) ? 'Yesterday' : isTomorrow(dueDateObj) ? 'Tomorrow' : format(dueDateObj, 'MMM d')}
            </span>
          )}

          {hasChecklist && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setChecklistOpen(!checklistOpen)
              }}
              className={`font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] transition-colors ${
                checkedCount === totalCount
                  ? 'bg-[#EEF2D6] text-[#A8BA32]'
                  : 'bg-[var(--surface-hover)] text-[var(--text-muted)] hover:bg-[#E0DBD5]'
              }`}
            >
              <CheckSquare size={12} weight="bold" />
              {checkedCount}/{totalCount}
            </button>
          )}
        </div>
      )}

      {/* Expandable checklist */}
      {hasChecklist && checklistOpen && (
        <div className="pt-2 border-t border-[var(--border-subtle)]" onClick={(e) => e.stopPropagation()}>
          {/* Progress bar */}
          <div className="w-full bg-[var(--surface-hover)] rounded-full h-1 mb-2">
            <div
              className={`h-1 rounded-full transition-all ${checkedCount === totalCount ? 'bg-[#A8BA32]' : 'bg-[#C2D64A]'}`}
              style={{ width: `${(checkedCount / totalCount) * 100}%` }}
            />
          </div>
          <div className="space-y-1">
            {checklist.map((item, idx) => (
              <label key={`${item.text}-${idx}`} className="flex items-center gap-2 py-0.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleCheckItem(idx)}
                  className="w-3.5 h-3.5 rounded border-[var(--border-default)] text-[#C2D64A] focus:ring-[var(--accent-lime-wash)]"
                />
                <span className={`text-[12px] leading-snug ${item.done ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}`}>
                  {item.text}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </button>
  )
})
