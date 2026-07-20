import { showToast } from '../../../utils/toast'
import { supabase } from '../../../lib/supabase'
import { createRateLimiter } from '../../../utils/rateLimit'
import { logError } from '../../../utils/logger'
import { logActivity } from '../helpers'

const uploadLimiter = createRateLimiter(5, 30000)        // 5 uploads per 30s

export const createAttachmentsSlice = (set, get) => ({
  attachments: {},

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
})
