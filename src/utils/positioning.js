export function reorderSameColumn(cards, fromIndex, toIndex) {
  const result = [...cards]
  const [moved] = result.splice(fromIndex, 1)
  result.splice(toIndex, 0, moved)
  return result.map((card, i) => ({ ...card, position: i }))
}

export function moveBetweenColumns(fromCards, toCards, fromIndex, toIndex, toColumnId) {
  const movedCard = fromCards[fromIndex]

  const newFromCards = fromCards
    .filter((c) => c.id !== movedCard.id)
    .map((card, i) => ({ ...card, position: i }))

  const newToCards = [...toCards]
  newToCards.splice(toIndex, 0, { ...movedCard, column_id: toColumnId, completed: false })

  return {
    newFromCards,
    newToCards: newToCards.map((card, i) => ({ ...card, position: i })),
  }
}

export function calcNewCardPosition(columnCards) {
  return columnCards.length
}

export function calcGlobalTaskNumber(cards) {
  return Object.values(cards).reduce((max, c) => Math.max(max, c.global_task_number || 0), 0) + 1
}
