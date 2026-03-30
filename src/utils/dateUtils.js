import { addDays, addMonths, format, parseISO } from 'date-fns'

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
