import { showToast } from '../../../utils/toast'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../authStore'
import { createRateLimiter, sanitizeText } from '../../../utils/rateLimit'
import { logError } from '../../../utils/logger'
import { commentInsertSchema } from '../../../utils/schemas'

const commentLimiter = createRateLimiter(10, 10000)      // 10 comments per 10s

export const createCommentsSlice = (set, get) => ({
  comments: {},
  activity: {},

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
})
