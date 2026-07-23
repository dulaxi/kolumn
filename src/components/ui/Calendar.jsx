import { useState } from 'react'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { addDays, addMonths, format, isSameDay, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek } from 'date-fns'

// Kolumn's own month calendar (replaces native <input type="date"> pickers).
// Controlled: `value` is 'yyyy-MM-dd' (or ''/null), onChange fires with the
// same format — or null from Clear. Monday-start: Kolumn is a work-week tool.
// Selection uses the app-wide "selected" wash (mauve-cream, same as sidebar
// rows); today is marked with a 1px border ring, never a fill.
const WEEK_STARTS_ON = 1

export default function Calendar({ value, onChange }) {
  const selected = value ? parseISO(value) : null
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selected || new Date()))

  const gridStart = startOfWeek(viewMonth, { weekStartsOn: WEEK_STARTS_ON })
  // Fixed 6 weeks so the popover never changes height between months.
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))

  return (
    <div className="w-[248px] p-2 select-none">
      {/* Month header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, -1))}
          aria-label="Previous month"
          className="h-7 w-7 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors cursor-pointer"
        >
          <CaretLeft className="w-3.5 h-3.5" weight="bold" />
        </button>
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {format(viewMonth, 'MMMM yyyy')}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          aria-label="Next month"
          className="h-7 w-7 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors cursor-pointer"
        >
          <CaretRight className="w-3.5 h-3.5" weight="bold" />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 mb-1">
        {days.slice(0, 7).map((d) => (
          <span key={d.toISOString()} className="h-6 flex items-center justify-center text-[10px] font-medium uppercase tracking-wide text-[var(--text-faint)]">
            {format(d, 'EEEEEE')}
          </span>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day) => {
          const inMonth = isSameMonth(day, viewMonth)
          const isSelected = selected && isSameDay(day, selected)
          const today = isToday(day)
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onChange(format(day, 'yyyy-MM-dd'))}
              aria-label={format(day, 'PPPP')}
              aria-pressed={!!isSelected}
              className={[
                'h-8 w-8 mx-auto rounded-md flex items-center justify-center text-[13px] tabular-nums transition-colors cursor-pointer',
                isSelected
                  ? 'bg-[var(--color-mauve-cream)] font-medium text-[var(--text-primary)]'
                  : today
                    ? 'border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/50'
                    : inMonth
                      ? 'text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/50'
                      : 'text-[var(--text-faint)] hover:bg-[var(--surface-raised)]/50',
              ].join(' ')}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border-subtle)] px-1">
        <span>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </span>
        <button
          type="button"
          onClick={() => onChange(format(new Date(), 'yyyy-MM-dd'))}
          className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          Today
        </button>
      </div>
    </div>
  )
}
