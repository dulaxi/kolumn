import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBoardStore } from '../store/boardStore'
import { isToday, isPast, format, parseISO } from 'date-fns'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ListTodo,
  ArrowRight,
} from 'lucide-react'

const PRIORITY_COLORS = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500',
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const boards = useBoardStore((s) => s.boards)
  const columns = useBoardStore((s) => s.columns)
  const cards = useBoardStore((s) => s.cards)
  const loading = useBoardStore((s) => s.loading)

  const stats = useMemo(() => {
    const allCards = Object.values(cards)
    const allColumns = Object.values(columns)

    // Find all column IDs that are "Done" (case-insensitive)
    const doneColumnIds = new Set(
      allColumns.filter((col) => col.title.toLowerCase() === 'done').map((col) => col.id)
    )
    const doneCardIds = new Set(
      allCards.filter((c) => doneColumnIds.has(c.column_id)).map((c) => c.id)
    )

    const totalTasks = allCards.length

    // In Progress = cards in columns titled "In Progress"
    const inProgressColumnIds = new Set(
      allColumns.filter((col) => col.title.toLowerCase() === 'in progress').map((col) => col.id)
    )
    const inProgress = allCards.filter((c) => inProgressColumnIds.has(c.column_id)).length

    // Completed today = done cards where updated_at is today
    const completedToday = allCards.filter((card) => {
      if (!doneCardIds.has(card.id)) return false
      return card.updated_at && isToday(parseISO(card.updated_at))
    }).length

    // Overdue = cards with due_date in past (not today) and NOT in "Done"
    const overdue = allCards.filter((card) => {
      if (!card.due_date || doneCardIds.has(card.id)) return false
      const due = parseISO(card.due_date)
      return isPast(due) && !isToday(due)
    }).length

    return { totalTasks, inProgress, completedToday, overdue }
  }, [columns, cards])

  const recentActivity = useMemo(() => {
    return Object.values(cards)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 8)
  }, [cards])

  const statCards = [
    {
      label: 'Total Tasks',
      value: stats.totalTasks,
      icon: ListTodo,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'In Progress',
      value: stats.inProgress,
      icon: Clock,
      color: 'text-yellow-600 bg-yellow-50',
    },
    {
      label: 'Completed Today',
      value: stats.completedToday,
      icon: CheckCircle2,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: 'Overdue',
      value: stats.overdue,
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-50',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading...
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of your tasks and activity</p>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stat.value}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Activity
          </h2>
          <button
            onClick={() => navigate('/boards')}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
          >
            View boards
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {recentActivity.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">
            No tasks yet. Create your first task to see activity here.
          </p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((card) => (
              <div
                key={card.id}
                className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0"
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    PRIORITY_COLORS[card.priority] || PRIORITY_COLORS.medium
                  }`}
                />
                <span className="text-[11px] font-medium text-gray-400 shrink-0">
                  #{card.global_task_number || card.task_number}
                </span>
                <span className="text-sm text-gray-900 font-medium flex-1 truncate">
                  {card.title}
                </span>
                <span className="text-xs text-gray-400 shrink-0">
                  {card.updated_at && format(parseISO(card.updated_at), 'MMM d, h:mm a')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
