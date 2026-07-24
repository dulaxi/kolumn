import { supabase } from '../../../lib/supabase'
import { logError } from '../../../utils/logger'
import { PAGE_SIZE } from '../../../constants/activity'

// Board-level activity feed. Fetched on modal open (no realtime in v1).
export const createActivitySlice = (set, get) => ({
  boardActivity: {},

  // Fresh fetch replaces the board's list; { before } pages older rows and
  // appends. Returns the number of rows fetched so the caller can decide
  // whether a "Show more" is worth offering (< PAGE_SIZE = end of history).
  fetchBoardActivity: async (boardId, { before } = {}) => {
    if (!boardId || boardId === '__all__') return 0
    try {
      let q = supabase
        .from('card_activity')
        .select('*')
        .eq('board_id', boardId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)
      if (before) q = q.lt('created_at', before)
      const { data, error } = await q
      if (error) { logError('fetchBoardActivity failed:', error); return 0 }
      const rows = data || []
      set((s) => ({
        boardActivity: {
          ...s.boardActivity,
          [boardId]: before ? [...(s.boardActivity[boardId] || []), ...rows] : rows,
        },
      }))
      return rows.length
    } catch (err) {
      logError('fetchBoardActivity failed:', err)
      return 0
    }
  },
})
