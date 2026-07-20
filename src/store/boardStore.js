import { create } from 'zustand'
import { capture } from '../lib/analytics'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { showToast } from '../utils/toast'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'
import { useNotificationStore } from './notificationStore'
import { addRecurrenceInterval } from '../utils/dateUtils'
import { createRateLimiter, sanitizeText, sanitizeTitle, sanitizeDescription } from '../utils/rateLimit'
import { logError } from '../utils/logger'
import { guardRealtimeSetup } from '../lib/realtimeGuard'
import { cardInsertSchema, boardInsertSchema, columnInsertSchema, commentInsertSchema } from '../utils/schemas'

const ACTIVE_BOARD_KEY = 'kolumn_active_board'

// Cards with a local write in flight. Realtime echoes for these are skipped so
// a stale echo (including the echo of the user's own earlier write) can't
// clobber a newer optimistic edit. See the 2026-07-20 architecture audit.
const _inFlightCards = new Set()

// Apply a realtime card change, guarding against stale/echo overwrites.
// Returns a partial state for zustand's set() ({} = no-op).
function mergeCardEcho(state, payload) {
  if (payload.eventType === 'DELETE') {
    const { [payload.old.id]: _, ...rest } = state.cards
    return { cards: rest }
  }
  const card = payload.new
  if (_inFlightCards.has(card.id)) return {}
  const existing = state.cards[card.id]
  // Drop an echo that is older than what we already hold locally.
  if (existing?.updated_at && card.updated_at &&
      new Date(card.updated_at) < new Date(existing.updated_at)) {
    return {}
  }
  return { cards: { ...state.cards, [card.id]: card } }
}

// Bound the temp→real id map so long AI sessions don't grow it without limit.
// Object key order is insertion order, so this keeps the most recent entries.
function pruneTempIdMap(map, keep = 50) {
  const keys = Object.keys(map)
  if (keys.length <= keep) return map
  return Object.fromEntries(keys.slice(keys.length - keep).map((k) => [k, map[k]]))
}

// Debounce guard for realtime reconnect — prevents concurrent reconnect races
let reconnectTimer = null
function scheduleReconnect() {
  if (reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    const store = useBoardStore.getState()
    if (store.subscriptions.length > 0) store.subscribeToBoards()
  }, 3000)
}

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
  labels: {},
  cardLabels: {},
  activeBoardId: null,
  loading: true,
  error: null,
  subscriptions: [],
  _isDragging: false,
  _tempIdMap: {},
  _loadedBoardCards: new Set(),
  _allCardsLoaded: false,
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
      // Cards are loaded separately (scoped) below — boards, columns and
      // labels are cheap and needed everywhere (board switcher, all-tasks
      // column map, label pickers), so they always load in full.
      const [boardsRes, columnsRes, labelsRes] = await Promise.all([
        supabase.from('boards').select('*').order('created_at'),
        supabase.from('columns').select('*').order('position'),
        supabase.from('labels').select('*'),
      ])

      if (boardsRes.error) logError('Failed to fetch boards:', boardsRes.error)
      if (columnsRes.error) logError('Failed to fetch columns:', columnsRes.error)
      if (labelsRes.error) logError('Failed to fetch labels:', labelsRes.error)

      // Surface first error to UI but continue with whatever data we got
      const fetchError = boardsRes.error || columnsRes.error || labelsRes.error
      if (fetchError) showToast.error('Some boards failed to load — try refreshing')

      const boardMap = {}
      ;(boardsRes.data || []).forEach((b) => { boardMap[b.id] = b })

      const columnMap = {}
      ;(columnsRes.data || []).forEach((c) => { columnMap[c.id] = c })

      const labelMap = {}
      ;(labelsRes.data || []).forEach((l) => { labelMap[l.id] = l })

      // Resolve the active board BEFORE loading cards so the initial card fetch
      // can be scoped to it — the big boot win when a user has many boards.
      // Other boards' cards load lazily on navigation (setActiveBoard →
      // fetchBoardCards) or in bulk via ensureAllCardsLoaded() for the
      // all-tasks / search / reminder surfaces.
      const firstBoardId = boardsRes.data?.length ? boardsRes.data[0].id : null
      const current = get().activeBoardId
      const saved = localStorage.getItem(ACTIVE_BOARD_KEY)
      const restoredId = current && boardMap[current] ? current
        : saved && (saved === '__all__' || boardMap[saved]) ? saved
        : firstBoardId

      // A refetch preserves whatever scope was already loaded: if everything
      // was loaded (all-tasks/search opened this session), reload everything;
      // otherwise just the active board.
      const loadAll = get()._allCardsLoaded
      const scopedBoardId = !loadAll && restoredId && restoredId !== '__all__' && boardMap[restoredId]
        ? restoredId
        : null

      let cardsData = []
      const loaded = new Set()
      if (loadAll) {
        const cardsRes = await supabase.from('cards').select('*').order('position')
        if (cardsRes.error) logError('Failed to fetch cards:', cardsRes.error)
        cardsData = cardsRes.data || []
        Object.keys(boardMap).forEach((id) => loaded.add(id))
      } else if (scopedBoardId) {
        const cardsRes = await supabase.from('cards').select('*').eq('board_id', scopedBoardId).order('position')
        if (cardsRes.error) logError('Failed to fetch cards:', cardsRes.error)
        cardsData = cardsRes.data || []
        loaded.add(scopedBoardId)
      }

      const cardMap = {}
      cardsData.forEach((c) => { cardMap[c.id] = c })

      const cardIds = cardsData.map((c) => c.id)
      const cardLabelsRes = cardIds.length === 0
        ? { data: [], error: null }
        : await supabase.from('card_labels').select('card_id, label_id').in('card_id', cardIds)
      if (cardLabelsRes.error) logError('Failed to fetch card_labels:', cardLabelsRes.error)

      const cardLabelMap = {}
      ;(cardLabelsRes.data || []).forEach((cl) => {
        const prev = cardLabelMap[cl.card_id] || new Set()
        const next = new Set(prev)
        next.add(cl.label_id)
        cardLabelMap[cl.card_id] = next
      })

      set({
        boards: boardMap,
        columns: columnMap,
        cards: cardMap,
        labels: labelMap,
        cardLabels: cardLabelMap,
        activeBoardId: restoredId,
        loading: false,
        _loadedBoardCards: loaded,
        _allCardsLoaded: loadAll,
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
    // Lazy-load this board's cards if we haven't yet (scoped-load path).
    if (boardId && boardId !== '__all__') get().fetchBoardCards(boardId)
    // Re-subscribe with the new board filter so realtime is scoped correctly
    if (get().subscriptions.length > 0) {
      get().subscribeToBoards()
    }
  },

  // Lazy-load one board's cards (+ their card_labels), merging without touching
  // already-loaded boards. Idempotent — a board loaded once is skipped.
  fetchBoardCards: async (boardId) => {
    if (!boardId || boardId === '__all__') return
    if (get()._loadedBoardCards?.has(boardId)) return
    try {
      const cardsRes = await supabase.from('cards').select('*').eq('board_id', boardId).order('position')
      if (cardsRes.error) { logError('Failed to fetch board cards:', cardsRes.error); return }
      const newCards = cardsRes.data || []
      const ids = newCards.map((c) => c.id)
      const clRes = ids.length
        ? await supabase.from('card_labels').select('card_id, label_id').in('card_id', ids)
        : { data: [] }
      set((state) => {
        const cards = { ...state.cards }
        newCards.forEach((c) => { if (!state._loadedBoardCards?.has(c.board_id) || !cards[c.id]) cards[c.id] = c })
        const cardLabels = { ...state.cardLabels }
        ;(clRes.data || []).forEach((cl) => {
          const next = new Set(cardLabels[cl.card_id] || [])
          next.add(cl.label_id)
          cardLabels[cl.card_id] = next
        })
        const loadedNext = new Set(state._loadedBoardCards || [])
        loadedNext.add(boardId)
        return { cards, cardLabels, _loadedBoardCards: loadedNext }
      })
    } catch (err) {
      logError('fetchBoardCards failed:', err)
    }
  },

  // Ensure cards for EVERY board are loaded — used by the cross-board surfaces
  // (all-tasks view, ⌘K search, boot due-date reminders). Only fetches boards
  // not already loaded, so it never overwrites in-progress edits on the active
  // board. Awaitable so callers can gate on complete data.
  ensureAllCardsLoaded: async () => {
    if (get()._allCardsLoaded) return
    const loaded = get()._loadedBoardCards || new Set()
    const allBoardIds = Object.keys(get().boards)
    const missing = allBoardIds.filter((id) => !loaded.has(id))
    try {
      const cardsRes = missing.length === 0
        ? { data: [] }
        : await supabase.from('cards').select('*').in('board_id', missing).order('position')
      if (cardsRes.error) { logError('Failed to fetch all cards:', cardsRes.error); return }
      const newCards = cardsRes.data || []
      const ids = newCards.map((c) => c.id)
      const clRes = ids.length
        ? await supabase.from('card_labels').select('card_id, label_id').in('card_id', ids)
        : { data: [] }
      set((state) => {
        const cards = { ...state.cards }
        newCards.forEach((c) => { cards[c.id] = c })
        const cardLabels = { ...state.cardLabels }
        ;(clRes.data || []).forEach((cl) => {
          const next = new Set(cardLabels[cl.card_id] || [])
          next.add(cl.label_id)
          cardLabels[cl.card_id] = next
        })
        return { cards, cardLabels, _allCardsLoaded: true, _loadedBoardCards: new Set(allBoardIds) }
      })
    } catch (err) {
      logError('ensureAllCardsLoaded failed:', err)
    }
  },

  addBoard: async (name, icon, customColumns, workspaceId = null) => {
    if (!boardCreateLimiter()) { showToast.warn('Too many boards created — slow down'); return null }
    const sanitizedName = sanitizeTitle(name) || 'Untitled Board'

    // Read user from auth store instead of making a network call
    const user = useAuthStore.getState().user
    if (!user) return null

    const boardId = crypto.randomUUID()

    const validated = boardInsertSchema.safeParse({ id: boardId, name: sanitizedName, icon: icon || null, owner_id: user.id, workspace_id: workspaceId || null })
    if (!validated.success) {
      logError('Board validation failed:', validated.error.flatten())
      showToast.error('Invalid board data')
      return null
    }

    // Step 1: Insert board (trigger auto-adds owner to board_members)
    const { error } = await supabase
      .from('boards')
      .insert(validated.data)

    if (error) {
      logError('Failed to create board:', error)
      showToast.error('Failed to create board')
      return null
    }

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
    if (!board) {
      logError('Board created but could not be loaded back:', boardRes.error, colsRes.error)
      showToast.error('Failed to create board')
      return null
    }

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
    capture('board_created', { template: customColumns ? 'custom' : 'default' })
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
      showToast.error('Failed to update board icon')
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
      const { error } = await supabase.from('boards').delete().eq('id', boardId)
      if (error) {
        logError('Failed to delete board:', error)
        set((s) => {
          const columns = { ...s.columns }
          const cards = { ...s.cards }
          prevColumns.forEach((c) => { columns[c.id] = c })
          prevCards.forEach((c) => { cards[c.id] = c })
          // Same rule as the undo branch: only pull the user back to the
          // restored board if they aren't already on another valid one.
          const currentActiveId = s.activeBoardId
          const shouldRestoreActive = currentActiveId === null || !s.boards[currentActiveId]
          return {
            boards: { ...s.boards, [boardId]: prevBoard },
            columns,
            cards,
            activeBoardId: shouldRestoreActive ? prevActiveId : currentActiveId,
          }
        })
        localStorage.setItem(ACTIVE_BOARD_KEY, get().activeBoardId || '')
        showToast.error('Failed to delete board — it was restored')
      }
    } else {
      set((s) => {
        const columns = { ...s.columns }
        const cards = { ...s.cards }
        prevColumns.forEach((c) => { columns[c.id] = c })
        prevCards.forEach((c) => { cards[c.id] = c })
        // Only restore activeBoardId if the user hasn't navigated to another valid board
        const currentActiveId = s.activeBoardId
        const shouldRestoreActive = currentActiveId === null || !s.boards[currentActiveId]
        return { boards: { ...s.boards, [boardId]: prevBoard }, columns, cards, activeBoardId: shouldRestoreActive ? prevActiveId : currentActiveId }
      })
      localStorage.setItem(ACTIVE_BOARD_KEY, get().activeBoardId || '')
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

    // Optimistic: show column instantly with temp ID
    const tempId = `temp-${crypto.randomUUID()}`
    const now = new Date().toISOString()
    const optimisticCol = { id: tempId, board_id: boardId, title: sanitizedCol, position, created_at: now, wip_limit: null }
    set((s) => ({ columns: { ...s.columns, [tempId]: optimisticCol } }))

    // Persist in background
    const { data: col, error } = await supabase
      .from('columns')
      .insert(validated.data)
      .select()
      .single()

    if (error) {
      logError('Failed to add column:', error)
      showToast.error('Failed to add section')
      set((s) => { const { [tempId]: _, ...rest } = s.columns; return { columns: rest } })
      return
    }

    if (col) {
      set((s) => {
        const { [tempId]: _, ...restCols } = s.columns
        return { columns: { ...restCols, [col.id]: col } }
      })
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
      showToast.error('Failed to update WIP limit')
    }
  },

  reorderColumns: async (boardId, orderedIds) => {
    // Optimistic: update positions locally
    const prevColumns = { ...get().columns }
    set((s) => {
      const columns = { ...s.columns }
      orderedIds.forEach((id, idx) => {
        if (columns[id]) columns[id] = { ...columns[id], position: idx }
      })
      return { columns }
    })

    // Persist each column's new position
    const updates = orderedIds.map((id, idx) =>
      supabase.from('columns').update({ position: idx }).eq('id', id)
    )
    const results = await Promise.all(updates)
    const failed = results.some((r) => r.error)
    if (failed) {
      logError('Failed to reorder columns')
      set({ columns: prevColumns })
      showToast.error('Failed to reorder sections')
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
      const { error } = await supabase.from('columns').delete().eq('id', columnId)
      if (error) {
        logError('Failed to delete section:', error)
        set((s) => {
          const cards = { ...s.cards }
          prevCards.forEach((c) => { cards[c.id] = c })
          return { columns: { ...s.columns, [columnId]: prevColumn }, cards }
        })
        showToast.error('Failed to delete section — it was restored')
      }
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

    // Optimistic local task numbers (best-guess, server reconciles)
    const localGlobalNumber = Object.values(state.cards).reduce((max, c) => Math.max(max, c.global_task_number || 0), 0) + 1
    const localTaskNumber = board.next_task_number || 1

    // Build optimistic card with temp ID
    const tempId = `temp-${crypto.randomUUID()}`
    const now = new Date().toISOString()
    const optimisticCard = {
      id: tempId,
      board_id: boardId,
      column_id: columnId,
      position,
      task_number: localTaskNumber,
      global_task_number: localGlobalNumber,
      title: sanitizeTitle(cardData.title) || 'Untitled task',
      description: sanitizeDescription(cardData.description) || '',
      assignees: (cardData.assignees || (cardData.assignee ? [cardData.assignee] : []))
        .map((n) => sanitizeTitle(n))
        .filter(Boolean),
      assignee_name: sanitizeTitle((cardData.assignees && cardData.assignees[0]) || cardData.assignee) || '',
      assignee_refs: [],
      due_date: cardData.dueDate || null,
      priority: cardData.priority || 'medium',
      icon: cardData.icon || null,
      completed: cardData.completed || false,
      checklist: cardData.checklist || [],
      created_at: now,
      updated_at: now,
      archived: false,
      _optimistic: true,
    }

    // Show card instantly
    set((s) => ({
      cards: { ...s.cards, [tempId]: optimisticCard },
      boards: { ...s.boards, [boardId]: { ...s.boards[boardId], next_task_number: localTaskNumber + 1 } },
    }))

    // Persist in background
    ;(async () => {
      try {
        // global_task_number is assigned authoritatively by a DB BEFORE-INSERT
        // trigger (atomic sequence) — the value we send is just an optimistic
        // placeholder the insert's returned row corrects on swap.
        const globalNumber = localGlobalNumber

        let taskNumber = localTaskNumber
        const { data: atomicNum, error: rpcError } = await supabase.rpc('next_task_number', { target_board_id: boardId })
        if (!rpcError && atomicNum != null) {
          taskNumber = atomicNum
        }

        const rawInsert = {
          board_id: boardId,
          column_id: columnId,
          position,
          task_number: taskNumber,
          global_task_number: globalNumber,
          title: optimisticCard.title,
          description: optimisticCard.description,
          assignee_name: optimisticCard.assignee_name,
          assignees: optimisticCard.assignees,
          due_date: optimisticCard.due_date,
          priority: optimisticCard.priority,
          icon: optimisticCard.icon,
          completed: optimisticCard.completed,
          checklist: optimisticCard.checklist,
        }

        const validated = cardInsertSchema.safeParse(rawInsert)
        if (!validated.success) {
          logError('Card validation failed:', validated.error.flatten())
          showToast.error('Invalid task data')
          set((s) => { const { [tempId]: _, ...rest } = s.cards; return { cards: rest } })
          return
        }

        const cardRes = await supabase.from('cards').insert(validated.data).select().single()
        if (cardRes.error || !cardRes.data) {
          logError('Failed to create card:', cardRes.error)
          showToast.error('Failed to create task')
          set((s) => { const { [tempId]: _, ...rest } = s.cards; return { cards: rest } })
          return
        }

        const realCard = cardRes.data
        capture('card_created', { board_id: boardId })

        // Swap temp card with real card; also apply any edits user made to the temp card
        set((s) => {
          const tempCurrent = s.cards[tempId]
          const merged = { ...realCard }
          // Preserve user edits made while insert was in flight
          if (tempCurrent && tempCurrent.updated_at !== optimisticCard.updated_at) {
            if (tempCurrent.title !== optimisticCard.title) merged.title = tempCurrent.title
            if (tempCurrent.description !== optimisticCard.description) merged.description = tempCurrent.description
            if (tempCurrent.assignee_name !== optimisticCard.assignee_name) merged.assignee_name = tempCurrent.assignee_name
            if (JSON.stringify(tempCurrent.assignees) !== JSON.stringify(optimisticCard.assignees)) merged.assignees = tempCurrent.assignees
            if (JSON.stringify(tempCurrent.assignee_refs || []) !== JSON.stringify(optimisticCard.assignee_refs || [])) merged.assignee_refs = tempCurrent.assignee_refs
            if (tempCurrent.priority !== optimisticCard.priority) merged.priority = tempCurrent.priority
            if (tempCurrent.due_date !== optimisticCard.due_date) merged.due_date = tempCurrent.due_date
            if (JSON.stringify(tempCurrent.checklist) !== JSON.stringify(optimisticCard.checklist)) merged.checklist = tempCurrent.checklist
          }
          const { [tempId]: _, ...restCards } = s.cards
          return {
            cards: { ...restCards, [realCard.id]: merged },
            boards: { ...s.boards, [boardId]: { ...s.boards[boardId], next_task_number: taskNumber + 1 } },
            _tempIdMap: pruneTempIdMap({ ...(s._tempIdMap || {}), [tempId]: realCard.id }),
          }
        })

        logActivity(realCard.id, 'created', null)
      } catch (err) {
        logError('addCard background persist failed:', err)
        showToast.error('Failed to create task')
        set((s) => { const { [tempId]: _, ...rest } = s.cards; return { cards: rest } })
      }
    })()

    return tempId
  },

  duplicateCard: async (cardId) => {
    const card = get().cards[cardId]
    if (!card) return null

    // Duplicate uses the source title verbatim — no "(copy)" suffix. The
    // user can rename via update_card if they want. Identical titles will
    // trigger the executor's ambiguity error on the next title-based
    // operation, which is an acceptable trade for clean titles by default.
    return get().addCard(card.board_id, card.column_id, {
      title: card.title,
      description: card.description || '',
      // Copy BOTH the modern multi-assignee array AND the legacy single name.
      // Without copying `assignees`, multi-assignee data is silently lost on
      // duplicate. addCard accepts either; passing both keeps it consistent
      // with how the source card looks.
      assignees: card.assignees && card.assignees.length ? [...card.assignees] : undefined,
      assignee: card.assignee_name || '',
      dueDate: card.due_date || null,
      priority: card.priority || 'medium',
      icon: card.icon || null,
      completed: false,
      checklist: card.checklist ? card.checklist.map((item) => ({ text: item.text, done: false })) : [],
    })
  },

  updateCard: async (cardId, updates) => {
    // Map frontend field names to DB column names
    const dbUpdates = {}
    if ('title' in updates) dbUpdates.title = sanitizeTitle(updates.title) || 'Untitled task'
    if ('description' in updates) dbUpdates.description = sanitizeDescription(updates.description)
    // Assignee writes take one of two paths:
    //  - assigneeRefs (from the picker): [{name,id}] — member assignments carry
    //    their user id, free-text is id null. Written to assignee_refs directly;
    //    the sync trigger derives the assignees/assignee_name name mirror.
    //  - assignee / assignee_name / assignees (AI, legacy, duplicate): names
    //    only — the trigger resolves them to member ids on write. (Writing
    //    assignee_name alone is reverted by the trigger, so singular inputs go
    //    through the array too.)
    if ('assigneeRefs' in updates) {
      const refs = (updates.assigneeRefs || [])
        .map((r) => ({ name: sanitizeTitle(r?.name), id: r?.id || null }))
        .filter((r) => r.name)
      dbUpdates.assignee_refs = refs
      dbUpdates.assignees = refs.map((r) => r.name)
      dbUpdates.assignee_name = refs[0]?.name || ''
    } else {
      let assigneesInput
      if ('assignees' in updates) assigneesInput = updates.assignees || []
      else if ('assignee' in updates) assigneesInput = updates.assignee ? [updates.assignee] : []
      else if ('assignee_name' in updates) assigneesInput = updates.assignee_name ? [updates.assignee_name] : []
      if (assigneesInput !== undefined) {
        const cleaned = assigneesInput.map((n) => sanitizeTitle(n)).filter(Boolean)
        dbUpdates.assignees = cleaned
        // Mirror first entry into assignee_name so optimistic local reads + the
        // assignment-notification diff below stay correct pre-echo.
        dbUpdates.assignee_name = cleaned[0] || ''
      }
    }
    if ('priority' in updates) dbUpdates.priority = updates.priority
    if ('dueDate' in updates) dbUpdates.due_date = updates.dueDate
    if ('due_date' in updates) dbUpdates.due_date = updates.due_date
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

    // Temp cards haven't been persisted yet — edits will be merged on swap
    if (typeof cardId === 'string' && cardId.startsWith('temp-')) return

    // Mark in-flight so a realtime echo can't clobber this (or a newer) edit
    _inFlightCards.add(cardId)
    const { error } = await supabase.from('cards').update(dbUpdates).eq('id', cardId)
    _inFlightCards.delete(cardId)
    if (error) {
      logError('Failed to update card:', error)
      // Rollback optimistic update
      if (prevCard) {
        set((state) => ({
          cards: { ...state.cards, [cardId]: prevCard },
        }))
      }
      showToast.error('Failed to save changes')
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
            .from('board_members')
            .select('user_id, profiles(id, display_name)')
            .eq('board_id', prevCard.board_id)
            .then(({ data }) => {
              const match = (data || []).find((m) => m.profiles?.display_name === dbUpdates.assignee_name)
              return { data: match?.profiles || null }
            })
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
    set((state) => ({ _completingCards: new Set([...state._completingCards, cardId]) }))

    const card = get().cards[cardId]
    if (!card) {
      set((state) => {
        const next = new Set(state._completingCards)
        next.delete(cardId)
        return { _completingCards: next }
      })
      return
    }

    const newCompleted = !card.completed

    set((state) => ({
      cards: {
        ...state.cards,
        [cardId]: { ...state.cards[cardId], completed: newCompleted, updated_at: new Date().toISOString() },
      },
    }))

    try {
      const { error } = await supabase.from('cards').update({ completed: newCompleted }).eq('id', cardId)
      if (error) {
        logError('Failed to toggle card completion:', error)
        set((state) => ({
          cards: { ...state.cards, [cardId]: card },
        }))
        showToast.error('Failed to update task')
        return
      }
      logActivity(cardId, newCompleted ? 'completed' : 'reopened', null)
    } finally {
      set((state) => {
        const next = new Set(state._completingCards)
        next.delete(cardId)
        return { _completingCards: next }
      })
    }
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
      // Verify card still exists in DB before restoring (prevents ghost cards after concurrent remote delete)
      const { data: exists } = await supabase.from('cards').select('id').eq('id', cardId).maybeSingle()
      if (exists) {
        set((state) => ({ cards: { ...state.cards, [cardId]: prevCard } }))
        showToast.restore('Task restored')
      } else {
        showToast.warn('Task was already deleted')
      }
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
      showToast.error('Failed to archive task')
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
      showToast.error('Failed to restore task')
    } else {
      logActivity(cardId, 'unarchived', null)
      showToast.restore('Task restored from archive')
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
  persistCardPositions: async (cardIds, { movedCrossColumn = false } = {}) => {
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
    const results = await Promise.all(writes.map(({ id, ...rest }) =>
      supabase.from('cards').update(rest).eq('id', id)
        .then(({ error }) => {
          if (error) logError('Failed to persist card position:', error)
          return !error
        })
    ))
    const anyFailed = results.some((ok) => !ok)
    if (anyFailed) showToast.error('Some card moves failed to save — resyncing')

    // Refetch cards after cross-column moves to recover any realtime updates
    // that were silently dropped while _isDragging was true
    const boardId = state.activeBoardId
    if ((movedCrossColumn || anyFailed) && boardId && boardId !== '__all__') {
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

  logCardMove: (cardId, fromColumnId, toColumnId) => {
    const state = get()
    const fromCol = state.columns[fromColumnId]
    const toCol = state.columns[toColumnId]
    logActivity(cardId, 'moved', `${fromCol?.title || 'Unknown'} → ${toCol?.title || 'Unknown'}`)
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

    const profile = useAuthStore.getState().profile
    const user = useAuthStore.getState().user
    if (!user) return
    const authorName = profile?.display_name || user.email || 'Unknown'

    // Optimistic: show comment instantly
    const tempId = `temp-${crypto.randomUUID()}`
    const now = new Date().toISOString()
    const optimisticComment = {
      id: tempId, card_id: cardId, user_id: user.id, author_name: authorName,
      text: sanitizedText, created_at: now,
    }
    set((s) => ({
      comments: { ...s.comments, [cardId]: [...(s.comments[cardId] || []), optimisticComment] },
    }))

    // Persist in background
    const commentData = commentInsertSchema.safeParse({ card_id: cardId, user_id: user.id, author_name: authorName, text: sanitizedText })
    if (!commentData.success) {
      logError('Comment validation failed:', commentData.error.flatten())
      set((s) => ({
        comments: { ...s.comments, [cardId]: (s.comments[cardId] || []).filter((c) => c.id !== tempId) },
      }))
      return
    }

    const { data, error } = await supabase
      .from('card_comments')
      .insert(commentData.data)
      .select()
      .single()

    if (error) {
      logError('Failed to add comment:', error)
      // Rollback
      set((s) => ({
        comments: { ...s.comments, [cardId]: (s.comments[cardId] || []).filter((c) => c.id !== tempId) },
      }))
      showToast.error('Failed to add comment')
      return
    }

    // Swap temp with real
    set((s) => ({
      comments: {
        ...s.comments,
        [cardId]: (s.comments[cardId] || []).map((c) => c.id === tempId ? data : c),
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
    // Optimistic remove
    const prevComments = get().comments[cardId] || []
    set((s) => ({
      comments: { ...s.comments, [cardId]: (s.comments[cardId] || []).filter((c) => c.id !== commentId) },
    }))

    const { error } = await supabase
      .from('card_comments')
      .delete()
      .eq('id', commentId)

    if (error) {
      logError('Failed to delete comment:', error)
      // Rollback
      set((s) => ({ comments: { ...s.comments, [cardId]: prevComments } }))
      showToast.error('Failed to delete comment')
    }
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
      // The storage object is already uploaded — remove it so a metadata
      // failure doesn't orphan a file the UI will never reference.
      supabase.storage.from('attachments').remove([storagePath]).catch(() => {})
      showToast.error('Failed to attach file')
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

  // (cardId, attachmentId, storagePath) — matches uploadAttachment's
  // cardId-first convention. Previously this was (attachmentId, cardId, ...)
  // which silently no-op'd because the SQL delete targeted the wrong id.
  deleteAttachment: async (cardId, attachmentId, storagePath) => {
    // Optimistic remove
    const prevAttachments = get().attachments[cardId] || []
    set((s) => ({
      attachments: { ...s.attachments, [cardId]: (s.attachments[cardId] || []).filter((a) => a.id !== attachmentId) },
    }))

    const { error } = await supabase
      .from('card_attachments')
      .delete()
      .eq('id', attachmentId)

    if (error) {
      logError('Failed to delete attachment:', error)
      // Rollback
      set((s) => ({ attachments: { ...s.attachments, [cardId]: prevAttachments } }))
      showToast.error('Failed to remove file')
      return
    }

    // Best-effort storage cleanup
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

      // Derive proper task numbers (same as addCard)
      const state = get()
      const board = state.boards[task.board_id]

      let globalNumber = Object.values(state.cards).reduce((max, c) => Math.max(max, c.global_task_number || 0), 0) + 1
      const { data: maxRow } = await supabase.from('cards').select('global_task_number').order('global_task_number', { ascending: false }).limit(1).single()
      if (maxRow?.global_task_number >= globalNumber) {
        globalNumber = maxRow.global_task_number + 1
      }

      let taskNumber = board?.next_task_number || 1
      const { data: atomicNum, error: rpcError } = await supabase.rpc('next_task_number', { target_board_id: task.board_id })
      if (!rpcError && atomicNum != null) {
        taskNumber = atomicNum
      }

      const newCard = {
        board_id: task.board_id,
        column_id: task.column_id,
        position: task.position,
        task_number: taskNumber,
        global_task_number: globalNumber,
        title: task.title,
        description: task.description || '',
        assignee_name: task.assignee_name || '',
        priority: task.priority || 'medium',
        due_date: newDueDate,
        icon: task.icon,
        completed: false,
        checklist: (task.checklist || []).map((item) => ({ ...item, done: false })),
        recurrence_interval: task.recurrence_interval,
        recurrence_unit: task.recurrence_unit,
        recurrence_next_due: format(nextDue, 'yyyy-MM-dd'),
      }

      const { data: created, error: insertError } = await supabase.from('cards').insert(newCard).select().single()
      if (insertError) {
        logError('Failed to spawn recurring task:', insertError)
        continue
      }

      // Only manually increment if the atomic RPC was not used
      if (rpcError && board) {
        await supabase.from('boards').update({ next_task_number: taskNumber + 1 }).eq('id', task.board_id)
      }

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

    // Guard all channel setup: a synchronous WebSocket failure (e.g. a
    // CSP-blocked wss:// connection, or WebSocket being unavailable) must
    // degrade to a working, non-live app — never escape into React and
    // white-screen it. See src/lib/realtimeGuard.js.
    const channels = guardRealtimeSetup('boards', () => {
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
          scheduleReconnect()
        }
      })

    // Labels + card_labels: unfiltered (workspace-scoped, not board-scoped)
    const labelsSub = supabase
      .channel('labels-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'labels' }, (payload) => {
        set((state) => {
          if (payload.eventType === 'DELETE') {
            const { [payload.old.id]: _, ...rest } = state.labels
            return { labels: rest }
          }
          const label = payload.new
          return { labels: { ...state.labels, [label.id]: label } }
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'card_labels' }, (payload) => {
        set((state) => {
          const row = payload.eventType === 'DELETE' ? payload.old : payload.new
          if (!row) return state
          const cur = state.cardLabels[row.card_id]
          const next = new Set(cur)
          if (payload.eventType === 'DELETE') next.delete(row.label_id)
          else next.add(row.label_id)
          return { cardLabels: { ...state.cardLabels, [row.card_id]: next } }
        })
      })
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logError('Realtime labels subscription error:', err)
          scheduleReconnect()
        }
      })

    // Columns + Cards: filtered to active board (reduces noise for multi-board users)
    const subs = [boardsSub, labelsSub]
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
          set((state) => mergeCardEcho(state, payload))
        })
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            logError('Realtime board detail subscription error:', err)
            scheduleReconnect()
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
          set((state) => mergeCardEcho(state, payload))
        })
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            logError('Realtime all-detail subscription error:', err)
            scheduleReconnect()
          }
        })
      subs.push(allDetailSub)
    }

    return subs
    }, [])

    set({ subscriptions: channels })
  },

  unsubscribeAll: () => {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    const { subscriptions } = get()
    subscriptions.forEach((sub) => supabase.removeChannel(sub))
    set({ subscriptions: [] })
  },

  // ─── Label actions ───────────────────────────────────────────────────────────

  addLabelToCard: async (cardId, text, color = null) => {
    const card = get().cards[cardId]
    if (!card) return
    const { data: labelId, error } = await supabase.rpc('attach_label_by_text', {
      p_card_id: cardId, p_text: text, p_color: color,
    })
    if (error) {
      logError('Failed to add label:', error)
      showToast.error('Couldn\'t add label — try again')
      return
    }
    // attach_label_by_text returns only the label id. For a brand-new label the
    // label object isn't in state.labels yet, so selectCardLabels would filter
    // it out and the chip would render as nothing. Fetch the authoritative row
    // so the new label is visible immediately, independent of realtime.
    let label = get().labels[labelId]
    if (!label) {
      const { data: row } = await supabase.from('labels').select('*').eq('id', labelId).single()
      label = row
    }
    set((s) => {
      const next = new Set(s.cardLabels[cardId] || [])
      next.add(labelId)
      return {
        cardLabels: { ...s.cardLabels, [cardId]: next },
        labels: label ? { ...s.labels, [labelId]: label } : s.labels,
      }
    })
  },

  // Create a board label without attaching it to a card (used by the label
  // manager modal). Returns the new/existing label id, or null on error.
  createLabel: async (boardId, text, color = null) => {
    const { data: labelId, error } = await supabase.rpc('upsert_label', {
      p_board_id: boardId, p_text: text, p_color: color,
    })
    if (error) {
      logError('Failed to create label:', error)
      showToast.error('Couldn\'t create label — try again')
      return null
    }
    let label = get().labels[labelId]
    if (!label) {
      const { data: row } = await supabase.from('labels').select('*').eq('id', labelId).single()
      label = row
    }
    if (label) {
      set((s) => ({ labels: { ...s.labels, [labelId]: label } }))
    }
    return labelId
  },

  removeLabelFromCard: async (cardId, labelId) => {
    set((s) => {
      const cur = s.cardLabels[cardId]
      if (!cur) return s
      const next = new Set(cur)
      next.delete(labelId)
      return { cardLabels: { ...s.cardLabels, [cardId]: next } }
    })
    const { error } = await supabase
      .from('card_labels')
      .delete()
      .eq('card_id', cardId)
      .eq('label_id', labelId)
    if (error) {
      logError('Failed to remove label:', error)
      showToast.error('Couldn\'t remove label — try again')
    }
  },

  renameLabel: async (labelId, newText) => {
    const trimmed = newText.trim()
    if (!trimmed) return
    const { error } = await supabase.from('labels').update({ text: trimmed }).eq('id', labelId)
    if (error) {
      if (error.code === '23505') {
        showToast.warn('A label with that name already exists — use Merge instead.')
      } else {
        logError('Failed to rename label:', error)
        showToast.error('Couldn\'t rename label — try again')
      }
      return
    }
    set((s) => ({
      labels: { ...s.labels, [labelId]: { ...s.labels[labelId], text: trimmed } },
    }))
  },

  updateLabelColor: async (labelId, color) => {
    const { error } = await supabase.from('labels').update({ color }).eq('id', labelId)
    if (error) { logError('Failed to update label color:', error); showToast.error('Couldn\'t update the label color — try again'); return }
    set((s) => ({
      labels: { ...s.labels, [labelId]: { ...s.labels[labelId], color } },
    }))
  },

  mergeLabels: async (fromId, intoId) => {
    const { error } = await supabase.rpc('merge_labels', { p_from_id: fromId, p_into_id: intoId })
    if (error) { logError('Failed to merge labels:', error); showToast.error('Couldn\'t merge labels — try again'); return }
    set((s) => {
      const nextLabels = { ...s.labels }
      delete nextLabels[fromId]
      const nextCardLabels = {}
      for (const [cid, ids] of Object.entries(s.cardLabels)) {
        const ns = new Set(ids)
        if (ns.delete(fromId)) ns.add(intoId)
        nextCardLabels[cid] = ns
      }
      return { labels: nextLabels, cardLabels: nextCardLabels }
    })
  },

  archiveLabel: async (labelId) => {
    const ts = new Date().toISOString()
    const { error } = await supabase
      .from('labels').update({ archived_at: ts }).eq('id', labelId)
    if (error) { logError('Failed to archive label:', error); showToast.error('Couldn\'t archive the label — try again'); return }
    set((s) => ({
      labels: { ...s.labels, [labelId]: { ...s.labels[labelId], archived_at: ts } },
    }))
  },

  unarchiveLabel: async (labelId) => {
    const { error } = await supabase
      .from('labels').update({ archived_at: null }).eq('id', labelId)
    if (error) {
      if (error.code === '23505') {
        showToast.warn('Cannot unarchive — a label with this name already exists.')
      } else {
        logError('Failed to restore label:', error)
        showToast.error('Couldn\'t restore the label — try again')
      }
      return
    }
    set((s) => ({
      labels: { ...s.labels, [labelId]: { ...s.labels[labelId], archived_at: null } },
    }))
  },

  // ─────────────────────────────────────────────────────────────────────────────

  resetStore: () => {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    const { subscriptions } = get()
    subscriptions.forEach((sub) => supabase.removeChannel(sub))
    set({ boards: {}, columns: {}, cards: {}, labels: {}, cardLabels: {}, activeBoardId: null, loading: false, error: null, subscriptions: [], _isDragging: false, _tempIdMap: {}, _loadedBoardCards: new Set(), _allCardsLoaded: false, comments: {}, activity: {}, attachments: {}, _completingCards: new Set() })
  },
}))
