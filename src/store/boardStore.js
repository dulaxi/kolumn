import { create } from 'zustand'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { showToast } from '../utils/toast'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'
import { useNotificationStore } from './notificationStore'
import { addRecurrenceInterval } from '../utils/dateUtils'
import { createRateLimiter, sanitizeText, sanitizeTitle, sanitizeDescription } from '../utils/rateLimit'
import { logError } from '../utils/logger'
import { cardInsertSchema, cardUpdateSchema, boardInsertSchema, columnInsertSchema, commentInsertSchema } from '../utils/schemas'

const ACTIVE_BOARD_KEY = 'kolumn_active_board'

// Rate limiters for mutation actions
const cardCreateLimiter = createRateLimiter(10, 10000)   // 10 cards per 10s
const boardCreateLimiter = createRateLimiter(5, 30000)   // 5 boards per 30s
const columnCreateLimiter = createRateLimiter(10, 10000) // 10 columns per 10s
const commentLimiter = createRateLimiter(10, 10000)      // 10 comments per 10s
const uploadLimiter = createRateLimiter(5, 30000)        // 5 uploads per 30s

// Undo-able delete: removes from UI, shows a toast with an Undo button,
// waits 5s, then commits the DB delete unless the user clicks Undo.
function undoableDelete(message) {
  return new Promise((resolve) => {
    let settled = false
    const id = String(Date.now())

    showToast.delete(message, { duration: 5000, id })

    // Inject an Undo button into the toast after it renders using safe DOM methods
    setTimeout(() => {
      const containers = document.querySelectorAll('[role="status"]')
      containers.forEach((c) => {
        if (c.textContent.includes(message) && !c.querySelector(`[data-undo-id]`)) {
          const btn = document.createElement('button')
          btn.setAttribute('data-undo-id', id)
          btn.style.cssText = 'color:#FAF8F6;background:none;border:none;cursor:pointer;margin-left:auto;display:flex;align-items:center;opacity:0.8'
          btn.onmouseenter = () => { btn.style.opacity = 1 }
          btn.onmouseleave = () => { btn.style.opacity = 0.8 }
          const ico = document.createElement('i')
          ico.className = 'ph ph-arrow-counter-clockwise'
          ico.style.cssText = 'font-size:18px;line-height:18px'
          btn.appendChild(ico)
          c.style.display = 'flex'
          c.style.alignItems = 'center'
          c.style.gap = '4px'
          c.appendChild(btn)
        }
      })
    }, 50)

    // Listen for undo click (dispatched from UndoListener in App.jsx)
    const handler = () => {
      if (settled) return
      settled = true
      toast.dismiss(id)
      resolve(false)
    }
    window.addEventListener(`kolumn:undo:${id}`, handler, { once: true })

    setTimeout(() => {
      window.removeEventListener(`kolumn:undo:${id}`, handler)
      if (!settled) { settled = true; resolve(true) }
    }, 5000)
  })
}

// Fire-and-forget activity logger — never blocks the calling action.
async function logActivity(cardId, action, detail) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const profile = useAuthStore.getState().profile
    const actorName = profile?.display_name || user.email || 'Unknown'
    await supabase.from('card_activity').insert({
      card_id: cardId,
      user_id: user.id,
      actor_name: actorName,
      action,
      detail,
    })
  } catch (err) {
    // Activity logging should never break the main flow
    logError('logActivity failed:', err)
  }
}

export const useBoardStore = create((set, get) => ({
  boards: {},
  columns: {},
  cards: {},
  activeBoardId: null,
  loading: true,
  error: null,
  subscriptions: [],
  _isDragging: false,
  comments: {},
  activity: {},
  attachments: {},

  clearError: () => set({ error: null }),

  // ============================================================
  // FETCH (load all boards the user has access to)
  // ============================================================
  fetchBoards: async () => {
    // Only show loading spinner on first fetch — refetches update silently
    if (Object.keys(get().boards).length === 0) set({ loading: true })

    try {
      const [boardsRes, columnsRes, cardsRes] = await Promise.all([
        supabase.from('boards').select('*').order('created_at'),
        supabase.from('columns').select('*').order('position'),
        supabase.from('cards').select('*').order('position'),
      ])

      if (boardsRes.error) logError('Failed to fetch boards:', boardsRes.error)
      if (columnsRes.error) logError('Failed to fetch columns:', columnsRes.error)
      if (cardsRes.error) logError('Failed to fetch cards:', cardsRes.error)

      // Surface first error to UI but continue with whatever data we got
      const fetchError = boardsRes.error || columnsRes.error || cardsRes.error

      const boardMap = {}
      ;(boardsRes.data || []).forEach((b) => { boardMap[b.id] = b })

      const columnMap = {}
      ;(columnsRes.data || []).forEach((c) => { columnMap[c.id] = c })

      const cardMap = {}
      ;(cardsRes.data || []).forEach((c) => { cardMap[c.id] = c })

      const firstBoardId = boardsRes.data?.length ? boardsRes.data[0].id : null
      const current = get().activeBoardId
      const saved = localStorage.getItem(ACTIVE_BOARD_KEY)
      const restoredId = current && boardMap[current] ? current
        : saved && (saved === '__all__' || boardMap[saved]) ? saved
        : firstBoardId

      set({
        boards: boardMap,
        columns: columnMap,
        cards: cardMap,
        activeBoardId: restoredId,
        loading: false,
        error: fetchError ? { message: fetchError.message, action: 'fetchBoards' } : null,
      })
    } catch (err) {
      logError('fetchBoards failed:', err)
      if (!navigator.onLine) {
        showToast.warn('You\'re offline — showing cached data')
      } else {
        showToast.error('Failed to load boards — check your connection')
      }
      set({ loading: false, error: { message: err.message || 'Network error', action: 'fetchBoards' } })
    }
  },

  // ============================================================
  // BOARD ACTIONS
  // ============================================================
  setActiveBoard: (boardId) => {
    localStorage.setItem(ACTIVE_BOARD_KEY, boardId)
    set({ activeBoardId: boardId })
    // Re-subscribe with the new board filter so realtime is scoped correctly
    if (get().subscriptions.length > 0) {
      get().subscribeToBoards()
    }
  },

  addBoard: async (name, icon, customColumns) => {
    if (!boardCreateLimiter()) { showToast.warn('Too many boards created — slow down'); return null }
    const sanitizedName = sanitizeTitle(name) || 'Untitled Board'

    // Read user from auth store instead of making a network call
    const user = useAuthStore.getState().user
    if (!user) return null

    const boardId = crypto.randomUUID()

    const validated = boardInsertSchema.safeParse({ id: boardId, name: sanitizedName, icon: icon || null, owner_id: user.id })
    if (!validated.success) {
      logError('Board validation failed:', validated.error.flatten())
      showToast.error('Invalid board data')
      return null
    }

    // Step 1: Insert board (trigger auto-adds owner to board_members)
    const { error } = await supabase
      .from('boards')
      .insert(validated.data)

    if (error) return null

    // Step 2: Fetch board back + insert columns in parallel
    // (board fetch needed because RLS SELECT depends on board_members trigger)
    const defaultColumns = customColumns || ['To Do', 'In Progress', 'Review', 'Done']
    const colInserts = defaultColumns.map((title, i) => ({
      board_id: boardId,
      title,
      position: i,
    }))

    const [boardRes, colsRes] = await Promise.all([
      supabase.from('boards').select().eq('id', boardId).single(),
      supabase.from('columns').insert(colInserts).select(),
    ])

    const board = boardRes.data
    const cols = colsRes.data
    if (!board) return null

    localStorage.setItem(ACTIVE_BOARD_KEY, board.id)
    set((state) => {
      const columnMap = { ...state.columns }
      ;(cols || []).forEach((c) => { columnMap[c.id] = c })
      return {
        boards: { ...state.boards, [board.id]: board },
        columns: columnMap,
        activeBoardId: board.id,
      }
    })

    showToast.success(`Board "${name}" created`)
    return board.id
  },

  updateBoardIcon: async (boardId, icon) => {
    const prevBoard = get().boards[boardId]
    set((state) => ({
      boards: { ...state.boards, [boardId]: { ...state.boards[boardId], icon } },
    }))
    const { error } = await supabase.from('boards').update({ icon }).eq('id', boardId)
    if (error) {
      logError('Failed to update board icon:', error)
      if (prevBoard) set((state) => ({ boards: { ...state.boards, [boardId]: prevBoard } }))
    }
  },

  renameBoard: async (boardId, name) => {
    const prevBoard = get().boards[boardId]
    set((state) => ({
      boards: { ...state.boards, [boardId]: { ...state.boards[boardId], name } },
    }))
    const { error } = await supabase.from('boards').update({ name }).eq('id', boardId)
    if (error) {
      logError('Failed to rename board:', error)
      if (prevBoard) set((state) => ({ boards: { ...state.boards, [boardId]: prevBoard } }))
      showToast.error('Failed to rename board')
    }
  },

  deleteBoard: async (boardId) => {
    const state = get()
    const prevBoard = state.boards[boardId]
    const prevColumns = Object.values(state.columns).filter((c) => c.board_id === boardId)
    const prevCards = Object.values(state.cards).filter((c) => c.board_id === boardId)
    const prevActiveId = state.activeBoardId

    // Optimistic remove from UI
    set((s) => {
      const { [boardId]: _, ...restBoards } = s.boards
      const columns = {}
      const cards = {}
      Object.values(s.columns).forEach((c) => { if (c.board_id !== boardId) columns[c.id] = c })
      Object.values(s.cards).forEach((c) => { if (c.board_id !== boardId) cards[c.id] = c })
      const remainingIds = Object.keys(restBoards)
      const newActiveId = s.activeBoardId === boardId ? remainingIds[0] || null : s.activeBoardId
      localStorage.setItem(ACTIVE_BOARD_KEY, newActiveId || '')
      return { boards: restBoards, columns, cards, activeBoardId: newActiveId }
    })

    const shouldDelete = await undoableDelete('Board deleted — undo?')

    if (shouldDelete) {
      await supabase.from('boards').delete().eq('id', boardId)
    } else {
      set((s) => {
        const columns = { ...s.columns }
        const cards = { ...s.cards }
        prevColumns.forEach((c) => { columns[c.id] = c })
        prevCards.forEach((c) => { cards[c.id] = c })
        return { boards: { ...s.boards, [boardId]: prevBoard }, columns, cards, activeBoardId: prevActiveId }
      })
      localStorage.setItem(ACTIVE_BOARD_KEY, prevActiveId || '')
      showToast.restore('Board restored')
    }
  },

  // ============================================================
  // COLUMN ACTIONS
  // ============================================================
  addColumn: async (boardId, title) => {
    if (!columnCreateLimiter()) { showToast.warn('Too many columns — slow down'); return }
    const sanitizedCol = sanitizeTitle(title) || 'Untitled'
    const boardColumns = Object.values(get().columns)
      .filter((c) => c.board_id === boardId)
    const position = boardColumns.length

    const validated = columnInsertSchema.safeParse({ board_id: boardId, title: sanitizedCol, position })
    if (!validated.success) {
      logError('Column validation failed:', validated.error.flatten())
      showToast.error('Invalid section data')
      return
    }

    const { data: col, error } = await supabase
      .from('columns')
      .insert(validated.data)
      .select()
      .single()

    if (error) {
      logError('Failed to add column:', error)
      showToast.error('Failed to add section')
      return
    }

    if (col) {
      set((state) => ({
        columns: { ...state.columns, [col.id]: col },
      }))
    }
  },

  renameColumn: async (boardId, columnId, title) => {
    const prevColumn = get().columns[columnId]
    set((state) => ({
      columns: { ...state.columns, [columnId]: { ...state.columns[columnId], title } },
    }))
    const { error } = await supabase.from('columns').update({ title }).eq('id', columnId)
    if (error) {
      logError('Failed to rename column:', error)
      if (prevColumn) set((state) => ({ columns: { ...state.columns, [columnId]: prevColumn } }))
      showToast.error('Failed to rename section')
    }
  },

  updateColumnWipLimit: async (columnId, wipLimit) => {
    const prevColumn = get().columns[columnId]
    const value = wipLimit || null
    set((state) => ({
      columns: { ...state.columns, [columnId]: { ...state.columns[columnId], wip_limit: value } },
    }))
    const { error } = await supabase.from('columns').update({ wip_limit: value }).eq('id', columnId)
    if (error) {
      logError('Failed to update WIP limit:', error)
      if (prevColumn) set((state) => ({ columns: { ...state.columns, [columnId]: prevColumn } }))
    }
  },

  deleteColumn: async (boardId, columnId) => {
    const state = get()
    const prevColumn = state.columns[columnId]
    const prevCards = Object.values(state.cards).filter((c) => c.column_id === columnId)

    // Optimistic remove
    set((s) => {
      const { [columnId]: _, ...restColumns } = s.columns
      const cards = {}
      Object.values(s.cards).forEach((c) => { if (c.column_id !== columnId) cards[c.id] = c })
      return { columns: restColumns, cards }
    })

    const shouldDelete = await undoableDelete('Section deleted — undo?')

    if (shouldDelete) {
      await supabase.from('columns').delete().eq('id', columnId)
    } else {
      set((s) => {
        const cards = { ...s.cards }
        prevCards.forEach((c) => { cards[c.id] = c })
        return { columns: { ...s.columns, [columnId]: prevColumn }, cards }
      })
      showToast.restore('Section restored')
    }
  },

  // ============================================================
  // CARD ACTIONS
  // ============================================================
  addCard: async (boardId, columnId, cardData) => {
    if (!cardCreateLimiter()) { showToast.warn('Too many tasks created — slow down'); return null }
    const state = get()
    const board = state.boards[boardId]
    if (!board) {
      logError('addCard: board not found', boardId)
      return null
    }

    // Calculate positions
    const columnCards = Object.values(state.cards)
      .filter((c) => c.column_id === columnId)
    const position = columnCards.length

    const allCards = Object.values(state.cards)
    const globalNumber = allCards.reduce((max, c) => Math.max(max, c.global_task_number || 0), 0) + 1
    const taskNumber = board.next_task_number || 1

    const rawInsert = {
      board_id: boardId,
      column_id: columnId,
      position,
      task_number: taskNumber,
      global_task_number: globalNumber,
      title: sanitizeTitle(cardData.title) || 'Untitled task',
      description: sanitizeDescription(cardData.description),
      assignee_name: sanitizeTitle(cardData.assignee),
      labels: cardData.labels || [],
      due_date: cardData.dueDate || null,
      priority: cardData.priority || 'medium',
      icon: cardData.icon || null,
      completed: cardData.completed || false,
      checklist: cardData.checklist || [],
    }

    const validated = cardInsertSchema.safeParse(rawInsert)
    if (!validated.success) {
      logError('Card validation failed:', validated.error.flatten())
      showToast.error('Invalid task data')
      return null
    }
    const cardInsert = validated.data

    try {
      // Run card insert and task number increment in parallel (independent operations)
      const [cardRes, numRes] = await Promise.all([
        supabase.from('cards').insert(cardInsert).select().single(),
        supabase.from('boards').update({ next_task_number: taskNumber + 1 }).eq('id', boardId),
      ])

      if (numRes.error) {
        logError('Failed to increment task number:', numRes.error)
      }

      if (cardRes.error || !cardRes.data) {
        logError('Failed to create card:', cardRes.error)
        showToast.error('Failed to create task')
        return null
      }

      const card = cardRes.data
      set((state) => ({
        cards: { ...state.cards, [card.id]: card },
        boards: {
          ...state.boards,
          [boardId]: { ...state.boards[boardId], next_task_number: taskNumber + 1 },
        },
      }))

      logActivity(card.id, 'created', null)
      return card.id
    } catch (err) {
      logError('addCard failed:', err)
      showToast.error('Failed to create task')
      return null
    }
  },

  updateCard: async (cardId, updates) => {
    // Map frontend field names to DB column names
    const dbUpdates = {}
    if ('title' in updates) dbUpdates.title = sanitizeTitle(updates.title) || 'Untitled task'
    if ('description' in updates) dbUpdates.description = sanitizeDescription(updates.description)
    if ('assignee' in updates) dbUpdates.assignee_name = sanitizeTitle(updates.assignee)
    if ('assignee_name' in updates) dbUpdates.assignee_name = sanitizeTitle(updates.assignee_name)
    if ('priority' in updates) dbUpdates.priority = updates.priority
    if ('dueDate' in updates) dbUpdates.due_date = updates.dueDate
    if ('due_date' in updates) dbUpdates.due_date = updates.due_date
    if ('labels' in updates) dbUpdates.labels = updates.labels
    if ('checklist' in updates) dbUpdates.checklist = updates.checklist
    if ('icon' in updates) dbUpdates.icon = updates.icon
    if ('completed' in updates) dbUpdates.completed = updates.completed
    if ('column_id' in updates) dbUpdates.column_id = updates.column_id
    if ('position' in updates) dbUpdates.position = updates.position
    if ('recurrence_interval' in updates) dbUpdates.recurrence_interval = updates.recurrence_interval
    if ('recurrence_unit' in updates) dbUpdates.recurrence_unit = updates.recurrence_unit
    if ('recurrence_next_due' in updates) dbUpdates.recurrence_next_due = updates.recurrence_next_due

    // Optimistic update
    const prevCard = get().cards[cardId]
    set((state) => ({
      cards: {
        ...state.cards,
        [cardId]: { ...state.cards[cardId], ...dbUpdates, updated_at: new Date().toISOString() },
      },
    }))

    const { error } = await supabase.from('cards').update(dbUpdates).eq('id', cardId)
    if (error) {
      logError('Failed to update card:', error)
      // Rollback optimistic update
      if (prevCard) {
        set((state) => ({
          cards: { ...state.cards, [cardId]: prevCard },
        }))
      }
    } else if (prevCard) {
      // Log meaningful field changes (skip position-only updates)
      if ('priority' in dbUpdates && dbUpdates.priority !== prevCard.priority) {
        logActivity(cardId, 'updated_priority', `${prevCard.priority} → ${dbUpdates.priority}`)
      }
      if ('assignee_name' in dbUpdates && dbUpdates.assignee_name !== prevCard.assignee_name) {
        const from = prevCard.assignee_name || 'unassigned'
        const to = dbUpdates.assignee_name || 'unassigned'
        logActivity(cardId, 'updated_assignee', `${from} → ${to}`)

        // Notify the newly assigned user
        if (dbUpdates.assignee_name) {
          const { data: assigneeProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('display_name', dbUpdates.assignee_name)
            .single()
          if (assigneeProfile) {
            const actorProfile = useAuthStore.getState().profile
            useNotificationStore.getState().notify({
              userId: assigneeProfile.id,
              type: 'assignment',
              title: 'assigned you a task',
              body: dbUpdates.title || prevCard.title,
              cardId,
              boardId: prevCard.board_id,
              actorName: actorProfile?.display_name || 'Someone',
            })
          }
        }
      }
      if ('due_date' in dbUpdates && dbUpdates.due_date !== prevCard.due_date) {
        logActivity(cardId, 'updated_due_date', dbUpdates.due_date ? dbUpdates.due_date.split('T')[0] : 'removed')
      }
      if ('title' in dbUpdates && dbUpdates.title !== prevCard.title) {
        logActivity(cardId, 'renamed', `${prevCard.title} → ${dbUpdates.title}`)
      }
    }
  },

  _completingCards: new Set(),
  completeCard: async (cardId) => {
    // Prevent rapid double-clicks from toggling multiple times
    if (get()._completingCards.has(cardId)) return
    get()._completingCards.add(cardId)

    const card = get().cards[cardId]
    if (!card) { get()._completingCards.delete(cardId); return }

    const newCompleted = !card.completed

    set((state) => ({
      cards: {
        ...state.cards,
        [cardId]: { ...state.cards[cardId], completed: newCompleted, updated_at: new Date().toISOString() },
      },
    }))

    const { error } = await supabase.from('cards').update({ completed: newCompleted }).eq('id', cardId)
    get()._completingCards.delete(cardId)
    if (error) {
      logError('Failed to toggle card completion:', error)
      set((state) => ({
        cards: { ...state.cards, [cardId]: card },
      }))
      return
    }
    logActivity(cardId, newCompleted ? 'completed' : 'reopened', null)
  },

  deleteCard: async (cardId) => {
    const prevCard = get().cards[cardId]
    if (!prevCard) return

    // Optimistic remove from UI
    set((state) => {
      const { [cardId]: _, ...restCards } = state.cards
      return { cards: restCards }
    })

    const shouldDelete = await undoableDelete('Task deleted — undo?')

    if (shouldDelete) {
      // Clean up storage files BEFORE cascade deletes card_attachments rows
      const { data: attachments } = await supabase
        .from('card_attachments')
        .select('storage_path')
        .eq('card_id', cardId)
      if (attachments?.length) {
        const paths = attachments.map((a) => a.storage_path)
        supabase.storage.from('attachments').remove(paths).catch(() => {})
      }

      const { error } = await supabase.from('cards').delete().eq('id', cardId)
      if (error) {
        set((state) => ({ cards: { ...state.cards, [cardId]: prevCard } }))
        showToast.error('Failed to delete task')
      }
    } else {
      set((state) => ({ cards: { ...state.cards, [cardId]: prevCard } }))
      showToast.restore('Task restored')
    }
  },

  archiveCard: async (cardId) => {
    const card = get().cards[cardId]
    if (!card) return

    // Optimistic — mark archived
    set((state) => ({
      cards: { ...state.cards, [cardId]: { ...state.cards[cardId], archived: true } },
    }))

    const { error } = await supabase.from('cards').update({ archived: true }).eq('id', cardId)
    if (error) {
      logError('Failed to archive card:', error)
      set((state) => ({
        cards: { ...state.cards, [cardId]: { ...state.cards[cardId], archived: false } },
      }))
    } else {
      logActivity(cardId, 'archived', null)
      showToast.archive('Task archived')
    }
  },

  unarchiveCard: async (cardId) => {
    const card = get().cards[cardId]
    if (!card) return

    set((state) => ({
      cards: { ...state.cards, [cardId]: { ...state.cards[cardId], archived: false } },
    }))

    const { error } = await supabase.from('cards').update({ archived: false }).eq('id', cardId)
    if (error) {
      logError('Failed to unarchive card:', error)
      set((state) => ({
        cards: { ...state.cards, [cardId]: { ...state.cards[cardId], archived: true } },
      }))
    } else {
      logActivity(cardId, 'unarchived', null)
      showToast.restore('Task restored from archive')
    }
  },

  moveCard: async (boardId, fromColumnId, toColumnId, fromIndex, toIndex) => {
    const state = get()

    // Get cards sorted by position for each column
    const fromCards = Object.values(state.cards)
      .filter((c) => c.column_id === fromColumnId)
      .sort((a, b) => a.position - b.position)

    const movedCard = fromCards[fromIndex]
    if (!movedCard) return

    if (fromColumnId === toColumnId) {
      // Reorder within same column
      const cards = [...fromCards]
      cards.splice(fromIndex, 1)
      cards.splice(toIndex, 0, movedCard)

      const updates = {}
      const dbBatch = []
      cards.forEach((card, i) => {
        if (card.position !== i) {
          updates[card.id] = { ...card, position: i }
          dbBatch.push({ id: card.id, position: i })
        }
      })

      if (Object.keys(updates).length > 0) {
        set((state) => ({
          cards: { ...state.cards, ...updates },
        }))
        // Update positions in DB (parallel to minimize race window)
        await Promise.all(dbBatch.map(({ id, position }) =>
          supabase.from('cards').update({ position }).eq('id', id)
            .then(({ error }) => { if (error) logError('Failed to update card position:', error) })
        ))
      }
    } else {
      // Move between columns
      const toCards = Object.values(state.cards)
        .filter((c) => c.column_id === toColumnId)
        .sort((a, b) => a.position - b.position)

      const newFromCards = fromCards.filter((c) => c.id !== movedCard.id)
      const newToCards = [...toCards]
      newToCards.splice(toIndex, 0, { ...movedCard, column_id: toColumnId })

      const updates = {}
      const dbBatch = []

      newFromCards.forEach((card, i) => {
        if (card.position !== i) {
          updates[card.id] = { ...card, position: i }
          dbBatch.push({ id: card.id, position: i })
        }
      })

      newToCards.forEach((card, i) => {
        const isMovedCard = card.id === movedCard.id
        updates[card.id] = { ...card, column_id: toColumnId, position: i, ...(isMovedCard ? { completed: false } : {}) }
        dbBatch.push({ id: card.id, position: i, column_id: toColumnId, ...(isMovedCard ? { completed: false } : {}) })
      })

      set((state) => ({
        cards: { ...state.cards, ...updates },
      }))

      // Update positions in DB (parallel to minimize race window)
      await Promise.all(dbBatch.map(({ id, ...rest }) =>
        supabase.from('cards').update(rest).eq('id', id)
          .then(({ error }) => { if (error) logError('Failed to update card position:', error) })
      ))

      // Log the column move
      const fromCol = state.columns[fromColumnId]
      const toCol = state.columns[toColumnId]
      logActivity(movedCard.id, 'moved', `${fromCol?.title || 'Unknown'} → ${toCol?.title || 'Unknown'}`)
    }
  },

  // ============================================================
  // DRAG HELPERS (local state only, no DB calls)
  // ============================================================
  setDragging: (isDragging) => set({ _isDragging: isDragging }),

  moveCardLocal: (boardId, fromColumnId, toColumnId, fromIndex, toIndex) => {
    const state = get()

    const fromCards = Object.values(state.cards)
      .filter((c) => c.column_id === fromColumnId)
      .sort((a, b) => a.position - b.position)

    const movedCard = fromCards[fromIndex]
    if (!movedCard) return

    if (fromColumnId === toColumnId) {
      const cards = [...fromCards]
      cards.splice(fromIndex, 1)
      cards.splice(toIndex, 0, movedCard)
      const updates = {}
      cards.forEach((card, i) => {
        if (card.position !== i) {
          updates[card.id] = { ...card, position: i }
        }
      })
      if (Object.keys(updates).length > 0) {
        set((s) => ({ cards: { ...s.cards, ...updates } }))
      }
    } else {
      const toCards = Object.values(state.cards)
        .filter((c) => c.column_id === toColumnId)
        .sort((a, b) => a.position - b.position)

      const newFromCards = fromCards.filter((c) => c.id !== movedCard.id)
      const newToCards = [...toCards]
      newToCards.splice(toIndex, 0, { ...movedCard, column_id: toColumnId })

      const updates = {}
      newFromCards.forEach((card, i) => {
        if (card.position !== i) {
          updates[card.id] = { ...card, position: i }
        }
      })
      newToCards.forEach((card, i) => {
        const isMovedCard = card.id === movedCard.id
        updates[card.id] = { ...card, column_id: toColumnId, position: i, ...(isMovedCard ? { completed: false } : {}) }
      })
      set((s) => ({ cards: { ...s.cards, ...updates } }))
    }
  },

  // Persist the current card positions to Supabase after drag ends
  persistCardPositions: async (cardIds) => {
    // Capture all positions upfront from a single state snapshot
    const state = get()
    const writes = cardIds
      .map((cardId) => {
        const card = state.cards[cardId]
        if (!card) return null
        return { id: cardId, column_id: card.column_id, position: card.position, completed: card.completed }
      })
      .filter(Boolean)

    // Parallel writes to minimize race window
    await Promise.all(writes.map(({ id, ...rest }) =>
      supabase.from('cards').update(rest).eq('id', id)
        .then(({ error }) => { if (error) logError('Failed to persist card position:', error) })
    ))

    // Refetch cards for the active board to recover any realtime updates
    // that were silently dropped while _isDragging was true
    const boardId = state.activeBoardId
    if (boardId && boardId !== '__all__') {
      const { data } = await supabase.from('cards').select('*').eq('board_id', boardId)
      if (data) {
        set((s) => {
          const cards = { ...s.cards }
          data.forEach((c) => { cards[c.id] = c })
          // Remove cards that no longer exist on this board
          Object.keys(cards).forEach((id) => {
            if (cards[id].board_id === boardId && !data.find((c) => c.id === id)) {
              delete cards[id]
            }
          })
          return { cards }
        })
      }
    }
  },

  // ============================================================
  // GETTERS
  // ============================================================
  getActiveBoard: () => {
    const state = get()
    return state.boards[state.activeBoardId] || null
  },

  getBoardColumns: (boardId) => {
    return Object.values(get().columns)
      .filter((c) => c.board_id === boardId)
      .sort((a, b) => a.position - b.position)
  },

  getColumnCards: (columnId) => {
    return Object.values(get().cards)
      .filter((c) => c.column_id === columnId)
      .sort((a, b) => a.position - b.position)
  },

  getBoardCards: (boardId) => {
    return Object.values(get().cards)
      .filter((c) => c.board_id === boardId)
  },

  getAllCards: () => Object.values(get().cards),

  // ============================================================
  // COMMENT ACTIONS
  // ============================================================
  fetchComments: async (cardId) => {
    const { data, error } = await supabase
      .from('card_comments')
      .select('*')
      .eq('card_id', cardId)
      .order('created_at', { ascending: true })

    if (error) {
      logError('Failed to fetch comments:', error)
      return
    }

    set((state) => ({
      comments: { ...state.comments, [cardId]: data || [] },
    }))
  },

  addComment: async (cardId, text) => {
    if (!commentLimiter()) { showToast.warn('Too many comments — slow down'); return }
    const sanitizedText = sanitizeText(text, 2000)
    if (!sanitizedText) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const profile = useAuthStore.getState().profile
    const authorName = profile?.display_name || user.email || 'Unknown'

    const commentData = commentInsertSchema.safeParse({ card_id: cardId, user_id: user.id, author_name: authorName, text: sanitizedText })
    if (!commentData.success) {
      logError('Comment validation failed:', commentData.error.flatten())
      return
    }

    const { data, error } = await supabase
      .from('card_comments')
      .insert(commentData.data)
      .select()
      .single()

    if (error) {
      logError('Failed to add comment:', error)
      return
    }

    set((state) => ({
      comments: {
        ...state.comments,
        [cardId]: [...(state.comments[cardId] || []), data],
      },
    }))
  },

  fetchActivity: async (cardId) => {
    const { data, error } = await supabase
      .from('card_activity')
      .select('*')
      .eq('card_id', cardId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      logError('Failed to fetch activity:', error)
      return
    }

    set((state) => ({
      activity: { ...state.activity, [cardId]: data || [] },
    }))
  },

  deleteComment: async (commentId, cardId) => {
    const { error } = await supabase
      .from('card_comments')
      .delete()
      .eq('id', commentId)

    if (error) {
      logError('Failed to delete comment:', error)
      return
    }

    set((state) => ({
      comments: {
        ...state.comments,
        [cardId]: (state.comments[cardId] || []).filter((c) => c.id !== commentId),
      },
    }))
  },

  // ============================================================
  // ATTACHMENTS
  // ============================================================
  fetchAttachments: async (cardId) => {
    const { data, error } = await supabase
      .from('card_attachments')
      .select('*')
      .eq('card_id', cardId)
      .order('created_at', { ascending: false })

    if (error) {
      logError('Failed to fetch attachments:', error)
      return
    }

    set((state) => ({
      attachments: { ...state.attachments, [cardId]: data || [] },
    }))
  },

  uploadAttachment: async (cardId, file) => {
    if (!uploadLimiter()) { showToast.warn('Too many uploads — slow down'); return null }

    // Block dangerous file types that could execute code when opened
    const BLOCKED_EXTENSIONS = ['.html', '.htm', '.svg', '.xml', '.xhtml', '.exe', '.bat', '.cmd', '.com', '.msi', '.js', '.jsx', '.ts', '.vbs', '.ps1', '.sh', '.php', '.asp', '.aspx', '.jsp', '.cgi', '.scr', '.hta', '.wsf']
    const ext = (file.name.lastIndexOf('.') >= 0 ? file.name.slice(file.name.lastIndexOf('.')) : '').toLowerCase()
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      showToast.error('This file type is not allowed')
      return null
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Sanitize filename to prevent path traversal and special characters
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255)
    const fileId = crypto.randomUUID()
    const storagePath = `${user.id}/${cardId}/${fileId}_${safeName}`

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(storagePath, file)

    if (uploadError) {
      logError('Failed to upload file:', uploadError)
      showToast.error('Failed to upload file')
      return null
    }

    // Save metadata
    const { data, error } = await supabase
      .from('card_attachments')
      .insert({
        card_id: cardId,
        user_id: user.id,
        file_name: file.name,
        file_size: file.size,
        content_type: file.type,
        storage_path: storagePath,
      })
      .select()
      .single()

    if (error) {
      logError('Failed to save attachment metadata:', error)
      return null
    }

    set((state) => ({
      attachments: {
        ...state.attachments,
        [cardId]: [data, ...(state.attachments[cardId] || [])],
      },
    }))

    logActivity(cardId, 'attached', file.name)
    return data
  },

  deleteAttachment: async (attachmentId, cardId, storagePath) => {
    // Remove metadata first (authoritative), then storage (best-effort)
    const { error } = await supabase
      .from('card_attachments')
      .delete()
      .eq('id', attachmentId)

    if (error) {
      logError('Failed to delete attachment:', error)
      return
    }

    set((state) => ({
      attachments: {
        ...state.attachments,
        [cardId]: (state.attachments[cardId] || []).filter((a) => a.id !== attachmentId),
      },
    }))

    // Best-effort storage cleanup (metadata is already gone, so no orphaned records)
    supabase.storage.from('attachments').remove([storagePath]).catch(() => {})
  },

  getAttachmentUrl: async (storagePath) => {
    const { data, error } = await supabase.storage
      .from('attachments')
      .createSignedUrl(storagePath, 3600) // 1 hour expiry

    if (error) {
      logError('Failed to get signed URL:', error)
      return null
    }
    return data.signedUrl
  },

  // ============================================================
  // RECURRING TASKS
  // ============================================================
  spawnRecurringTasks: async () => {
    const today = new Date().toISOString().split('T')[0]

    const { data: dueTasks, error } = await supabase
      .from('cards')
      .select('*')
      .eq('completed', true)
      .not('recurrence_next_due', 'is', null)
      .lte('recurrence_next_due', today)

    if (error || !dueTasks?.length) return

    for (const task of dueTasks) {
      const newDueDate = task.recurrence_next_due + 'T23:59:59'
      const nextDue = addRecurrenceInterval(
        new Date(task.recurrence_next_due),
        task.recurrence_interval,
        task.recurrence_unit
      )

      const newCard = {
        board_id: task.board_id,
        column_id: task.column_id,
        position: task.position,
        task_number: 0,
        global_task_number: 0,
        title: task.title,
        description: task.description || '',
        assignee_name: task.assignee_name || '',
        priority: task.priority || 'medium',
        due_date: newDueDate,
        icon: task.icon,
        completed: false,
        labels: task.labels || [],
        checklist: (task.checklist || []).map((item) => ({ ...item, done: false })),
        recurrence_interval: task.recurrence_interval,
        recurrence_unit: task.recurrence_unit,
        recurrence_next_due: format(nextDue, 'yyyy-MM-dd'),
      }

      const { data: created } = await supabase.from('cards').insert(newCard).select().single()

      if (created) {
        set((state) => ({
          cards: { ...state.cards, [created.id]: created },
        }))
      }

      // Clear recurrence on the completed original
      await supabase.from('cards').update({
        recurrence_interval: null,
        recurrence_unit: null,
        recurrence_next_due: null,
      }).eq('id', task.id)

      set((state) => ({
        cards: {
          ...state.cards,
          [task.id]: {
            ...state.cards[task.id],
            recurrence_interval: null,
            recurrence_unit: null,
            recurrence_next_due: null,
          },
        },
      }))
    }
  },

  // ============================================================
  // REAL-TIME SUBSCRIPTIONS
  // ============================================================
  subscribeToBoards: () => {
    // Clean up any existing subscriptions first to prevent duplicates
    const existing = get().subscriptions
    if (existing.length > 0) {
      existing.forEach((sub) => supabase.removeChannel(sub))
    }

    const activeBoardId = get().activeBoardId

    // Boards table: unfiltered (need to see renames/deletes across all boards)
    const boardsSub = supabase
      .channel('boards-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'boards' }, (payload) => {
        set((state) => {
          if (payload.eventType === 'DELETE') {
            const { [payload.old.id]: _, ...rest } = state.boards
            return { boards: rest }
          }
          const board = payload.new
          return { boards: { ...state.boards, [board.id]: board } }
        })
      })
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logError('Realtime boards subscription error:', err)
          // Auto-reconnect after 3 seconds
          setTimeout(() => {
            if (get().subscriptions.length > 0) get().subscribeToBoards()
          }, 3000)
        }
      })

    // Columns + Cards: filtered to active board (reduces noise for multi-board users)
    const subs = [boardsSub]
    if (activeBoardId && activeBoardId !== '__all__') {
      const boardDetailSub = supabase
        .channel(`board-detail-${activeBoardId}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'columns',
          filter: `board_id=eq.${activeBoardId}`,
        }, (payload) => {
          set((state) => {
            if (payload.eventType === 'DELETE') {
              const { [payload.old.id]: _, ...rest } = state.columns
              return { columns: rest }
            }
            const col = payload.new
            return { columns: { ...state.columns, [col.id]: col } }
          })
        })
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'cards',
          filter: `board_id=eq.${activeBoardId}`,
        }, (payload) => {
          if (get()._isDragging && payload.eventType !== 'DELETE') return
          set((state) => {
            if (payload.eventType === 'DELETE') {
              const { [payload.old.id]: _, ...rest } = state.cards
              return { cards: rest }
            }
            const card = payload.new
            return { cards: { ...state.cards, [card.id]: card } }
          })
        })
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            logError('Realtime board detail subscription error:', err)
            // Auto-reconnect after 3 seconds
            setTimeout(() => {
              if (get().subscriptions.length > 0) get().subscribeToBoards()
            }, 3000)
          }
        })
      subs.push(boardDetailSub)
    } else {
      // "__all__" view or no active board: subscribe to all columns and cards
      const allDetailSub = supabase
        .channel('all-detail-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'columns' }, (payload) => {
          set((state) => {
            if (payload.eventType === 'DELETE') {
              const { [payload.old.id]: _, ...rest } = state.columns
              return { columns: rest }
            }
            const col = payload.new
            return { columns: { ...state.columns, [col.id]: col } }
          })
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, (payload) => {
          if (get()._isDragging && payload.eventType !== 'DELETE') return
          set((state) => {
            if (payload.eventType === 'DELETE') {
              const { [payload.old.id]: _, ...rest } = state.cards
              return { cards: rest }
            }
            const card = payload.new
            return { cards: { ...state.cards, [card.id]: card } }
          })
        })
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            logError('Realtime all-detail subscription error:', err)
            setTimeout(() => {
              if (get().subscriptions.length > 0) get().subscribeToBoards()
            }, 3000)
          }
        })
      subs.push(allDetailSub)
    }

    set({ subscriptions: subs })
  },

  unsubscribeAll: () => {
    const { subscriptions } = get()
    subscriptions.forEach((sub) => supabase.removeChannel(sub))
    set({ subscriptions: [] })
  },
}))
