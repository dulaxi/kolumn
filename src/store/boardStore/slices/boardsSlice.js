import { capture } from '../../../lib/analytics'
import { showToast } from '../../../utils/toast'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../authStore'
import { createRateLimiter, sanitizeTitle } from '../../../utils/rateLimit'
import { logError } from '../../../utils/logger'
import { boardInsertSchema } from '../../../utils/schemas'
import { ACTIVE_BOARD_KEY, undoableDelete } from '../helpers'

const boardCreateLimiter = createRateLimiter(5, 30000)   // 5 boards per 30s

export const createBoardsSlice = (set, get) => ({
  boards: {},
  activeBoardId: null,
  loading: true,
  error: null,
  _loadedBoardCards: new Set(),
  _allCardsLoaded: false,

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

  getBoardCards: (boardId) => {
    return Object.values(get().cards)
      .filter((c) => c.board_id === boardId)
  },
})
