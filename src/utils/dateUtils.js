import { addDays, addMonths, format, isPast, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns'

export function addRecurrenceInterval(date, interval, unit) {
  if (unit === 'months') return addMonths(date, interval)
  return addDays(date, interval)
}

export function groupCardsByDate(cards) {
  const map = {}
  Object.values(cards).forEach((card) => {
    if (!card.due_date) return
    const dateKey = format(parseISO(card.due_date), 'yyyy-MM-dd')
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
  const d = typeof date === 'string' ? parseISO(date) : date
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  if (isTomorrow(d)) return 'Tomorrow'
  return format(d, long ? 'MMM d, yyyy' : 'MMM d')
}

export function dueDateColorClass(date) {
  if (!date) return 'text-[#57534e]'
  const d = typeof date === 'string' ? parseISO(date) : date
  if (isYesterday(d) || (isPast(d) && !isToday(d))) return 'text-[#C27A4A] font-medium'
  if (isToday(d)) return 'text-[#D4A843] font-medium'
  if (isTomorrow(d)) return 'text-[#A8BA32] font-medium'
  return 'text-[#57534e]'
}

export function dueDateBadgeClass(date) {
  if (!date) return 'bg-[var(--surface-hover)] text-[var(--text-muted)]'
  const d = typeof date === 'string' ? parseISO(date) : date
  if (isYesterday(d) || (isPast(d) && !isToday(d))) return 'bg-[#F2D9C7] text-[#C27A4A]'
  if (isToday(d)) return 'bg-[#F5EDCF] text-[#D4A843]'
  return 'bg-[#EEF2D6] text-[#A8BA32]'
}
