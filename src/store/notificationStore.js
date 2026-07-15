import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { logError } from '../utils/logger'

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
      .subscribe()

    return () => supabase.removeChannel(channel)
  },
}))
