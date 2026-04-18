import { useBoardStore } from '../store/boardStore'
import { useNoteStore } from '../store/noteStore'
import { useWorkspacesStore } from '../store/workspacesStore'

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

function lastColumnOf(boardId) {
  const columns = useBoardStore.getState().columns
  return Object.values(columns)
    .filter((c) => c.board_id === boardId)
    .sort((a, b) => a.position - b.position)
    .at(-1)
}

function findCards({ board, column, card_titles }) {
  const store = useBoardStore.getState()
  let cards = Object.values(store.cards)

  if (board) {
    const b = findBoardByName(board)
    if (!b) return []
    cards = cards.filter((c) => c.board_id === b.id)
  }

  if (column) {
    const boardId = board ? findBoardByName(board)?.id : null
    const cols = Object.values(store.columns)
    const lower = column.toLowerCase()
    const matchCol = cols.find(
      (c) => c.title.toLowerCase() === lower && (!boardId || c.board_id === boardId)
    )
    if (!matchCol) return []
    cards = cards.filter((c) => c.column_id === matchCol.id)
  }

  if (card_titles && card_titles.length > 0) {
    const lowerTitles = card_titles.map((t) => t.toLowerCase())
    cards = cards.filter((c) => lowerTitles.includes(c.title.toLowerCase()))
  }

  return cards
}

function findNoteByTitle(title) {
  const notes = useNoteStore.getState().notes
  const lower = title.toLowerCase()
  return Object.values(notes).find((n) => n.title.toLowerCase() === lower)
}

function findWorkspaceByName(name) {
  const workspaces = useWorkspacesStore.getState().workspaces
  const lower = name.toLowerCase()
  return Object.values(workspaces).find((w) => w.name.toLowerCase() === lower)
}

const DESTRUCTIVE_ACTIONS = ['delete_card', 'delete_board', 'delete_column', 'remove_member']

const aiBuildingCards = new Set()
export function isAIBuilding(cardId) { return aiBuildingCards.has(cardId) }

const AI_CARDS_KEY = 'kolumn-ai-cards'
function getAICards() { try { return new Set(JSON.parse(localStorage.getItem(AI_CARDS_KEY) || '[]')) } catch { return new Set() } }
function saveAICard(id) { const s = getAICards(); s.add(id); localStorage.setItem(AI_CARDS_KEY, JSON.stringify([...s].slice(-200))) }
export function isAICreated(cardId) { return getAICards().has(cardId) }

export function isDestructive(action) {
  return DESTRUCTIVE_ACTIONS.includes(action)
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
    aiBuildingCards.add(tempId)

    let cardId = tempId
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 200))
      const realId = useBoardStore.getState()._tempIdMap[tempId]
      if (realId) {
        aiBuildingCards.add(realId)
        saveAICard(realId)
        cardId = realId
        break
      }
    }
    setTimeout(() => { aiBuildingCards.delete(tempId); aiBuildingCards.delete(cardId) }, 3000)
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
    if (boardId) {
      store.setActiveBoard(boardId)
      window.dispatchEvent(new CustomEvent('kolumn:ai-navigate-board'))
    }
    return { ok: true, boardId }
  }

  if (action === 'move_cards') {
    if (!params.from_column && (!params.card_titles || params.card_titles.length === 0)) {
      return { ok: false, error: 'Provide from_column or card_titles to filter which cards to move' }
    }
    const board = findBoardByName(params.board)
    if (!board) return { ok: false, error: `Board "${params.board}" not found` }

    const toCol = findColumnByName(board.id, params.to_column)
    if (!toCol) return { ok: false, error: `Column "${params.to_column}" not found` }

    const cards = findCards({ board: params.board, column: params.from_column, card_titles: params.card_titles })
    if (cards.length === 0) return { ok: false, error: 'No matching cards found' }

    for (const card of cards) {
      await store.updateCard(card.id, { column_id: toCol.id })
    }
    return { ok: true, moved: cards.length }
  }

  if (action === 'update_cards') {
    if (!params.board && !params.column && (!params.card_titles || params.card_titles.length === 0)) {
      return { ok: false, error: 'Provide at least one filter (board, column, or card_titles)' }
    }

    const cards = findCards({ board: params.board, column: params.column, card_titles: params.card_titles })
    if (cards.length === 0) return { ok: false, error: 'No matching cards found' }

    const updates = { ...params.updates }
    if (updates.assignee) {
      updates.assignee_name = updates.assignee
      delete updates.assignee
    }

    for (const card of cards) {
      await store.updateCard(card.id, updates)
    }
    return { ok: true, updated: cards.length }
  }

  if (action === 'complete_cards') {
    if (!params.board && !params.column && (!params.card_titles || params.card_titles.length === 0)) {
      return { ok: false, error: 'Provide at least one filter (board, column, or card_titles)' }
    }

    const cards = findCards({ board: params.board, column: params.column, card_titles: params.card_titles })
    if (cards.length === 0) return { ok: false, error: 'No matching cards found' }

    for (const card of cards) {
      const lastCol = lastColumnOf(card.board_id)
      await store.updateCard(card.id, { completed: true, column_id: lastCol?.id || card.column_id })
    }
    return { ok: true, completed: cards.length }
  }

  if (action === 'search_cards' || action === 'summarize_board') {
    return { ok: true, readOnly: true }
  }

  return { ok: false, error: `Unknown action: ${action}` }
}
