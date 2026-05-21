import { isToday, isPast, isThisWeek } from 'date-fns'
import { parseDueDate } from './dateUtils'

export function filterCards(cards, filters) {
  if (!filters) return cards

  return cards.filter((card) => {
    if (filters.priority?.length && !filters.priority.includes(card.priority)) return false
    if (filters.assignee) {
      // Multi-assignee: card matches if any assignee name equals the filter.
      // Fall back to legacy single assignee_name for un-migrated cards.
      const names = (card.assignees && card.assignees.length)
        ? card.assignees
        : (card.assignee_name ? [card.assignee_name] : [])
      if (!names.some((n) => n === filters.assignee)) return false
    }
    if (filters.label?.length) {
      const cardLabelTexts = card._labelTexts || []
      if (!cardLabelTexts.some((t) => filters.label.includes(t))) return false
    }
    if (filters.due) {
      const d = card.due_date ? parseDueDate(card.due_date) : null
      if (filters.due === 'overdue' && !(d && isPast(d) && !isToday(d))) return false
      if (filters.due === 'today' && !(d && isToday(d))) return false
      if (filters.due === 'this_week' && !(d && isThisWeek(d))) return false
      if (filters.due === 'no_date' && d) return false
    }
    return true
  })
}
