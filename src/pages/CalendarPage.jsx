import { useState, useMemo } from 'react'
import { useBoardStore } from '../store/boardStore'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const PRIORITY_COLORS = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500',
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const cards = useBoardStore((s) => s.cards)

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart)
    const calEnd = endOfWeek(monthEnd)
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  const cardsByDate = useMemo(() => {
    const map = {}
    Object.values(cards).forEach((card) => {
      if (!card.dueDate) return
      const dateKey = format(parseISO(card.dueDate), 'yyyy-MM-dd')
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(card)
    })
    return map
  }, [cards])

  const selectedDayCards = useMemo(() => {
    if (!selectedDay) return []
    const key = format(selectedDay, 'yyyy-MM-dd')
    return cardsByDate[key] || []
  }, [selectedDay, cardsByDate])

  return (
    <div className="flex gap-6 h-full">
      {/* Calendar Grid */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {format(currentMonth, 'MMMM yyyy')}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_NAMES.map((name) => (
            <div
              key={name}
              className="text-center text-xs font-medium text-gray-500 py-2"
            >
              {name}
            </div>
          ))}
        </div>

        {/* Day Cells */}
        <div className="grid grid-cols-7 border-t border-l border-gray-200">
          {calendarDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const dayCards = cardsByDate[dateKey] || []
            const inMonth = isSameMonth(day, currentMonth)
            const today = isToday(day)
            const selected = selectedDay && isSameDay(day, selectedDay)

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`border-r border-b border-gray-200 p-1.5 min-h-[90px] text-left cursor-pointer transition-all ${
                  !inMonth ? 'opacity-40' : ''
                } ${selected ? 'ring-2 ring-primary-500 ring-inset' : ''} hover:bg-gray-50`}
              >
                <div className="flex items-center justify-center mb-1">
                  <span
                    className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                      today
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-700'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {dayCards.slice(0, 2).map((card) => (
                    <div
                      key={card.id}
                      className="text-[10px] text-gray-700 truncate bg-primary-50 rounded px-1 py-0.5"
                    >
                      {card.title}
                    </div>
                  ))}
                  {dayCards.length > 2 && (
                    <div className="text-[10px] text-gray-400 px-1">
                      +{dayCards.length - 2} more
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Side Panel */}
      <div className="w-72 shrink-0 bg-white rounded-xl border border-gray-200 p-4 self-start">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">
          {selectedDay
            ? format(selectedDay, 'EEEE, MMMM d')
            : 'Select a day'}
        </h2>
        {!selectedDay ? (
          <p className="text-sm text-gray-400">
            Click on a day to see its tasks.
          </p>
        ) : selectedDayCards.length === 0 ? (
          <p className="text-sm text-gray-400">No tasks due on this day.</p>
        ) : (
          <div className="space-y-3">
            {selectedDayCards.map((card) => (
              <div
                key={card.id}
                className="border-b border-gray-100 pb-3 last:border-0 last:pb-0"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                      PRIORITY_COLORS[card.priority] || PRIORITY_COLORS.medium
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {card.title}
                    </p>
                    {card.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {card.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
