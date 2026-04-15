import { isToday, isPast, isYesterday, parseISO, startOfDay, subDays, format } from 'date-fns'

export function computeTaskStats(cards, columns, displayName) {
  const allCards = Object.values(cards).filter((c) => {
    if (c.archived) return false
    // Multi-assignee: I "own" the card if I'm in assignees[] — falls back
    // to legacy single assignee_name for un-migrated cards.
    const names = (c.assignees && c.assignees.length)
      ? c.assignees
      : (c.assignee_name ? [c.assignee_name] : [])
    return names.includes(displayName)
  })
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
  let completedYesterday = 0
  const dueTodayCards = []
  const overdueCards = []
  const focusCards = []

  for (const card of allCards) {
    const isDone = doneColumnIds.has(card.column_id)

    if (isDone) {
      completed++
      if (card.updated_at && isYesterday(parseISO(card.updated_at))) {
        completedYesterday++
      }
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
        focusCards.push(card)
      } else if (isPast(due)) {
        overdue++
        overdueCards.push(card)
        focusCards.push(card)
      }
    }
  }

  // Sort focus: overdue first (oldest first), then due today by priority
  const priorityWeight = { high: 0, medium: 1, low: 2 }
  focusCards.sort((a, b) => {
    const aOverdue = overdueCards.includes(a) ? 0 : 1
    const bOverdue = overdueCards.includes(b) ? 0 : 1
    if (aOverdue !== bOverdue) return aOverdue - bOverdue
    return (priorityWeight[a.priority] ?? 1) - (priorityWeight[b.priority] ?? 1)
  })

  // Streak: count consecutive days (ending today or yesterday) that had completions
  const allDone = Object.values(cards).filter(
    (c) => !c.archived && doneColumnIds.has(c.column_id) && c.updated_at
  )
  const completionDays = new Set(
    allDone.map((c) => format(parseISO(c.updated_at), 'yyyy-MM-dd'))
  )
  let streak = 0
  const today = startOfDay(new Date())
  for (let i = 0; i < 30; i++) {
    const day = format(subDays(today, i), 'yyyy-MM-dd')
    if (completionDays.has(day)) {
      streak++
    } else if (i === 0) {
      continue // today hasn't ended yet, skip
    } else {
      break
    }
  }

  return {
    dueToday, overdue, inProgress, completed, completedYesterday,
    dueTodayCards, overdueCards, focusCards, streak,
  }
}

export function computeBoardSummaries(boards, columns, cards, displayName) {
  return Object.values(boards).map((board) => {
    const boardCols = Object.values(columns)
      .filter((c) => c.board_id === board.id)
      .sort((a, b) => a.position - b.position)

    const boardCards = Object.values(cards).filter(
      (c) => c.board_id === board.id
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
