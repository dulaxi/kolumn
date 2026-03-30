import { isToday, isPast, isThisWeek, parseISO } from 'date-fns'

export function filterCards(cards, filters) {
  if (!filters) return cards

  return cards.filter((card) => {
    if (filters.priority?.length && !filters.priority.includes(card.priority)) return false
    if (filters.assignee && card.assignee_name !== filters.assignee) return false
    if (filters.label?.length && !(card.labels || []).some((l) => filters.label.includes(l.text))) return false
    if (filters.due) {
      const d = card.due_date ? parseISO(card.due_date) : null
      if (filters.due === 'overdue' && !(d && isPast(d) && !isToday(d))) return false
      if (filters.due === 'today' && !(d && isToday(d))) return false
      if (filters.due === 'week' && !(d && isThisWeek(d))) return false
      if (filters.due === 'none' && d) return false
    }
    return true
  })
}
