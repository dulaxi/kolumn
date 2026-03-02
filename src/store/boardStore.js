import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useBoardStore = create((set, get) => ({
  boards: {},
  columns: {},
  cards: {},
  activeBoardId: null,
  loading: true,
  subscriptions: [],
  _isDragging: false,

  // ============================================================
  // FETCH (load all boards the user has access to)
  // ============================================================
  fetchBoards: async () => {
    set({ loading: true })

    const { data: boards } = await supabase
      .from('boards')
      .select('*')
      .order('created_at')

    const { data: columns } = await supabase
      .from('columns')
      .select('*')
      .order('position')

    const { data: cards } = await supabase
      .from('cards')
      .select('*')
      .order('position')

    const boardMap = {}
    ;(boards || []).forEach((b) => { boardMap[b.id] = b })

    const columnMap = {}
    ;(columns || []).forEach((c) => { columnMap[c.id] = c })

    const cardMap = {}
    ;(cards || []).forEach((c) => { cardMap[c.id] = c })

    const firstBoardId = boards?.length ? boards[0].id : null
    const current = get().activeBoardId

    set({
      boards: boardMap,
      columns: columnMap,
      cards: cardMap,
      activeBoardId: current && boardMap[current] ? current : firstBoardId,
      loading: false,
    })
  },

  // ============================================================
  // BOARD ACTIONS
  // ============================================================
  setActiveBoard: (boardId) => set({ activeBoardId: boardId }),

  addBoard: async (name, icon) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Generate ID client-side to avoid .select() on insert
    // (PostgREST can't return the row because the SELECT RLS policy
    // depends on board_members, which is populated by an AFTER INSERT trigger)
    const boardId = crypto.randomUUID()

    const { error } = await supabase
      .from('boards')
      .insert({ id: boardId, name, icon: icon || null, owner_id: user.id })

    if (error) return null

    // Fetch the board back (trigger has committed board_members by now)
    const { data: board } = await supabase
      .from('boards')
      .select()
      .eq('id', boardId)
      .single()

    if (!board) return null

    // Create default columns
    const defaultColumns = ['To Do', 'In Progress', 'Review', 'Done']
    const colInserts = defaultColumns.map((title, i) => ({
      board_id: board.id,
      title,
      position: i,
    }))

    const { data: cols } = await supabase
      .from('columns')
      .insert(colInserts)
      .select()

    set((state) => {
      const columnMap = { ...state.columns }
      ;(cols || []).forEach((c) => { columnMap[c.id] = c })
      return {
        boards: { ...state.boards, [board.id]: board },
        columns: columnMap,
        activeBoardId: board.id,
      }
    })

    return board.id
  },

  updateBoardIcon: async (boardId, icon) => {
    // Optimistic
    set((state) => ({
      boards: { ...state.boards, [boardId]: { ...state.boards[boardId], icon } },
    }))
    await supabase.from('boards').update({ icon }).eq('id', boardId)
  },

  renameBoard: async (boardId, name) => {
    set((state) => ({
      boards: { ...state.boards, [boardId]: { ...state.boards[boardId], name } },
    }))
    await supabase.from('boards').update({ name }).eq('id', boardId)
  },

  deleteBoard: async (boardId) => {
    set((state) => {
      const { [boardId]: _, ...restBoards } = state.boards
      const columns = {}
      const cards = {}
      Object.values(state.columns).forEach((c) => {
        if (c.board_id !== boardId) columns[c.id] = c
      })
      Object.values(state.cards).forEach((c) => {
        if (c.board_id !== boardId) cards[c.id] = c
      })
      const remainingIds = Object.keys(restBoards)
      return {
        boards: restBoards,
        columns,
        cards,
        activeBoardId:
          state.activeBoardId === boardId
            ? remainingIds[0] || null
            : state.activeBoardId,
      }
    })
    await supabase.from('boards').delete().eq('id', boardId)
  },

  // Board members (kept as simple name strings on cards for display,
  // actual members managed through board_members table)
  addBoardMember: async (boardId, name) => {
    // For now, this just adds name as assignee_name on the card level
    // Real member management is in BoardShareModal
  },

  removeBoardMember: async (boardId, name) => {
    // Handled through board_members table
  },

  // ============================================================
  // COLUMN ACTIONS
  // ============================================================
  addColumn: async (boardId, title) => {
    const boardColumns = Object.values(get().columns)
      .filter((c) => c.board_id === boardId)
    const position = boardColumns.length

    const { data: col } = await supabase
      .from('columns')
      .insert({ board_id: boardId, title, position })
      .select()
      .single()

    if (col) {
      set((state) => ({
        columns: { ...state.columns, [col.id]: col },
      }))
    }
  },

  renameColumn: async (boardId, columnId, title) => {
    set((state) => ({
      columns: { ...state.columns, [columnId]: { ...state.columns[columnId], title } },
    }))
    await supabase.from('columns').update({ title }).eq('id', columnId)
  },

  deleteColumn: async (boardId, columnId) => {
    set((state) => {
      const { [columnId]: _, ...restColumns } = state.columns
      const cards = {}
      Object.values(state.cards).forEach((c) => {
        if (c.column_id !== columnId) cards[c.id] = c
      })
      return { columns: restColumns, cards }
    })
    await supabase.from('columns').delete().eq('id', columnId)
  },

  // ============================================================
  // CARD ACTIONS
  // ============================================================
  addCard: async (boardId, columnId, cardData) => {
    const state = get()
    const board = state.boards[boardId]

    // Calculate positions
    const columnCards = Object.values(state.cards)
      .filter((c) => c.column_id === columnId)
    const position = columnCards.length

    const allCards = Object.values(state.cards)
    const globalNumber = allCards.reduce((max, c) => Math.max(max, c.global_task_number || 0), 0) + 1
    const taskNumber = board?.next_task_number || 1

    const cardInsert = {
      board_id: boardId,
      column_id: columnId,
      position,
      task_number: taskNumber,
      global_task_number: globalNumber,
      title: cardData.title || 'Untitled task',
      description: cardData.description || '',
      assignee_name: cardData.assignee || '',
      labels: cardData.labels || [],
      due_date: cardData.dueDate || null,
      priority: cardData.priority || 'medium',
      icon: cardData.icon || null,
      completed: cardData.completed || false,
      checklist: cardData.checklist || [],
    }

    const { data: card } = await supabase
      .from('cards')
      .insert(cardInsert)
      .select()
      .single()

    if (!card) return null

    // Increment board task number
    const { error: numError } = await supabase
      .from('boards')
      .update({ next_task_number: taskNumber + 1 })
      .eq('id', boardId)

    if (numError) {
      console.error('Failed to increment task number:', numError)
    }

    set((state) => ({
      cards: { ...state.cards, [card.id]: card },
      boards: {
        ...state.boards,
        [boardId]: { ...state.boards[boardId], next_task_number: taskNumber + 1 },
      },
    }))

    return card.id
  },

  updateCard: async (cardId, updates) => {
    // Map frontend field names to DB column names
    const dbUpdates = {}
    if ('title' in updates) dbUpdates.title = updates.title
    if ('description' in updates) dbUpdates.description = updates.description
    if ('assignee' in updates) dbUpdates.assignee_name = updates.assignee
    if ('assignee_name' in updates) dbUpdates.assignee_name = updates.assignee_name
    if ('priority' in updates) dbUpdates.priority = updates.priority
    if ('dueDate' in updates) dbUpdates.due_date = updates.dueDate
    if ('due_date' in updates) dbUpdates.due_date = updates.due_date
    if ('labels' in updates) dbUpdates.labels = updates.labels
    if ('checklist' in updates) dbUpdates.checklist = updates.checklist
    if ('icon' in updates) dbUpdates.icon = updates.icon
    if ('completed' in updates) dbUpdates.completed = updates.completed
    if ('column_id' in updates) dbUpdates.column_id = updates.column_id
    if ('position' in updates) dbUpdates.position = updates.position

    // Optimistic update
    set((state) => ({
      cards: {
        ...state.cards,
        [cardId]: { ...state.cards[cardId], ...dbUpdates, updated_at: new Date().toISOString() },
      },
    }))

    await supabase.from('cards').update(dbUpdates).eq('id', cardId)
  },

  completeCard: async (cardId) => {
    const card = get().cards[cardId]
    if (!card) return

    const newCompleted = !card.completed

    set((state) => ({
      cards: {
        ...state.cards,
        [cardId]: { ...state.cards[cardId], completed: newCompleted, updated_at: new Date().toISOString() },
      },
    }))

    await supabase.from('cards').update({ completed: newCompleted }).eq('id', cardId)
  },

  deleteCard: async (cardId) => {
    const prevCard = get().cards[cardId]

    // Optimistic delete
    set((state) => {
      const { [cardId]: _, ...restCards } = state.cards
      return { cards: restCards }
    })

    const { error } = await supabase.from('cards').delete().eq('id', cardId)

    // Rollback on failure
    if (error && prevCard) {
      set((state) => ({
        cards: { ...state.cards, [cardId]: prevCard },
      }))
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
        // Update positions in DB
        for (const { id, position } of dbBatch) {
          const { error } = await supabase.from('cards').update({ position }).eq('id', id)
          if (error) console.error('Failed to update card position:', error)
        }
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

      for (const update of dbBatch) {
        const { id, ...rest } = update
        const { error } = await supabase.from('cards').update(rest).eq('id', id)
        if (error) console.error('Failed to update card position:', error)
      }
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
    const state = get()
    for (const cardId of cardIds) {
      const card = state.cards[cardId]
      if (card) {
        const { error } = await supabase.from('cards').update({
          column_id: card.column_id,
          position: card.position,
          completed: card.completed,
        }).eq('id', cardId)
        if (error) console.error('Failed to persist card position:', error)
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
  // REAL-TIME SUBSCRIPTIONS
  // ============================================================
  subscribeToBoards: () => {
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
        // Skip card position updates during drag to prevent interference
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
      .subscribe()

    set({ subscriptions: [boardsSub] })
  },

  unsubscribeAll: () => {
    const { subscriptions } = get()
    subscriptions.forEach((sub) => supabase.removeChannel(sub))
    set({ subscriptions: [] })
  },
}))
