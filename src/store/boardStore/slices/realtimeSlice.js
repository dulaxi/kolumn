import { supabase } from '../../../lib/supabase'
import { logError } from '../../../utils/logger'
import { guardRealtimeSetup } from '../../../lib/realtimeGuard'
import { mergeCardEcho } from '../helpers'

// Debounce guard for realtime reconnect — prevents concurrent reconnect races.
// Module-level (single store instance); cleared by unsubscribeAll / resetStore.
let reconnectTimer = null

export const createRealtimeSlice = (set, get) => {
  function scheduleReconnect() {
    if (reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      if (get().subscriptions.length > 0) get().subscribeToBoards()
    }, 3000)
  }

  return {
    subscriptions: [],

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
  }
}
