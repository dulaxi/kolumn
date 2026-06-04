import { addDays, addMonths, format, isPast, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns'

// Parse a due_date value into a Date in the user's LOCAL timezone.
//
// `cards.due_date` is semantically a CALENDAR DATE in this app — the user
// never picks a time of day. The DB column is `timestamptz`, however, so a
// write of "2026-05-14" comes back from Postgres as
// "2026-05-14T00:00:00+00:00" (UTC midnight). Both `parseISO()` and
// `new Date(str)` would then represent this as the previous calendar day in
// local time for users west of UTC.
//
// Fix: extract just the YYYY-MM-DD prefix from any incoming value and
// construct the Date via `new Date(year, month-1, day)` — always local
// midnight. The time portion of timestamptz strings is discarded as noise
// because it has no semantic value in this app.
export function parseDueDate(value) {
  if (value instanceof Date) return value
  if (typeof value !== 'string') return null
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  }
  // Defensive fallback for any non-ISO-shaped string the model might emit
  return parseISO(value)
}

export function addRecurrenceInterval(date, interval, unit) {
  if (unit === 'months') return addMonths(date, interval)
  return addDays(date, interval)
}

export function groupCardsByDate(cards) {
  const map = {}
  Object.values(cards).forEach((card) => {
    if (!card.due_date) return
    const dateKey = format(parseDueDate(card.due_date), 'yyyy-MM-dd')
    if (!map[dateKey]) map[dateKey] = []
    map[dateKey].push(card)
  })
  return map
}

export function getCardsForDate(cardsByDate, day) {
  if (!day) return []
  const key = format(day, 'yyyy-MM-dd')
  return cardsByDate[key] || []
}

export function formatDueDateLabel(date, { long = false } = {}) {
  if (!date) return ''
  const d = typeof date === 'string' ? parseDueDate(date) : date
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  if (isTomorrow(d)) return 'Tomorrow'
  return format(d, long ? 'MMM d, yyyy' : 'MMM d')
}

export function dueDateColorClass(date) {
  if (!date) return 'text-[#57534e]'
  const d = typeof date === 'string' ? parseDueDate(date) : date
  if (isYesterday(d) || (isPast(d) && !isToday(d))) return 'text-[var(--color-copper)] font-medium'
  if (isToday(d)) return 'text-[var(--color-honey)] font-medium'
  if (isTomorrow(d)) return 'text-[var(--color-lime-dark)] font-medium'
  return 'text-[#57534e]'
}

export function dueDateBadgeClass(date) {
  if (!date) return 'bg-[var(--surface-hover)] text-[var(--text-muted)]'
  const d = typeof date === 'string' ? parseDueDate(date) : date
  if (isYesterday(d) || (isPast(d) && !isToday(d))) return 'bg-[var(--color-copper-wash)] text-[var(--color-copper)]'
  if (isToday(d)) return 'bg-[var(--color-honey-wash)] text-[var(--color-honey)]'
  return 'bg-[var(--color-lime-wash)] text-[var(--color-lime-dark)]'
}

// Outlined / "faded pill" variant of the due-date chip: same color
// semantics (copper/honey/lime), but rendered as a thin border at low
// alpha + colored text, no fill. Canonical chip style on cards.
export function dueDateOutlineClass(date) {
  if (!date) return 'text-[var(--text-muted)] border-[var(--text-muted)]/20'
  const d = typeof date === 'string' ? parseDueDate(date) : date
  if (isYesterday(d) || (isPast(d) && !isToday(d))) return 'text-[var(--color-copper)] border-[var(--color-copper)]/30'
  if (isToday(d)) return 'text-[var(--color-honey)] border-[var(--color-honey)]/30'
  return 'text-[var(--color-lime-dark)] border-[var(--color-lime-dark)]/30'
}
