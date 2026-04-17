import { useBoardStore } from '../store/boardStore'

function findBoardByName(name) {
  const boards = useBoardStore.getState().boards
  const lower = name.toLowerCase()
  return Object.values(boards).find((b) => b.name.toLowerCase() === lower)
}

function findColumnByName(boardId, name) {
  const columns = useBoardStore.getState().columns
  const lower = name.toLowerCase()
  return Object.values(columns).find(
    (c) => c.board_id === boardId && c.title.toLowerCase() === lower
  )
}

function findCardByTitle(title) {
  const cards = useBoardStore.getState().cards
  const lower = title.toLowerCase()
  return Object.values(cards).find((c) => c.title.toLowerCase() === lower)
}

function firstColumnOf(boardId) {
  const columns = useBoardStore.getState().columns
  return Object.values(columns)
    .filter((c) => c.board_id === boardId)
    .sort((a, b) => a.position - b.position)[0]
}

export async function executeTool(action, params) {
  console.log('[toolExecutor]', action, params)
  const store = useBoardStore.getState()

  if (action === 'create_card') {
    const board = params.board ? findBoardByName(params.board) : Object.values(store.boards)[0]
    if (!board) return { ok: false, error: `Board "${params.board}" not found` }

    const column = params.column
      ? findColumnByName(board.id, params.column)
      : firstColumnOf(board.id)
    if (!column) return { ok: false, error: `Column "${params.column}" not found` }

    const checklist = (params.checklist || []).map((text) => ({ text, done: false }))

    const tempId = await store.addCard(board.id, column.id, {
      title: params.title,
      description: params.description || '',
      priority: params.priority || 'medium',
      icon: params.icon || null,
      labels: params.labels || [],
      checklist,
      assignee_name: params.assignee || null,
      dueDate: params.due_date || null,
    })
    if (!tempId) return { ok: false, error: 'Failed to create card' }

    let cardId = tempId
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 200))
      const realId = useBoardStore.getState()._tempIdMap[tempId]
      if (realId) { cardId = realId; break }
    }
    return { ok: true, cardId }
  }

  if (action === 'move_card') {
    const card = findCardByTitle(params.card_title)
    if (!card) return { ok: false, error: `Card "${params.card_title}" not found` }

    const targetBoardId = params.to_board
      ? findBoardByName(params.to_board)?.id
      : card.board_id
    if (!targetBoardId) return { ok: false, error: `Board "${params.to_board}" not found` }

    const column = findColumnByName(targetBoardId, params.to_column)
    if (!column) return { ok: false, error: `Column "${params.to_column}" not found` }

    await store.updateCard(card.id, { column_id: column.id, board_id: targetBoardId })
    return { ok: true }
  }

  if (action === 'update_card') {
    const card = findCardByTitle(params.card_title)
    if (!card) return { ok: false, error: `Card "${params.card_title}" not found` }

    const updates = { ...params.updates }
    if (updates.checklist) {
      updates.checklist = updates.checklist.map((text) =>
        typeof text === 'string' ? { text, done: false } : text
      )
    }
    if (updates.assignee) {
      updates.assignee_name = updates.assignee
      delete updates.assignee
    }

    await store.updateCard(card.id, updates)
    return { ok: true }
  }

  if (action === 'delete_card') {
    const card = findCardByTitle(params.card_title)
    if (!card) return { ok: false, error: `Card "${params.card_title}" not found` }
    await store.deleteCard(card.id)
    return { ok: true }
  }

  if (action === 'create_board') {
    const columns = params.columns || ['To Do', 'In Progress', 'Done']
    const boardId = await store.addBoard(params.name, params.icon || null, columns)
    return { ok: true, boardId }
  }

  if (action === 'search_cards' || action === 'summarize_board') {
    return { ok: true, readOnly: true }
  }

  return { ok: false, error: `Unknown action: ${action}` }
}
