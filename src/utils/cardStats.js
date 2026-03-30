import { isToday, isPast, parseISO } from 'date-fns'

export function computeTaskStats(cards, columns, displayName) {
  const allCards = Object.values(cards).filter(
    (c) => c.assignee_name && c.assignee_name === displayName
  )
  const allColumns = Object.values(columns)

  const doneColumnIds = new Set(
    allColumns
      .filter((col) => col.title.toLowerCase() === 'done')
      .map((col) => col.id)
  )
  const inProgressColumnIds = new Set(
    allColumns
      .filter((col) => col.title.toLowerCase() === 'in progress')
      .map((col) => col.id)
  )

  let dueToday = 0
  let overdue = 0
  let inProgress = 0
  let completed = 0
  const dueTodayCards = []
  const overdueCards = []

  for (const card of allCards) {
    const isDone = doneColumnIds.has(card.column_id)

    if (isDone) {
      completed++
      continue
    }

    if (inProgressColumnIds.has(card.column_id)) {
      inProgress++
    }

    if (card.due_date) {
      const due = parseISO(card.due_date)
      if (isToday(due)) {
        dueToday++
        dueTodayCards.push(card)
      } else if (isPast(due)) {
        overdue++
        overdueCards.push(card)
      }
    }
  }

  return { dueToday, overdue, inProgress, completed, dueTodayCards, overdueCards }
}

export function computeBoardSummaries(boards, columns, cards, displayName) {
  return Object.values(boards).map((board) => {
    const boardCols = Object.values(columns)
      .filter((c) => c.board_id === board.id)
      .sort((a, b) => a.position - b.position)

    const boardCards = Object.values(cards).filter(
      (c) => c.board_id === board.id && c.assignee_name && c.assignee_name === displayName
    )
    const totalCards = boardCards.length

    const colCounts = boardCols.map((col) => ({
      id: col.id,
      title: col.title,
      count: boardCards.filter((c) => c.column_id === col.id).length,
    }))

    const lastUpdated = boardCards.reduce((latest, c) => {
      const ts = c.updated_at ? new Date(c.updated_at).getTime() : 0
      return ts > latest ? ts : latest
    }, 0)

    return {
      ...board,
      columns: colCounts,
      totalCards,
      lastUpdated: lastUpdated || null,
    }
  })
}
