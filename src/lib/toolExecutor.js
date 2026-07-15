import { useBoardStore } from '../store/boardStore'
import { useWorkspacesStore } from '../store/workspacesStore'
import { LEGACY_ICON_REMAP } from '../components/board/DynamicIcon'
import { supabase } from './supabase'
import { logWarn } from '../utils/logger'

// Resolves an array of label text strings into label IDs (via the upsert_label
// RPC) and syncs the card_labels join table for a given card.
//
// Semantics:
//   - texts === undefined  → no-op (the tool call didn't include a labels field)
//   - texts === null / []  → clear all labels on the card
//   - non-empty list       → resolve each text, delete rows not in result set, upsert the rest
//
// The boardStore realtime subscription picks up the card_labels changes and
// updates Zustand state automatically — no manual set() calls needed here.
async function resolveAndSyncLabels(cardId, boardId, texts) {
  if (texts === undefined) return
  const list = texts ?? []
  const resolvedIds = []
  for (const text of list) {
    if (!text || !String(text).trim()) continue
    const { data, error } = await supabase.rpc('upsert_label', {
      p_board_id: boardId,
      p_text: String(text).trim(),
    })
    if (error) throw error
    if (data) resolvedIds.push(data)
  }
  if (resolvedIds.length === 0) {
    await supabase.from('card_labels').delete().eq('card_id', cardId)
  } else {
    await supabase
      .from('card_labels')
      .delete()
      .eq('card_id', cardId)
      .not('label_id', 'in', `(${resolvedIds.join(',')})`)
    await supabase
      .from('card_labels')
      .upsert(
        resolvedIds.map((label_id) => ({ card_id: cardId, label_id })),
        { onConflict: 'card_id,label_id' },
      )
  }
}

// Normalize an icon name from the model: trim, lowercase, accept only kebab-case-ish
// strings (letters/digits/hyphens), then apply the legacy lucide→Phosphor remap.
// Returns null for anything malformed so the card renders without an icon rather
// than crashing on a bad Phosphor name.
function normalizeIcon(name) {
  if (!name || typeof name !== 'string') return null
  const trimmed = name.trim().toLowerCase()
  if (!trimmed) return null
  if (!/^[a-z0-9-]+$/.test(trimmed)) return null
  return LEGACY_ICON_REMAP[trimmed] || trimmed
}

const TITLE_MAX = 200
const DESCRIPTION_MAX = 5000

// Capitalize the first letter of a title — but only when the first word looks
// like an accidental lowercase ("buy milk" from a fast-path paste), not when
// the case is intentional ("iPhone repair", "API rewrite", "macOS update").
// Heuristic: skip if any uppercase letter already appears in the first word.
function capitalizeFirstLetter(title) {
  if (!title) return title
  // Bail out if it doesn't start with a lowercase letter (number, emoji, etc.)
  if (!/^[a-z]/.test(title)) return title
  const firstSpace = title.search(/\s/)
  const firstWord = firstSpace >= 0 ? title.slice(0, firstSpace) : title
  // Intentional casing signal: any uppercase letter inside the first word
  if (/[A-Z]/.test(firstWord)) return title
  return title.charAt(0).toUpperCase() + title.slice(1)
}

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

function firstColumnOf(boardId) {
  const columns = useBoardStore.getState().columns
  return Object.values(columns)
    .filter((c) => c.board_id === boardId)
    .sort((a, b) => a.position - b.position)[0]
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
  const store = useBoardStore.getState()

  if (action === 'create_card') {
    // Title: required, trimmed, 1–200 chars. Capitalize the first letter so
    // the fast path (which ships raw user paste) produces presentable cards
    // — e.g. "buy milk" → "Buy milk". See `capitalizeFirstLetter` for the
    // intentional-casing heuristic that preserves "iPhone repair" etc.
    const titleTrimmed = (params.title || '').trim()
    if (!titleTrimmed) return { ok: false, error: 'Card title is required' }
    if (titleTrimmed.length > TITLE_MAX) {
      return { ok: false, error: `Card title is too long (max ${TITLE_MAX} chars)` }
    }
    const title = capitalizeFirstLetter(titleTrimmed)

    // Description: truncate silently at DESCRIPTION_MAX, flag in result
    const descRaw = params.description || ''
    const truncated = descRaw.length > DESCRIPTION_MAX
    const description = truncated ? descRaw.slice(0, DESCRIPTION_MAX) : descRaw

    // Board: prefer boardId (pill injects this), fall back to board name for
    // future surfaces that may not have a pinned board.
    let board = null
    if (params.boardId) {
      board = store.boards[params.boardId] || null
    } else if (params.board) {
      board = findBoardByName(params.board)
    }
    if (!board) {
      if (params.boardId) return { ok: false, error: 'Board not found for the given boardId' }
      if (params.board) return { ok: false, error: `Board "${params.board}" not found` }
      return { ok: false, error: 'No board context — caller must provide boardId' }
    }

    // Column: provided name → match; otherwise first by position
    let column
    if (params.column) {
      column = findColumnByName(board.id, params.column)
      if (!column) {
        const available = Object.values(store.columns)
          .filter((c) => c.board_id === board.id)
          .sort((a, b) => a.position - b.position)
          .map((c) => c.title)
          .join(', ')
        return { ok: false, error: `Column "${params.column}" not found on "${board.name}". Available: ${available}` }
      }
    } else {
      column = firstColumnOf(board.id)
      if (!column) return { ok: false, error: `Board "${board.name}" has no columns` }
    }

    // Defaults enforced in executor (not just prompt) so the pill's fast path
    // and LLM path produce identical cards. Conservative principle: do NOT
    // auto-attribute user-facing fields like assignee — leave null unless the
    // user explicitly named someone. See memory:
    // feedback_ai_tool_defaults_conservative.
    const appliedDefaults = []

    const priority = params.priority || 'medium'
    if (!params.priority) appliedDefaults.push('priority')

    const assignee = params.assignee || null

    const icon = normalizeIcon(params.icon)
    const checklist = (params.checklist || []).map((text) => ({ text, done: false }))

    // boardStore.addCard reads `cardData.assignee` (not `assignee_name`) and
    // `cardData.dueDate` (not `due_date`). This camelCase quirk is intentional
    // — see CLAUDE.md → Key Data Shapes. The store maps to the snake_case
    // DB columns internally. Do not "fix" by renaming here.
    const tempId = await store.addCard(board.id, column.id, {
      title,
      description,
      priority,
      icon,
      checklist,
      assignee,
      dueDate: params.due_date || null,
    })
    if (!tempId) return { ok: false, error: 'Failed to create card' }
    aiBuildingCards.add(tempId)

    // Capture task_number from the optimistic card (set by boardStore.addCard)
    const taskNumber = useBoardStore.getState().cards[tempId]?.task_number ?? null

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

    // Sync labels — only possible once we have the real (non-temp) card ID.
    // If temp-ID resolution timed out, the card still exists but label sync
    // won't fire on this call — surface that to the model as a warning
    // rather than staying silent about it.
    let labelWarning
    if (cardId !== tempId && params.labels !== undefined) {
      try {
        await resolveAndSyncLabels(cardId, board.id, params.labels)
      } catch (err) {
        logWarn('[toolExecutor] create_card label sync failed:', err)
        labelWarning = 'labels could not be applied'
      }
    } else if (params.labels !== undefined && cardId === tempId) {
      labelWarning = 'card still syncing — labels were skipped'
    }

    return {
      ok: true,
      cardId,
      task_number: taskNumber,
      resolved: {
        board: { id: board.id, name: board.name },
        column: { id: column.id, title: column.title },
      },
      applied_defaults: appliedDefaults,
      ...(truncated ? { truncated: true } : {}),
      ...(labelWarning ? { warning: labelWarning } : {}),
    }
  }

  if (action === 'move_card') {
    // Source card resolution. Order of precedence:
    //   1. params.cardId (forward-compat; the model can't fabricate one today
    //      because IDs aren't in the prompt, but the field is wired for when
    //      they are).
    //   2. params.card_title scoped to params.boardId (pill's host board) —
    //      this is the common path. Strict scope: no cross-board source.
    //   3. Defensive global fallback when boardId is absent (future
    //      non-pill surface, e.g. a chat read-only summarize that needs to
    //      identify cards).
    let card = null
    let sourceBoard = null
    let scopeName = '' // used in the not-found error

    if (params.cardId) {
      const candidate = store.cards[params.cardId] || null
      // Enforce pill scope: cardId must point to a card on the pill's board
      if (candidate && params.boardId && candidate.board_id !== params.boardId) {
        return { ok: false, error: 'Card is not on the current board' }
      }
      if (candidate) {
        card = candidate
        sourceBoard = store.boards[card.board_id] || null
      }
    } else if (params.card_title) {
      const lowerTitle = params.card_title.toLowerCase()
      if (params.boardId) {
        sourceBoard = store.boards[params.boardId] || null
        if (!sourceBoard) {
          return { ok: false, error: 'Board not found for the given boardId' }
        }
        scopeName = `board "${sourceBoard.name}"`
        const matches = Object.values(store.cards).filter(
          (c) => c.board_id === sourceBoard.id && c.title.toLowerCase() === lowerTitle,
        )
        if (matches.length > 1) {
          const hints = matches
            .map((m) => `"${m.title}" in ${store.columns[m.column_id]?.title || 'unknown column'}`)
            .join(', ')
          return {
            ok: false,
            error: `Multiple cards titled "${params.card_title}" on ${scopeName} (${hints}). Be more specific.`,
          }
        }
        card = matches[0] || null
      } else {
        // Defensive global search
        scopeName = 'any board'
        const matches = Object.values(store.cards).filter(
          (c) => c.title.toLowerCase() === lowerTitle,
        )
        if (matches.length > 1) {
          const hints = matches
            .map((m) => `${store.boards[m.board_id]?.name || '?'}/${store.columns[m.column_id]?.title || '?'}`)
            .join(', ')
          return {
            ok: false,
            error: `Multiple cards titled "${params.card_title}" across boards (${hints}). Be more specific.`,
          }
        }
        card = matches[0] || null
        if (card) sourceBoard = store.boards[card.board_id] || null
      }
    }

    if (!card) {
      return {
        ok: false,
        error: `Card "${params.card_title || params.cardId}" not found on ${scopeName || 'any board'}`,
      }
    }
    if (!sourceBoard) {
      return { ok: false, error: 'Source board for the card could not be resolved' }
    }
    const sourceColumn = store.columns[card.column_id] || null

    // Target board is always the source board. Cross-board moves are off
    // — the pill is a single-board action surface, and to_board/to_board_id
    // have been removed from the schema. If the model still emits them
    // (stale prompt cache, etc.), we silently ignore.
    const targetBoard = sourceBoard

    // Target column resolution — must exist on target board
    const targetColumn = findColumnByName(targetBoard.id, params.to_column)
    if (!targetColumn) {
      const available = Object.values(store.columns)
        .filter((c) => c.board_id === targetBoard.id)
        .sort((a, b) => a.position - b.position)
        .map((c) => c.title)
        .join(', ')
      return {
        ok: false,
        error: `Column "${params.to_column}" not found on "${targetBoard.name}". Available: ${available}`,
      }
    }

    const result = {
      ok: true,
      cardId: card.id,
      card: { id: card.id, title: card.title, task_number: card.task_number },
      from: {
        board: { id: sourceBoard.id, name: sourceBoard.name },
        column: sourceColumn
          ? { id: sourceColumn.id, title: sourceColumn.title }
          : null,
      },
      to: {
        board: { id: targetBoard.id, name: targetBoard.name },
        column: { id: targetColumn.id, title: targetColumn.title },
      },
    }

    // No-op detection: card already in target column on target board
    if (card.column_id === targetColumn.id && card.board_id === targetBoard.id) {
      return { ...result, noop: true }
    }

    await store.updateCard(card.id, { column_id: targetColumn.id, board_id: targetBoard.id })
    return result
  }

  if (action === 'update_card') {
    const updates = params.updates
    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return { ok: false, error: 'update_card requires at least one field in updates' }
    }

    // Card resolution (mirrors move_card: cardId > card_title in pill scope > defensive global)
    let card = null
    let sourceBoard = null
    let scopeName = ''

    if (params.cardId) {
      const candidate = store.cards[params.cardId] || null
      if (candidate && params.boardId && candidate.board_id !== params.boardId) {
        return { ok: false, error: 'Card is not on the current board' }
      }
      if (candidate) {
        card = candidate
        sourceBoard = store.boards[card.board_id] || null
      }
    } else if (params.card_title) {
      const lowerTitle = params.card_title.toLowerCase()
      if (params.boardId) {
        sourceBoard = store.boards[params.boardId] || null
        if (!sourceBoard) return { ok: false, error: 'Board not found for the given boardId' }
        scopeName = `board "${sourceBoard.name}"`
        const matches = Object.values(store.cards).filter(
          (c) => c.board_id === sourceBoard.id && c.title.toLowerCase() === lowerTitle,
        )
        if (matches.length > 1) {
          const hints = matches
            .map((m) => `"${m.title}" in ${store.columns[m.column_id]?.title || 'unknown column'}`)
            .join(', ')
          return {
            ok: false,
            error: `Multiple cards titled "${params.card_title}" on ${scopeName} (${hints}). Be more specific.`,
          }
        }
        card = matches[0] || null
      } else {
        scopeName = 'any board'
        const matches = Object.values(store.cards).filter(
          (c) => c.title.toLowerCase() === lowerTitle,
        )
        if (matches.length > 1) {
          const hints = matches
            .map((m) => `${store.boards[m.board_id]?.name || '?'}/${store.columns[m.column_id]?.title || '?'}`)
            .join(', ')
          return {
            ok: false,
            error: `Multiple cards titled "${params.card_title}" across boards (${hints}). Be more specific.`,
          }
        }
        card = matches[0] || null
        if (card) sourceBoard = store.boards[card.board_id] || null
      }
    }

    if (!card) {
      return {
        ok: false,
        error: `Card "${params.card_title || params.cardId}" not found on ${scopeName || 'any board'}`,
      }
    }
    if (!sourceBoard) {
      return { ok: false, error: 'Source board for the card could not be resolved' }
    }

    // Build the normalized update payload. Semantics:
    //   - field present with non-null value → change → payload set, 'changed' list
    //   - field present with null value     → clear → payload set to null/[]/default, 'cleared' list
    //   - field missing entirely           → leave alone (not in payload)
    // boardStore.updateCard accepts `assignee` (renames to assignee_name) and
    // `due_date` (direct). See store/boardStore.js:592-604.
    const payload = {}
    const changed = []
    const cleared = []
    let truncated = false

    if ('title' in updates) {
      if (updates.title === null) {
        return { ok: false, error: 'Card title cannot be cleared' }
      }
      const t = (updates.title || '').trim()
      if (!t) return { ok: false, error: 'Card title cannot be empty' }
      if (t.length > TITLE_MAX) {
        return { ok: false, error: `Card title is too long (max ${TITLE_MAX} chars)` }
      }
      payload.title = capitalizeFirstLetter(t)
      changed.push('title')
    }

    if ('description' in updates) {
      if (updates.description === null) {
        payload.description = ''
        cleared.push('description')
      } else {
        const d = updates.description || ''
        if (d.length > DESCRIPTION_MAX) {
          payload.description = d.slice(0, DESCRIPTION_MAX)
          truncated = true
        } else {
          payload.description = d
        }
        changed.push('description')
      }
    }

    if ('priority' in updates) {
      if (updates.priority === null) {
        payload.priority = 'medium'
        cleared.push('priority')
      } else {
        payload.priority = updates.priority
        changed.push('priority')
      }
    }

    if ('icon' in updates) {
      if (updates.icon === null) {
        payload.icon = null
        cleared.push('icon')
      } else {
        payload.icon = normalizeIcon(updates.icon)
        changed.push('icon')
      }
    }

    if ('labels' in updates) {
      // Labels are managed via card_labels, not cards.labels — resolved after
      // store.updateCard via resolveAndSyncLabels. Still track in changed/cleared
      // for the result summary; do NOT put labels into the store payload.
      if (updates.labels === null || (Array.isArray(updates.labels) && updates.labels.length === 0)) {
        cleared.push('labels')
      } else {
        changed.push('labels')
      }
    }

    if ('checklist' in updates) {
      if (updates.checklist === null || (Array.isArray(updates.checklist) && updates.checklist.length === 0)) {
        payload.checklist = []
        cleared.push('checklist')
      } else {
        payload.checklist = updates.checklist.map((text) =>
          typeof text === 'string' ? { text, done: false } : text,
        )
        changed.push('checklist')
      }
    }

    if ('assignee' in updates) {
      if (updates.assignee === null) {
        payload.assignee = null
        cleared.push('assignee')
      } else {
        payload.assignee = updates.assignee
        changed.push('assignee')
      }
    }

    if ('due_date' in updates) {
      if (updates.due_date === null) {
        payload.due_date = null
        cleared.push('due_date')
      } else {
        payload.due_date = updates.due_date
        changed.push('due_date')
      }
    }

    if ('completed' in updates) {
      if (updates.completed === null) {
        payload.completed = false
        cleared.push('completed')
      } else {
        payload.completed = Boolean(updates.completed)
        changed.push('completed')
      }
    }

    await store.updateCard(card.id, payload)

    // Sync labels separately via card_labels table when the labels field was
    // explicitly included in updates (even if set to null/[]).
    let labelWarning
    if ('labels' in updates) {
      try {
        await resolveAndSyncLabels(card.id, sourceBoard.id, updates.labels)
      } catch (err) {
        logWarn('[toolExecutor] update_card label sync failed:', err)
        labelWarning = 'labels could not be applied'
      }
    }

    const sourceColumn = store.columns[card.column_id] || null

    return {
      ok: true,
      cardId: card.id,
      card: {
        id: card.id,
        title: payload.title || card.title,
        task_number: card.task_number,
      },
      resolved: {
        board: { id: sourceBoard.id, name: sourceBoard.name },
        column: sourceColumn ? { id: sourceColumn.id, title: sourceColumn.title } : null,
      },
      changed,
      cleared,
      ...(truncated ? { truncated: true } : {}),
      ...(labelWarning ? { warning: labelWarning } : {}),
    }
  }

  if (action === 'delete_card') {
    // Card resolution (same pattern as move_card / update_card)
    let card = null
    let sourceBoard = null
    let scopeName = ''

    if (params.cardId) {
      const candidate = store.cards[params.cardId] || null
      if (candidate && params.boardId && candidate.board_id !== params.boardId) {
        return { ok: false, error: 'Card is not on the current board' }
      }
      if (candidate) {
        card = candidate
        sourceBoard = store.boards[card.board_id] || null
      }
    } else if (params.card_title) {
      const lowerTitle = params.card_title.toLowerCase()
      if (params.boardId) {
        sourceBoard = store.boards[params.boardId] || null
        if (!sourceBoard) return { ok: false, error: 'Board not found for the given boardId' }
        scopeName = `board "${sourceBoard.name}"`
        const matches = Object.values(store.cards).filter(
          (c) => c.board_id === sourceBoard.id && c.title.toLowerCase() === lowerTitle,
        )
        if (matches.length > 1) {
          const hints = matches
            .map((m) => `"${m.title}" in ${store.columns[m.column_id]?.title || 'unknown column'}`)
            .join(', ')
          return {
            ok: false,
            error: `Multiple cards titled "${params.card_title}" on ${scopeName} (${hints}). Be more specific.`,
          }
        }
        card = matches[0] || null
      } else {
        scopeName = 'any board'
        const matches = Object.values(store.cards).filter(
          (c) => c.title.toLowerCase() === lowerTitle,
        )
        if (matches.length > 1) {
          const hints = matches
            .map((m) => `${store.boards[m.board_id]?.name || '?'}/${store.columns[m.column_id]?.title || '?'}`)
            .join(', ')
          return {
            ok: false,
            error: `Multiple cards titled "${params.card_title}" across boards (${hints}). Be more specific.`,
          }
        }
        card = matches[0] || null
        if (card) sourceBoard = store.boards[card.board_id] || null
      }
    }

    if (!card) {
      return {
        ok: false,
        error: `Card "${params.card_title || params.cardId}" not found on ${scopeName || 'any board'}`,
      }
    }
    if (!sourceBoard) {
      return { ok: false, error: 'Source board for the card could not be resolved' }
    }

    // Capture the full card snapshot BEFORE delete so the result can carry
    // it. boardStore.deleteCard already runs an undo-toast flow internally
    // (see undoableDelete in boardStore.js) — we don't have to wire one here.
    const sourceColumn = store.columns[card.column_id] || null
    const snapshot = { ...card }

    // Don't await the 5s undo window — the undo toast IS the confirmation
    // mechanism (per design decision 4). Report optimistically; if the user
    // hits undo, the model's confirmation goes stale the same way a manual
    // delete's would. The optimistic DOM update in deleteCard is
    // synchronous, so the user-visible state is already correct by the
    // time we return.
    store.deleteCard(card.id).catch((err) => logWarn('[toolExecutor] delete_card failed post-report:', err))

    return {
      ok: true,
      cardId: card.id,
      card: snapshot,
      resolved: {
        board: { id: sourceBoard.id, name: sourceBoard.name },
        column: sourceColumn ? { id: sourceColumn.id, title: sourceColumn.title } : null,
      },
      note: 'queued for deletion — the user has a 5-second undo; failures will surface to the user directly',
    }
  }

  if (action === 'create_board') {
    const columns = params.columns || ['To Do', 'In Progress', 'Done']
    const boardId = await store.addBoard(params.name, params.icon || null, columns)
    if (!boardId) {
      return { ok: false, error: 'Board creation failed — nothing was saved' }
    }
    store.setActiveBoard(boardId)
    window.dispatchEvent(new CustomEvent('kolumn:ai-navigate-board'))
    return { ok: true, boardId }
  }

  if (action === 'move_cards') {
    const board = store.boards[params.boardId] || null
    if (!board) return { ok: false, error: 'Board not found for the given boardId' }

    const toCol = findColumnByName(board.id, params.to_column)
    if (!toCol) {
      const available = Object.values(store.columns)
        .filter((c) => c.board_id === board.id)
        .sort((a, b) => a.position - b.position)
        .map((c) => c.title)
        .join(', ')
      return { ok: false, error: `Column "${params.to_column}" not found on "${board.name}". Available: ${available}` }
    }

    let cards = Object.values(store.cards).filter((c) => c.board_id === board.id)
    if (params.from_column) {
      const fromCol = findColumnByName(board.id, params.from_column)
      if (!fromCol) {
        return { ok: false, error: `Source column "${params.from_column}" not found on "${board.name}"` }
      }
      cards = cards.filter((c) => c.column_id === fromCol.id)
    }
    if (params.card_titles && params.card_titles.length > 0) {
      const lowerTitles = new Set(params.card_titles.map((t) => String(t).toLowerCase()))
      cards = cards.filter((c) => lowerTitles.has(c.title.toLowerCase()))
    }
    if (cards.length === 0) return { ok: false, error: 'No matching cards found on the current board' }

    for (const card of cards) {
      if (card.column_id !== toCol.id) {
        await store.updateCard(card.id, { column_id: toCol.id })
      }
    }
    return {
      ok: true,
      moved: cards.length,
      resolved: {
        board: { id: board.id, name: board.name },
        to_column: { id: toCol.id, title: toCol.title },
      },
    }
  }

  if (action === 'update_cards') {
    const board = store.boards[params.boardId] || null
    if (!board) return { ok: false, error: 'Board not found for the given boardId' }

    const updates = params.updates
    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return { ok: false, error: 'update_cards requires at least one field in updates' }
    }

    let cards = Object.values(store.cards).filter((c) => c.board_id === board.id)
    if (params.column) {
      const col = findColumnByName(board.id, params.column)
      if (!col) {
        return { ok: false, error: `Column "${params.column}" not found on "${board.name}"` }
      }
      cards = cards.filter((c) => c.column_id === col.id)
    }
    if (params.card_titles && params.card_titles.length > 0) {
      const lowerTitles = new Set(params.card_titles.map((t) => String(t).toLowerCase()))
      cards = cards.filter((c) => lowerTitles.has(c.title.toLowerCase()))
    }
    if (cards.length === 0) return { ok: false, error: 'No matching cards found on the current board' }

    // Build per-card update payload with the same null-clear / normalization
    // rules as update_card. Title is allowed but discouraged for batch.
    const buildPayload = () => {
      const payload = {}
      let truncated = false
      if ('title' in updates) {
        if (updates.title === null) throw new Error('Card title cannot be cleared')
        const t = (updates.title || '').trim()
        if (!t) throw new Error('Card title cannot be empty')
        if (t.length > TITLE_MAX) throw new Error(`Card title is too long (max ${TITLE_MAX} chars)`)
        payload.title = capitalizeFirstLetter(t)
      }
      if ('description' in updates) {
        if (updates.description === null) payload.description = ''
        else {
          const d = updates.description || ''
          if (d.length > DESCRIPTION_MAX) { payload.description = d.slice(0, DESCRIPTION_MAX); truncated = true }
          else payload.description = d
        }
      }
      if ('priority' in updates) payload.priority = updates.priority === null ? 'medium' : updates.priority
      if ('icon' in updates) payload.icon = updates.icon === null ? null : normalizeIcon(updates.icon)
      // Labels: managed via card_labels — NOT included in the cards table payload.
      // resolveAndSyncLabels is called per-card below after all updateCard calls.
      if ('checklist' in updates) {
        if (updates.checklist === null || (Array.isArray(updates.checklist) && updates.checklist.length === 0)) {
          payload.checklist = []
        } else {
          payload.checklist = updates.checklist.map((text) => typeof text === 'string' ? { text, done: false } : text)
        }
      }
      if ('assignee' in updates) payload.assignee = updates.assignee === null ? null : updates.assignee
      if ('due_date' in updates) payload.due_date = updates.due_date === null ? null : updates.due_date
      if ('completed' in updates) payload.completed = updates.completed === null ? false : Boolean(updates.completed)
      return { payload, truncated }
    }

    let payloadResult
    try { payloadResult = buildPayload() }
    catch (err) { return { ok: false, error: (err && err.message) || 'Invalid updates' } }

    for (const card of cards) {
      await store.updateCard(card.id, payloadResult.payload)
    }
    // Sync labels for every matched card when labels was explicitly in updates.
    let labelFailures = 0
    if ('labels' in updates) {
      for (const card of cards) {
        try {
          await resolveAndSyncLabels(card.id, board.id, updates.labels)
        } catch (err) {
          logWarn('[toolExecutor] update_cards label sync failed for card', card.id, err)
          labelFailures++
        }
      }
    }
    return {
      ok: true,
      updated: cards.length,
      resolved: { board: { id: board.id, name: board.name } },
      ...(payloadResult.truncated ? { truncated: true } : {}),
      ...(labelFailures > 0 ? { warning: `labels failed for ${labelFailures} card(s)` } : {}),
    }
  }

  if (action === 'complete_cards') {
    const board = store.boards[params.boardId] || null
    if (!board) return { ok: false, error: 'Board not found for the given boardId' }

    let cards = Object.values(store.cards).filter((c) => c.board_id === board.id)
    if (params.column) {
      const col = findColumnByName(board.id, params.column)
      if (!col) {
        return { ok: false, error: `Column "${params.column}" not found on "${board.name}"` }
      }
      cards = cards.filter((c) => c.column_id === col.id)
    }
    if (params.card_titles && params.card_titles.length > 0) {
      const lowerTitles = new Set(params.card_titles.map((t) => String(t).toLowerCase()))
      cards = cards.filter((c) => lowerTitles.has(c.title.toLowerCase()))
    }
    if (cards.length === 0) return { ok: false, error: 'No matching cards found on the current board' }

    // Decoupled from column position: completion is a flag only. Cards stay
    // in their current column. The user's column placement is their
    // organizational choice; the AI shouldn't override it.
    const targetState = !params.uncomplete
    for (const card of cards) {
      if (card.completed !== targetState) {
        await store.updateCard(card.id, { completed: targetState })
      }
    }
    return {
      ok: true,
      completed: targetState ? cards.length : 0,
      uncompleted: targetState ? 0 : cards.length,
      resolved: { board: { id: board.id, name: board.name } },
    }
  }

  if (action === 'duplicate_card') {
    // Card resolution (same pattern as move/update/delete)
    let card = null
    let sourceBoard = null
    let scopeName = ''

    if (params.cardId) {
      const candidate = store.cards[params.cardId] || null
      if (candidate && params.boardId && candidate.board_id !== params.boardId) {
        return { ok: false, error: 'Card is not on the current board' }
      }
      if (candidate) {
        card = candidate
        sourceBoard = store.boards[card.board_id] || null
      }
    } else if (params.card_title) {
      const lowerTitle = params.card_title.toLowerCase()
      if (params.boardId) {
        sourceBoard = store.boards[params.boardId] || null
        if (!sourceBoard) return { ok: false, error: 'Board not found for the given boardId' }
        scopeName = `board "${sourceBoard.name}"`
        const matches = Object.values(store.cards).filter(
          (c) => c.board_id === sourceBoard.id && c.title.toLowerCase() === lowerTitle,
        )
        if (matches.length > 1) {
          const hints = matches
            .map((m) => `"${m.title}" in ${store.columns[m.column_id]?.title || 'unknown column'}`)
            .join(', ')
          return {
            ok: false,
            error: `Multiple cards titled "${params.card_title}" on ${scopeName} (${hints}). Be more specific.`,
          }
        }
        card = matches[0] || null
      } else {
        scopeName = 'any board'
        const matches = Object.values(store.cards).filter(
          (c) => c.title.toLowerCase() === lowerTitle,
        )
        if (matches.length > 1) {
          const hints = matches
            .map((m) => `${store.boards[m.board_id]?.name || '?'}/${store.columns[m.column_id]?.title || '?'}`)
            .join(', ')
          return {
            ok: false,
            error: `Multiple cards titled "${params.card_title}" across boards (${hints}). Be more specific.`,
          }
        }
        card = matches[0] || null
        if (card) sourceBoard = store.boards[card.board_id] || null
      }
    }

    if (!card) {
      return {
        ok: false,
        error: `Card "${params.card_title || params.cardId}" not found on ${scopeName || 'any board'}`,
      }
    }
    if (!sourceBoard) {
      return { ok: false, error: 'Source board for the card could not be resolved' }
    }

    // to_column resolution (optional — scoped to source board)
    let targetColumn = store.columns[card.column_id] || null
    if (params.to_column) {
      const found = findColumnByName(sourceBoard.id, params.to_column)
      if (!found) {
        const available = Object.values(store.columns)
          .filter((c) => c.board_id === sourceBoard.id)
          .sort((a, b) => a.position - b.position)
          .map((c) => c.title)
          .join(', ')
        return {
          ok: false,
          error: `Column "${params.to_column}" not found on "${sourceBoard.name}". Available: ${available}`,
        }
      }
      targetColumn = found
    }

    // Snapshot source card's label IDs before duplicating, so we can copy
    // them to the new card once the real ID is available.
    const sourceLabelIds = [...(useBoardStore.getState().cardLabels[card.id] || [])]

    // store.duplicateCard handles smart-increment title + assignees copy
    const newTempId = await store.duplicateCard(card.id)
    if (!newTempId) return { ok: false, error: 'Failed to duplicate card' }

    // Resolve temp ID → real ID (mirrors the create_card pattern)
    let newId = newTempId
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 200))
      const realId = useBoardStore.getState()._tempIdMap[newTempId]
      if (realId) { newId = realId; break }
    }

    // If the user picked a different target column, move the new card there.
    // Same-column duplicate is the default and skips this update.
    if (targetColumn && targetColumn.id !== card.column_id) {
      await store.updateCard(newId, { column_id: targetColumn.id })
    }

    // Labels: if params.labels was explicitly passed, resolve those; otherwise
    // copy the source card's existing label IDs directly.
    let labelWarning
    if (newId !== newTempId) {
      try {
        if (params.labels !== undefined) {
          // Caller provided an explicit label override — resolve via text
          await resolveAndSyncLabels(newId, sourceBoard.id, params.labels)
        } else if (sourceLabelIds.length > 0) {
          // Default: inherit source card's labels verbatim (no text resolution needed)
          await supabase
            .from('card_labels')
            .insert(sourceLabelIds.map((label_id) => ({ card_id: newId, label_id })))
        }
      } catch (err) {
        logWarn('[toolExecutor] duplicate_card label sync failed:', err)
        labelWarning = 'labels could not be applied'
      }
    } else if (params.labels !== undefined || sourceLabelIds.length > 0) {
      labelWarning = 'card still syncing — labels were skipped'
    }

    const newCard = useBoardStore.getState().cards[newId] || null

    return {
      ok: true,
      cardId: newId,
      card: newCard ? {
        id: newCard.id,
        title: newCard.title,
        task_number: newCard.task_number,
      } : { id: newId },
      source: { cardId: card.id, title: card.title },
      resolved: {
        board: { id: sourceBoard.id, name: sourceBoard.name },
        column: targetColumn ? { id: targetColumn.id, title: targetColumn.title } : null,
      },
      ...(labelWarning ? { warning: labelWarning } : {}),
    }
  }

  if (action === 'toggle_checklist') {
    // Resolve card via cardId (scope-checked) → card_title scoped to pill board
    let card = null
    let sourceBoard = null
    if (params.cardId) {
      const candidate = store.cards[params.cardId] || null
      if (candidate && params.boardId && candidate.board_id !== params.boardId) {
        return { ok: false, error: 'Card is not on the current board' }
      }
      if (candidate) { card = candidate; sourceBoard = store.boards[card.board_id] || null }
    } else if (params.card_title) {
      const lowerTitle = String(params.card_title).toLowerCase()
      if (params.boardId) {
        sourceBoard = store.boards[params.boardId] || null
        if (!sourceBoard) return { ok: false, error: 'Board not found for the given boardId' }
        const matches = Object.values(store.cards).filter(
          (c) => c.board_id === sourceBoard.id && c.title.toLowerCase() === lowerTitle,
        )
        if (matches.length > 1) {
          const hints = matches.map((m) => `"${m.title}" in ${store.columns[m.column_id]?.title || '?'}`).join(', ')
          return { ok: false, error: `Multiple cards titled "${params.card_title}" on board "${sourceBoard.name}" (${hints}). Be more specific.` }
        }
        card = matches[0] || null
      }
    }
    if (!card) return { ok: false, error: `Card "${params.card_title || params.cardId}" not found on current board` }
    if (!card.checklist || card.checklist.length === 0) {
      return { ok: false, error: `Card "${card.title}" has no checklist` }
    }

    const validIndices = []
    const skipped = []
    for (const idx of params.items || []) {
      if (typeof idx === 'number' && idx >= 0 && idx < card.checklist.length) {
        validIndices.push(idx)
      } else {
        skipped.push(idx)
      }
    }

    const updated = card.checklist.map((item, i) =>
      validIndices.includes(i) ? { ...item, done: !!params.done } : item
    )
    await store.updateCard(card.id, { checklist: updated })

    return {
      ok: true,
      cardId: card.id,
      toggled: validIndices,
      ...(skipped.length > 0 ? { skipped } : {}),
    }
  }

  if (action === 'update_board') {
    const board = store.boards[params.boardId] || null
    if (!board) return { ok: false, error: 'Board not found for the given boardId' }
    if (!params.name && !params.icon) {
      return { ok: false, error: 'update_board requires at least one of name or icon' }
    }

    const changed = []
    if (params.name) {
      const newName = String(params.name).trim()
      if (!newName) return { ok: false, error: 'Board name cannot be empty' }
      await store.renameBoard(board.id, newName)
      changed.push('name')
    }
    if (params.icon) {
      const normalizedIcon = normalizeIcon(params.icon)
      if (normalizedIcon) {
        await store.updateBoardIcon(board.id, normalizedIcon)
        changed.push('icon')
      }
    }
    return {
      ok: true,
      board: { id: board.id, name: params.name || board.name },
      changed,
    }
  }

  if (action === 'delete_board') {
    const board = store.boards[params.boardId] || null
    if (!board) return { ok: false, error: 'Board not found for the given boardId' }

    const snapshot = { id: board.id, name: board.name, icon: board.icon }
    // Don't await the 5s undo window — the undo toast IS the confirmation
    // mechanism (per design decision 4). See delete_card above for the
    // full rationale.
    store.deleteBoard(board.id).catch((err) => logWarn('[toolExecutor] delete_board failed post-report:', err))
    return { ok: true, board: snapshot, note: 'queued for deletion — the user has a 5-second undo; failures will surface to the user directly' }
  }

  if (action === 'add_column') {
    const board = store.boards[params.boardId] || null
    if (!board) return { ok: false, error: 'Board not found for the given boardId' }

    const title = String(params.title || '').trim()
    if (!title) return { ok: false, error: 'Column title is required' }

    await store.addColumn(board.id, title)
    return {
      ok: true,
      column: { title },
      resolved: { board: { id: board.id, name: board.name } },
    }
  }

  if (action === 'delete_column') {
    const board = store.boards[params.boardId] || null
    if (!board) return { ok: false, error: 'Board not found for the given boardId' }

    // colId direct lookup preferred; else column-name match scoped to board
    let column = null
    if (params.colId) {
      const candidate = store.columns[params.colId] || null
      if (candidate && candidate.board_id !== board.id) {
        return { ok: false, error: 'Column is not on the current board' }
      }
      column = candidate
    } else if (params.column) {
      column = findColumnByName(board.id, params.column)
    }
    if (!column) {
      const available = Object.values(store.columns)
        .filter((c) => c.board_id === board.id)
        .sort((a, b) => a.position - b.position)
        .map((c) => c.title)
        .join(', ')
      return {
        ok: false,
        error: `Column "${params.column || params.colId}" not found on "${board.name}". Available: ${available}`,
      }
    }

    const snapshot = { id: column.id, title: column.title }
    // Don't await the 5s undo window — the undo toast IS the confirmation
    // mechanism (per design decision 4). See delete_card above for the
    // full rationale.
    store.deleteColumn(board.id, column.id).catch((err) => logWarn('[toolExecutor] delete_column failed post-report:', err))
    return {
      ok: true,
      column: snapshot,
      resolved: { board: { id: board.id, name: board.name } },
      note: 'queued for deletion — the user has a 5-second undo; failures will surface to the user directly',
    }
  }

  if (action === 'invite_member') {
    // Workspace inferred from the pill's board → board.workspace_id.
    const board = store.boards[params.boardId] || null
    if (!board) return { ok: false, error: 'Board not found for the given boardId' }
    const workspaceId = board.workspace_id
    if (!workspaceId) {
      return { ok: false, error: `Board "${board.name}" is not in a workspace — member tools only work on workspace-scoped boards.` }
    }
    const workspace = useWorkspacesStore.getState().workspaces?.[workspaceId]
    if (!workspace) return { ok: false, error: 'Workspace not found' }

    const email = String(params.email || '').trim()
    if (!email) return { ok: false, error: 'Email is required to invite a member' }

    await useWorkspacesStore.getState().inviteToWorkspace(workspace.id, email)
    return {
      ok: true,
      email,
      resolved: { workspace: { id: workspace.id, name: workspace.name } },
    }
  }

  if (action === 'remove_member') {
    const board = store.boards[params.boardId] || null
    if (!board) return { ok: false, error: 'Board not found for the given boardId' }
    const workspaceId = board.workspace_id
    if (!workspaceId) {
      return { ok: false, error: `Board "${board.name}" is not in a workspace — member tools only work on workspace-scoped boards.` }
    }
    const workspace = useWorkspacesStore.getState().workspaces?.[workspaceId]
    if (!workspace) return { ok: false, error: 'Workspace not found' }

    const wsStore = useWorkspacesStore.getState()
    if (!wsStore.members[workspace.id]) {
      await wsStore.fetchMembers(workspace.id)
    }

    const members = useWorkspacesStore.getState().members[workspace.id] || []
    const lower = String(params.display_name || '').toLowerCase()
    const member = members.find((m) => m.display_name.toLowerCase() === lower)
    if (!member) {
      return { ok: false, error: `Member "${params.display_name}" not found in workspace "${workspace.name}"` }
    }

    await useWorkspacesStore.getState().removeMember(workspace.id, member.user_id)
    return {
      ok: true,
      member: { display_name: member.display_name, user_id: member.user_id },
      resolved: { workspace: { id: workspace.id, name: workspace.name } },
    }
  }

  if (action === 'search_cards' || action === 'summarize_board') {
    return { ok: true, readOnly: true }
  }

  return { ok: false, error: `Unknown tool: ${action}` }
}
