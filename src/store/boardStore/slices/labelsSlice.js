import { showToast } from '../../../utils/toast'
import { supabase } from '../../../lib/supabase'
import { logError } from '../../../utils/logger'

export const createLabelsSlice = (set, get) => ({
  labels: {},
  cardLabels: {},

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
})
