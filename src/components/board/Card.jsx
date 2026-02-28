import { format, isPast, parseISO } from 'date-fns'
import { Calendar, CheckSquare } from 'lucide-react'

const LABEL_COLORS = {
  red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  purple: 'bg-purple-100 text-purple-700',
  pink: 'bg-pink-100 text-pink-700',
  gray: 'bg-gray-100 text-gray-700',
}

const PRIORITY_COLORS = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500',
}

export default function Card({ card, onClick }) {
  const { title, labels, priority, dueDate, checklist } = card

  const checkedCount = checklist?.filter((item) => item.done).length || 0
  const totalCount = checklist?.length || 0
  const hasChecklist = totalCount > 0

  const dueDateObj = dueDate ? parseISO(dueDate) : null
  const isOverdue = dueDateObj && isPast(dueDateObj) && !isPast(new Date())

  // isPast returns true for any date before now, so we just check isPast on the due date
  const overdue = dueDateObj ? isPast(dueDateObj) : false

  return (
    <button
      type="button"
      onClick={() => onClick(card.id)}
      className="w-full bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md hover:border-gray-300 transition-all text-left cursor-pointer"
    >
      {/* Labels */}
      {labels && labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {labels.map((label, idx) => (
            <span
              key={idx}
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                LABEL_COLORS[label.color] || LABEL_COLORS.gray
              }`}
            >
              {label.text}
            </span>
          ))}
        </div>
      )}

      {/* Title with priority dot */}
      <div className="flex items-start gap-2">
        <span
          className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
            PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium
          }`}
        />
        <span className="text-sm font-medium text-gray-900 leading-snug">
          {title}
        </span>
      </div>

      {/* Footer: due date + checklist */}
      {(dueDateObj || hasChecklist) && (
        <div className="flex items-center gap-3 mt-2 text-xs">
          {dueDateObj && (
            <span
              className={`flex items-center gap-1 ${
                overdue ? 'text-red-600 font-medium' : 'text-gray-500'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              {format(dueDateObj, 'MMM d')}
            </span>
          )}
          {hasChecklist && (
            <span
              className={`flex items-center gap-1 ${
                checkedCount === totalCount
                  ? 'text-green-600'
                  : 'text-gray-500'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              {checkedCount}/{totalCount}
            </span>
          )}
        </div>
      )}
    </button>
  )
}
