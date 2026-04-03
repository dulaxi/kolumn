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
