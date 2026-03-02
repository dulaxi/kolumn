import { useState } from 'react'
import { format, isPast, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns'
import { Calendar, CheckSquare, AlignLeft, CheckCircle2, FileText } from 'lucide-react'
import { useBoardStore } from '../../store/boardStore'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'
import DynamicIcon from './DynamicIcon'

const LABEL_BG = {
  red: 'bg-[#FFE0DB] text-[#CF222E]',
  blue: 'bg-[#DAF0FF] text-[#3094FF]',
  green: 'bg-[#D1FDE0] text-[#08872B]',
  yellow: 'bg-[#FFF4D4] text-[#9A6700]',
  purple: 'bg-[#EDD8FD] text-[#8534F3]',
  pink: 'bg-[#FFD6EA] text-[#BF3989]',
  gray: 'bg-[#E4EBE6] text-[#909692]',
}

const PRIORITY_DOT = {
  low: 'bg-emerald-400',
  medium: 'bg-amber-400',
  high: 'bg-rose-400',
}

const AVATAR_COLORS = [
  'bg-blue-200',
  'bg-emerald-200',
  'bg-purple-200',
  'bg-pink-200',
  'bg-amber-200',
  'bg-rose-200',
  'bg-teal-200',
]

function getAvatarColor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function Card({ card, onClick, onComplete, isSelected, iconOverride }) {
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
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(card.id)}
      style={font === 'sf-mono' ? { fontFamily: "'SF Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', monospace" } : undefined}
      className={`w-full rounded-xl border shadow-sm transition-all text-left cursor-pointer flex ${
        isSelected
          ? 'bg-blue-50/60 border-blue-100'
          : 'bg-white border-gray-200 hover:shadow-md'
      }`}
    >
      {/* Icon — left center */}
      <div className="flex items-center pl-3 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
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
            {labels.map((label, idx) => (
              <span
                key={idx}
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
            className="shrink-0"
          >
            <CheckCircle2 className={`w-4 h-4 transition-colors ${completed ? 'text-emerald-400' : 'text-gray-300 hover:text-emerald-300'}`} />
          </button>
          {taskNumber && (
            <span className="text-[11px] font-medium text-gray-500">Task #{taskNumber}</span>
          )}
          <span className={`w-2 h-2 rounded-full ${priDot}`} title={priority} />
        </div>
        <p className={`text-[13px] font-medium leading-snug ${completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
          {title}
        </p>

        {/* Description preview */}
        {hasDescription && (
          <p className="text-[12px] text-gray-400 leading-relaxed mt-1 line-clamp-2">
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
                    ? 'bg-rose-100 text-rose-500'
                    : isToday(dueDateObj)
                    ? 'bg-amber-100 text-amber-600'
                    : isTomorrow(dueDateObj)
                    ? 'bg-blue-100 text-blue-500'
                    : 'bg-emerald-100 text-emerald-500'
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
                    ? 'bg-emerald-100 text-emerald-500'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                <CheckSquare className="w-3 h-3" />
                {checkedCount}/{totalCount}
              </button>
            )}

            {hasDescription && (
              <span className="text-[10px] text-gray-300 flex items-center">
                <AlignLeft className="w-3 h-3" />
              </span>
            )}
          </div>

          {/* Assignee avatar — bottom right */}
          {hasAssignee && (() => {
            const isMe = profile?.display_name && assignee.trim().toLowerCase() === profile.display_name.trim().toLowerCase()
            const iconText = profile.color === 'bg-[#A0A0A0]' ? 'text-gray-900' : 'text-white'
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
          <div className="mt-2 pt-2 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
            {/* Progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-1 mb-2">
              <div
                className={`h-1 rounded-full transition-all ${checkedCount === totalCount ? 'bg-emerald-400' : 'bg-blue-400'}`}
                style={{ width: `${(checkedCount / totalCount) * 100}%` }}
              />
            </div>
            <div className="space-y-1">
              {checklist.map((item, idx) => (
                <label key={idx} className="flex items-center gap-2 py-0.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleCheckItem(idx)}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-400 focus:ring-blue-300"
                  />
                  <span className={`text-[12px] leading-snug ${item.done ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                    {item.text}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
