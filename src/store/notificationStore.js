import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { logError } from '../utils/logger'

// Debounce guard for realtime reconnect — prevents concurrent reconnect races
let reconnectTimer = null
let lastUserId = null
// Single-lineage bookkeeping: assumes ONE concurrent subscriber (wired once
// in useAppData). A second caller's teardown would kill the first's channel —
// if that ever becomes a need, lift this into per-subscription state.
let activeChannel = null
function scheduleReconnect() {
  if (reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    if (lastUserId) useNotificationStore.getState().subscribeToNotifications(lastUserId)
  }, 3000)
}

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  error: null,

  clearError: () => set({ error: null }),

  fetchNotifications: async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) {
      logError('Failed to fetch notifications:', error)
      set({ error: { message: error.message, action: 'fetchNotifications' } })
      return
    }

    const items = data || []
    set({
      notifications: items,
      unreadCount: items.filter((n) => !n.read).length,
      error: null,
    })
  },

  markAsRead: async (notificationId) => {
    const prev = get().notifications
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      )
      return { notifications: updated, unreadCount: updated.filter((n) => !n.read).length }
    })
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
    if (error) {
      logError('Failed to mark notification read:', error)
      set({ notifications: prev, unreadCount: prev.filter((n) => !n.read).length })
    }
  },

  markAllAsRead: async () => {
    const unread = get().notifications.filter((n) => !n.read)
    if (unread.length === 0) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const prev = get().notifications
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }))
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
    if (error) {
      logError('Failed to mark all notifications read:', error)
      set({ notifications: prev, unreadCount: prev.filter((n) => !n.read).length })
    }
  },

  // Create a notification for another user
  notify: async ({ userId, type, title, body, cardId, boardId, actorName }) => {
    // Don't notify yourself
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id === userId) return

    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      body,
      card_id: cardId || null,
      board_id: boardId || null,
      actor_name: actorName || '',
    })
    if (error) logError('Failed to create notification:', error)
  },

  subscribeToNotifications: (userId) => {
    if (!userId) return () => {}

    lastUserId = userId

    // Remove any previous channel first — a reconnect must not stack
    // channels on top of a still-live one.
    if (activeChannel) {
      supabase.removeChannel(activeChannel)
      activeChannel = null
    }

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const item = payload.new
          set((state) => ({
            notifications: [item, ...state.notifications].slice(0, 30),
            unreadCount: state.unreadCount + 1,
          }))
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logError('Realtime notifications subscription error:', err)
          scheduleReconnect()
        }
      })

    activeChannel = channel

    return () => {
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
      lastUserId = null
      // Act on the module-scoped activeChannel, not the closed-over `channel`
      // local — a reconnect may have already swapped in a newer channel by
      // the time this teardown runs, and we must remove whichever is live.
      if (activeChannel) {
        supabase.removeChannel(activeChannel)
        activeChannel = null
      }
    }
  },
}))
