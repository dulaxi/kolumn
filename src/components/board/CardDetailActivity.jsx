import {
  Plus, ArrowRight, PencilLine, CircleCheck, CircleDot, History,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const ACTION_ICONS = {
  created: <Plus className="w-3 h-3 text-[#A8BA32]" />,
  moved: <ArrowRight className="w-3 h-3 text-[#A8BA32]" />,
  completed: <CircleCheck className="w-3 h-3 text-[#A8BA32]" />,
  reopened: <CircleDot className="w-3 h-3 text-[#D4A843]" />,
}

const ACTION_TEXT = {
  created: () => 'created this task',
  moved: (detail) => `moved ${detail}`,
  completed: () => 'marked complete',
  reopened: () => 'reopened',
  updated_priority: (detail) => `changed priority ${detail}`,
  updated_assignee: (detail) => `reassigned ${detail}`,
  updated_due_date: (detail) => `set due date to ${detail}`,
  renamed: (detail) => `renamed ${detail}`,
}

export default function CardDetailActivity({ activityItems }) {
  if (!activityItems || activityItems.length === 0) return null

  return (
    <div className="px-5 pt-3 pb-5 border-t border-[#E8E2DB]">
      <label className="text-xs font-medium text-[#8E8E89] uppercase tracking-wider mb-3 flex items-center gap-2">
        <History className="w-3.5 h-3.5" />
        Activity
      </label>
      <div className="space-y-2">
        {activityItems.map((item) => (
          <div key={item.id} className="flex items-start gap-2 text-[12px]">
            <div className="mt-0.5 shrink-0">
              {ACTION_ICONS[item.action] || (item.action.startsWith('updated_') || item.action === 'renamed'
                ? <PencilLine className="w-3 h-3 text-[#C4BFB8]" />
                : null
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-[#5C5C57]">{item.actor_name}</span>{' '}
              <span className="text-[#8E8E89]">
                {(ACTION_TEXT[item.action] || (() => item.action))(item.detail)}
              </span>
              <span className="text-[#C4BFB8] ml-1.5">
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
