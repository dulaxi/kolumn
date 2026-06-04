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

// Label selectors.
//
// Referential stability is load-bearing: Zustand's useSyncExternalStore calls
// getSnapshot() during commit, and if the snapshot reference differs from the
// last render's value with no state change, React schedules another render and
// loops forever ("Maximum update depth exceeded"). So these MUST return the
// same array reference when neither labels nor cardLabels has changed.
//
// The cache is keyed on (cardLabels, labels) for per-card lookups and on the
// labels object alone for board-wide lookups. WeakMap auto-evicts when those
// state slices are replaced by new immutable copies on every store update.

const EMPTY_LABELS = Object.freeze([])

const cardLabelsCache = new WeakMap() // state.cardLabels -> WeakMap<state.labels, Map<cardId, array>>
const boardLabelsCache = new WeakMap() // state.labels -> Map<boardId, array>

export const selectCardLabels = (cardId) => (state) => {
  const cl = state.cardLabels
  const ls = state.labels
  if (!cl || !ls) return EMPTY_LABELS

  let byLabels = cardLabelsCache.get(cl)
  if (!byLabels) {
    byLabels = new WeakMap()
    cardLabelsCache.set(cl, byLabels)
  }
  let byCard = byLabels.get(ls)
  if (!byCard) {
    byCard = new Map()
    byLabels.set(ls, byCard)
  }
  if (byCard.has(cardId)) return byCard.get(cardId)

  const ids = cl[cardId]
  if (!ids || ids.size === 0) {
    byCard.set(cardId, EMPTY_LABELS)
    return EMPTY_LABELS
  }
  const out = []
  for (const id of ids) {
    const l = ls[id]
    if (l && !l.archived_at) out.push(l)
  }
  const result = out.length ? out : EMPTY_LABELS
  byCard.set(cardId, result)
  return result
}

export const selectBoardLabels = (boardId) => (state) => {
  const ls = state.labels
  if (!ls) return EMPTY_LABELS

  let byBoard = boardLabelsCache.get(ls)
  if (!byBoard) {
    byBoard = new Map()
    boardLabelsCache.set(ls, byBoard)
  }
  if (byBoard.has(boardId)) return byBoard.get(boardId)

  const out = []
  for (const id in ls) {
    const l = ls[id]
    if (l.board_id === boardId && !l.archived_at) out.push(l)
  }
  out.sort((a, b) => a.text.toLowerCase().localeCompare(b.text.toLowerCase()))
  const result = out.length ? out : EMPTY_LABELS
  byBoard.set(boardId, result)
  return result
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
