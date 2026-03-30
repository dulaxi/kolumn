export function buildColumnMap(columns, boards, cards) {
  const columnMap = new Map()

  const sortedColumns = Object.values(columns).sort((a, b) => a.position - b.position)

  for (const column of sortedColumns) {
    const board = boards[column.board_id]
    if (!board) continue
    if (!columnMap.has(column.title)) {
      columnMap.set(column.title, [])
    }
    const bucket = columnMap.get(column.title)
    const columnCards = Object.values(cards)
      .filter((c) => c.column_id === column.id)
      .sort((a, b) => a.position - b.position)

    for (const card of columnCards) {
      bucket.push({ card, boardIcon: board.icon })
    }
  }

  return columnMap
}
