import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { logError } from '../utils/logger'
import { derivePresence } from './presence'

// Ephemeral per-board presence via Supabase Realtime Presence. Owns the channel
// lifecycle; never persists. `self` = { user_id, name, color, icon }.
export const usePresenceStore = create((set, get) => ({
  members: [],
  byCard: {},
  boardId: null,
  _channel: null,
  _self: null,

  joinBoard: (boardId, self) => {
    if (get().boardId === boardId) return
    get().leaveBoard()
    if (!boardId || boardId === '__all__' || !self?.user_id) return

    const channel = supabase.channel(`presence-board-${boardId}`, {
      config: { presence: { key: self.user_id } },
    })
    const sync = () => set(derivePresence(channel.presenceState()))
    channel
      .on('presence', { event: 'sync' }, sync)
      .on('presence', { event: 'join' }, sync)
      .on('presence', { event: 'leave' }, sync)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') channel.track({ ...self, card_id: null }).catch(() => {})
      })

    set({ boardId, _channel: channel, _self: self, members: [], byCard: {} })
  },

  setViewingCard: (cardId) => {
    const { _channel, _self } = get()
    if (_channel && _self) _channel.track({ ..._self, card_id: cardId || null }).catch(() => {})
  },

  leaveBoard: () => {
    const { _channel } = get()
    if (_channel) {
      try { _channel.untrack() } catch (err) { logError('presence untrack failed:', err) }
      supabase.removeChannel(_channel)
    }
    set({ boardId: null, _channel: null, _self: null, members: [], byCard: {} })
  },
}))
