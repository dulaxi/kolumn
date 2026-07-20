import { showToast } from '../../../utils/toast'
import { supabase } from '../../../lib/supabase'
import { createRateLimiter, sanitizeTitle } from '../../../utils/rateLimit'
import { logError } from '../../../utils/logger'
import { columnInsertSchema } from '../../../utils/schemas'
import { undoableDelete } from '../helpers'

const columnCreateLimiter = createRateLimiter(10, 10000) // 10 columns per 10s

export const createColumnsSlice = (set, get) => ({
  columns: {},

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

  getColumnCards: (columnId) => {
    return Object.values(get().cards)
      .filter((c) => c.column_id === columnId)
      .sort((a, b) => a.position - b.position)
  },
})
