import { parseDueDate } from '../utils/dateUtils'

// Groups the card rail's mentioned-card list for display. The input arrives
// newest-mention-first (CardRail derives it that way); every mode preserves
// that order within a group, and board/column sections are ordered by their
// most recently mentioned card (first appearance in the input).
//
// Returns [{ key, label, cards }]. `label: null` means "render no header"
// (the flat `mentioned` mode).
export function groupCards(mentionedCards, mode, { boards = {}, columns = {} } = {}) {
  if (mode === 'board') {
    return groupBy(
      mentionedCards,
      (card) => {
        const board = boards[card.board_id]
        return board ? { key: `board-${board.id}`, label: board.name } : null
      },
      { fallbackKey: 'board-unknown', fallbackLabel: 'Unknown board' },
    )
  }
  if (mode === 'column') {
    return groupBy(
      mentionedCards,
      (card) => {
        const column = columns[card.column_id]
        // Keyed by title so same-named columns from different boards merge.
        return column ? { key: `col-${column.title}`, label: column.title } : null
      },
      { fallbackKey: 'col-none', fallbackLabel: 'No column' },
    )
  }
  if (mode === 'due') return groupByDue(mentionedCards)
  return [{ key: 'mentioned', label: null, cards: mentionedCards }]
}

function groupBy(cards, resolve, { fallbackKey, fallbackLabel }) {
  const groups = new Map()
  const fallback = { key: fallbackKey, label: fallbackLabel, cards: [] }
  for (const card of cards) {
    const g = resolve(card)
    if (!g) {
      fallback.cards.push(card)
      continue
    }
    if (!groups.has(g.key)) groups.set(g.key, { key: g.key, label: g.label, cards: [] })
    groups.get(g.key).cards.push(card)
  }
  const out = [...groups.values()]
  if (fallback.cards.length) out.push(fallback)
  return out
}

const DUE_BUCKETS = ['overdue', 'today', 'week', 'later', 'none', 'completed']
const DUE_LABELS = {
  overdue: 'Overdue',
  today: 'Today',
  week: 'This week',
  later: 'Later',
  none: 'No date',
  completed: 'Completed',
}

// Completed always wins — mirrors the read-tools rule that a completed card
// is never "overdue". Boundaries are local midnights; "This week" is due
// after today and within the next 7 days.
function dueBucket(card) {
  if (card.completed) return 'completed'
  if (!card.due_date) return 'none'
  const due = parseDueDate(card.due_date)
  if (!due || Number.isNaN(due.getTime())) return 'none'
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 8)
  if (due < todayStart) return 'overdue'
  if (due < tomorrowStart) return 'today'
  if (due < weekEnd) return 'week'
  return 'later'
}

function groupByDue(cards) {
  const buckets = Object.fromEntries(DUE_BUCKETS.map((k) => [k, []]))
  for (const card of cards) buckets[dueBucket(card)].push(card)
  return DUE_BUCKETS.filter((k) => buckets[k].length).map((k) => ({
    key: `due-${k}`,
    label: DUE_LABELS[k],
    cards: buckets[k],
  }))
}
