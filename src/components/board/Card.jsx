import { useState, memo } from 'react'
import { format, isPast, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns'
import { Calendar, CheckSquare, AlignLeft, CheckCircle2, FileText } from 'lucide-react'
import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'
import DynamicIcon from './DynamicIcon'
import { LABEL_BG, PRIORITY_DOT, getAvatarColor, getInitials } from '../../utils/formatting'

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
      className={`w-full rounded-xl border shadow-sm transition-all text-left cursor-pointer flex focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2D64A] focus-visible:ring-offset-1 ${
        isSelected
          ? 'bg-[#EEF2D6]/60 border-[#EEF2D6]'
          : 'bg-white border-[#E0DBD5] hover:shadow-md'
      }`}
    >
      {/* Icon — left center */}
      <div className="flex items-center pl-3 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-[#E8E2DB] flex items-center justify-center text-[#8E8E89]">
          {displayIcon ? (
            <DynamicIcon name={displayIcon} className="w-4 h-4" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
        </div>
      </div>

      {/* Card content */}
      <div className="flex-1 min-w-0 pl-2.5 pr-3.5 py-3">
        {/* Labels row */}
        {labels?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {labels.map((label) => (
              <span
                key={`${label.text}-${label.color}`}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  LABEL_BG[label.color] || LABEL_BG.gray
                }`}
              >
                {label.text}
              </span>
            ))}
          </div>
        )}

        {/* Task number + check + Title */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (onComplete) onComplete(card.id)
            }}
            aria-label={completed ? 'Mark as incomplete' : 'Mark as complete'}
            className="shrink-0"
          >
            <CheckCircle2 className={`w-4 h-4 transition-colors ${completed ? 'text-[#A8BA32]' : 'text-[#8E8E89] hover:text-[#C2D64A]'}`} />
          </button>
          {taskNumber && (
            <span className="text-[11px] font-medium text-[#5C5C57]">Task #{taskNumber}</span>
          )}
          <span className={`w-2 h-2 rounded-full ${priDot}`} title={priority} />
        </div>
        <p className={`text-[13px] font-medium leading-snug ${completed ? 'text-[#8E8E89] line-through' : 'text-[#1B1B18]'}`}>
          {title}
        </p>

        {/* Description preview */}
        {hasDescription && (
          <p className="text-[12px] text-[#8E8E89] leading-relaxed mt-1 line-clamp-2">
            {description}
          </p>
        )}

        {/* Bottom row: badges + assignee */}
        <div className="flex items-center justify-between gap-2 mt-2.5">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            {dueDateObj && (
              <span
                className={`text-[10px] font-medium flex items-center gap-1 px-2 py-0.5 rounded-full ${
                  isYesterday(dueDateObj) || (isPast(dueDateObj) && !isToday(dueDateObj))
                    ? 'bg-[#F2D9C7] text-[#C27A4A]'
                    : isToday(dueDateObj)
                    ? 'bg-[#F5EDCF] text-[#D4A843]'
                    : isTomorrow(dueDateObj)
                    ? 'bg-[#EEF2D6] text-[#A8BA32]'
                    : 'bg-[#EEF2D6] text-[#A8BA32]'
                }`}
              >
                <Calendar className="w-3 h-3" />
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
                className={`text-[10px] font-medium flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors ${
                  checkedCount === totalCount
                    ? 'bg-[#EEF2D6] text-[#A8BA32]'
                    : 'bg-[#E8E2DB] text-[#8E8E89] hover:bg-[#E0DBD5]'
                }`}
              >
                <CheckSquare className="w-3 h-3" />
                {checkedCount}/{totalCount}
              </button>
            )}

            {hasDescription && (
              <span className="text-[10px] text-[#8E8E89] flex items-center">
                <AlignLeft className="w-3 h-3" />
              </span>
            )}
          </div>

          {/* Assignee avatar — bottom right */}
          {hasAssignee && (() => {
            const isMe = profile?.display_name && assignee.trim().toLowerCase() === profile.display_name.trim().toLowerCase()
            const iconText = profile?.color === 'bg-[#8E8E89]' ? 'text-[#1B1B18]' : 'text-white'
            return isMe && profile.icon ? (
              <span
                className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center ${iconText} ${profile.color}`}
                title={assignee}
              >
                <DynamicIcon name={profile.icon} className="w-3.5 h-3.5" />
              </span>
            ) : (
              <span
                className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white ${getAvatarColor(assignee)}`}
                title={assignee}
              >
                {getInitials(assignee)}
              </span>
            )
          })()}
        </div>

        {/* Expandable checklist */}
        {hasChecklist && checklistOpen && (
          <div className="mt-2 pt-2 border-t border-[#E8E2DB]" onClick={(e) => e.stopPropagation()}>
            {/* Progress bar */}
            <div className="w-full bg-[#E8E2DB] rounded-full h-1 mb-2">
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
                    className="w-3.5 h-3.5 rounded border-[#E0DBD5] text-[#C2D64A] focus:ring-[#EEF2D6]"
                  />
                  <span className={`text-[12px] leading-snug ${item.done ? 'line-through text-[#8E8E89]' : 'text-[#5C5C57]'}`}>
                    {item.text}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </button>
  )
})
