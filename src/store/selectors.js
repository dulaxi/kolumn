// Memoized selectors for boardStore.
// Each factory returns a selector function that caches its result and only
// recomputes when the underlying slice (columns or cards) changes.

function createMemoizedSelector(compute) {
  let lastInput = undefined
  let lastResult = undefined

  return (state) => {
    const input = compute.extract(state)
    if (input === lastInput) return lastResult
    lastInput = input
    lastResult = compute.transform(input)
    return lastResult
  }
}

// Returns columns for a board, sorted by position.
// Memoized: only recomputes when the columns object reference changes.
export function selectBoardColumns(boardId) {
  return createMemoizedSelector({
    extract: (state) => state.columns,
    transform: (columns) =>
      Object.values(columns)
        .filter((c) => c.board_id === boardId)
        .sort((a, b) => a.position - b.position),
  })
}

// Returns cards for a column, sorted by position.
export function selectColumnCards(columnId) {
  return createMemoizedSelector({
    extract: (state) => state.cards,
    transform: (cards) =>
      Object.values(cards)
        .filter((c) => c.column_id === columnId)
        .sort((a, b) => a.position - b.position),
  })
}

// Returns all cards for a board (unsorted).
export function selectBoardCards(boardId) {
  return createMemoizedSelector({
    extract: (state) => state.cards,
    transform: (cards) =>
      Object.values(cards).filter((c) => c.board_id === boardId),
  })
}

// Label selectors: pure functions (no memoization yet, as these hit a new state slice).

const EMPTY_LABELS = Object.freeze([])

export const selectCardLabels = (cardId) => (state) => {
  const ids = state.cardLabels?.[cardId]
  if (!ids || ids.size === 0) return EMPTY_LABELS
  const out = []
  for (const id of ids) {
    const l = state.labels?.[id]
    if (l && !l.archived_at) out.push(l)
  }
  return out.length ? out : EMPTY_LABELS
}

export const selectBoardLabels = (boardId) => (state) => {
  const out = []
  for (const id in state.labels) {
    const l = state.labels[id]
    if (l.board_id === boardId && !l.archived_at) out.push(l)
  }
  out.sort((a, b) => a.text.toLowerCase().localeCompare(b.text.toLowerCase()))
  return out
}

export const selectBoardLabelByText = (boardId, text) => (state) => {
  const target = text.trim().toLowerCase()
  for (const id in state.labels) {
    const l = state.labels[id]
    if (l.board_id === boardId && !l.archived_at && l.text.toLowerCase() === target) {
      return l
    }
  }
  return undefined
}
