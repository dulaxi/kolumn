import { useState, useMemo, useEffect } from 'react'
import { capture } from '../lib/analytics'
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
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { groupCardsByDate, getCardsForDate } from '../utils/dateUtils'
import { DOT_COLORS, EVENT_ACCENT } from '../constants/colors'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date())
  const cards = useBoardStore((s) => s.cards)

  useEffect(() => { capture('feature_used', { feature: 'calendar' }) }, [])

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart)
    const calEnd = endOfWeek(monthEnd)
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  const cardsByDate = useMemo(() => groupCardsByDate(cards), [cards])

  const selectedDayCards = useMemo(
    () => getCardsForDate(cardsByDate, selectedDay),
    [selectedDay, cardsByDate]
  )

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-7rem)]">
      {/* Left: Calendar */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header — Apple style: arrows, month, today */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1 rounded-full text-[#8E8E89] hover:text-[#5C5C57] hover:bg-[#E8E2DB] transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1 rounded-full text-[#8E8E89] hover:text-[#5C5C57] hover:bg-[#E8E2DB] transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold text-[#1B1B18] font-heading ml-2">
              {format(currentMonth, 'MMMM yyyy')}
            </h1>
          </div>
          <button
            onClick={() => {
              setCurrentMonth(new Date())
              setSelectedDay(new Date())
            }}
            className="px-3 py-1 text-sm font-medium text-[#7A5C44] border border-[#E0DBD5] rounded-full hover:bg-[#F2EDE8] transition-colors"
          >
            Today
          </button>
        </div>

        {/* Calendar grid */}
        <div className="flex-1 flex flex-col rounded-xl bg-white border border-[#E0DBD5] overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7">
            {DAY_NAMES.map((name, i) => (
              <div
                key={name}
                className={`text-center text-[11px] font-semibold uppercase tracking-wider py-2.5 text-[#8E8E89] ${
                  i < 6 ? 'border-r border-[#E8E2DB]' : ''
                }`}
              >
                {name}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 flex-1 auto-rows-fr border-t border-[#E0DBD5]">
            {calendarDays.map((day, i) => {
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
                  className={`relative border-b border-r border-[#E8E2DB] text-left cursor-pointer transition-colors flex flex-col ${
                    selected ? 'bg-[#EEF2D6]/30' : 'hover:bg-[#F2EDE8]/60'
                  }`}
                >
                  {/* Date number */}
                  <div className="flex justify-center pt-1.5 pb-1">
                    <span
                      className={`text-[13px] w-7 h-7 flex items-center justify-center rounded-full leading-none ${
                        today
                          ? 'bg-[#7A5C44] text-white font-semibold'
                          : inMonth
                            ? 'text-[#1B1B18] font-medium'
                            : 'text-[#8E8E89]'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>

                  {/* Event dots */}
                  {dayCards.length > 0 && (
                    <div className="flex justify-center gap-[3px] pb-1">
                      {dayCards.slice(0, 4).map((card) => (
                        <span
                          key={card.id}
                          className={`w-[5px] h-[5px] rounded-full ${DOT_COLORS[card.priority] || DOT_COLORS.medium}`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Right: Task detail panel */}
      <div className="w-full lg:w-72 shrink-0 bg-white rounded-xl border border-[#E0DBD5] flex flex-col overflow-hidden max-h-64 lg:max-h-none">
        {selectedDay ? (
          <>
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E2DB]">
              <span className="text-sm font-semibold text-[#1B1B18]">
                {format(selectedDay, 'EEEE, MMM d')}
              </span>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-xs text-[#8E8E89] hover:text-[#5C5C57] transition-colors"
              >
                Close
              </button>
            </div>

            {selectedDayCards.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm text-[#8E8E89]">
                No tasks scheduled
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y divide-[#F2EDE8]">
                {selectedDayCards.map((card) => (
                  <div key={card.id} className={`flex flex-col gap-1 px-4 py-3 border-l-[3px] ${EVENT_ACCENT[card.priority] || EVENT_ACCENT.medium}`}>
                    <p className="text-sm font-medium text-[#1B1B18]">{card.title}</p>
                    {card.description && (
                      <p className="text-xs text-[#5C5C57] line-clamp-2">{card.description}</p>
                    )}
                    {card.labels && card.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {card.labels.map((label) => (
                          <span key={`${label.text}-${label.color}`} className="text-[10px] font-medium text-[#5C5C57] bg-[#E8E2DB] rounded-full px-2 py-0.5">
                            {label.text}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-[#8E8E89]">
            Select a day
          </div>
        )}
      </div>
    </div>
  )
}
