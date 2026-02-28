import { useMemo } from 'react'
import { useBoardStore } from '../store/boardStore'
import { format, subDays, isSameDay, parseISO } from 'date-fns'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#6b7280',
]

const PRIORITY_COLORS = {
  Low: '#10b981',
  Medium: '#f59e0b',
  High: '#ef4444',
}

export default function AnalyticsPage() {
  const boards = useBoardStore((s) => s.boards)
  const cards = useBoardStore((s) => s.cards)

  const allCards = useMemo(() => Object.values(cards), [cards])

  // Tasks Created (Last 14 Days)
  const createdData = useMemo(() => {
    const today = new Date()
    const data = []
    for (let i = 13; i >= 0; i--) {
      const day = subDays(today, i)
      const count = allCards.filter((card) =>
        isSameDay(parseISO(card.createdAt), day)
      ).length
      data.push({ date: format(day, 'MMM d'), count })
    }
    return data
  }, [allCards])

  // Tasks by Board
  const boardData = useMemo(() => {
    return Object.values(boards).map((board) => {
      const count = board.columns.reduce(
        (sum, col) => sum + col.cardIds.length,
        0
      )
      return { name: board.name, value: count }
    })
  }, [boards])

  // Tasks by Priority
  const priorityData = useMemo(() => {
    const counts = { Low: 0, Medium: 0, High: 0 }
    allCards.forEach((card) => {
      const p = card.priority || 'medium'
      const key = p.charAt(0).toUpperCase() + p.slice(1)
      if (counts[key] !== undefined) counts[key]++
    })
    return Object.entries(counts).map(([name, count]) => ({ name, count }))
  }, [allCards])

  // Tasks by Label
  const labelData = useMemo(() => {
    const counts = {}
    allCards.forEach((card) => {
      if (!card.labels) return
      card.labels.forEach((label) => {
        const text = label.text || 'Unlabeled'
        counts[text] = (counts[text] || 0) + 1
      })
    })
    return Object.entries(counts).map(([name, count]) => ({ name, count }))
  }, [allCards])

  const hasCards = allCards.length > 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">
          Insights into your tasks and productivity
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks Created (Last 14 Days) */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Tasks Created (Last 14 Days)
          </h2>
          {!hasCards ? (
            <div className="h-[250px] flex items-center justify-center text-sm text-gray-400">
              No data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={createdData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tasks by Board */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Tasks by Board
          </h2>
          {boardData.every((b) => b.value === 0) ? (
            <div className="h-[250px] flex items-center justify-center text-sm text-gray-400">
              No data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={boardData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, value }) => `${name} (${value})`}
                >
                  {boardData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tasks by Priority */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Tasks by Priority
          </h2>
          {!hasCards ? (
            <div className="h-[250px] flex items-center justify-center text-sm text-gray-400">
              No data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {priorityData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={PRIORITY_COLORS[entry.name]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tasks by Label */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Tasks by Label
          </h2>
          {labelData.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-sm text-gray-400">
              No labels yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={labelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  width={100}
                />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {labelData.map((_, index) => (
                    <Cell
                      key={`label-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
