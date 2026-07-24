import toast from 'react-hot-toast'
import { showToast } from '../../utils/toast'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../authStore'
import { logError } from '../../utils/logger'

export const ACTIVE_BOARD_KEY = 'kolumn_active_board'

// Cards with a local write in flight. Realtime echoes for these are skipped so
// a stale echo (including the echo of the user's own earlier write) can't
// clobber a newer optimistic edit. See the 2026-07-20 architecture audit.
// SHARED single instance: cardsSlice adds/removes ids, mergeCardEcho reads it.
export const _inFlightCards = new Set()

// Apply a realtime card change, guarding against stale/echo overwrites.
// Returns a partial state for zustand's set() ({} = no-op).
export function mergeCardEcho(state, payload) {
  if (payload.eventType === 'DELETE') {
    const { [payload.old.id]: _, ...rest } = state.cards
    return { cards: rest }
  }
  const card = payload.new
  if (_inFlightCards.has(card.id)) return {}
  const existing = state.cards[card.id]
  // Drop an echo that is older than what we already hold locally.
  if (existing?.updated_at && card.updated_at &&
      new Date(card.updated_at) < new Date(existing.updated_at)) {
    return {}
  }
  return { cards: { ...state.cards, [card.id]: card } }
}

// Bound the temp→real id map so long AI sessions don't grow it without limit.
// Object key order is insertion order, so this keeps the most recent entries.
export function pruneTempIdMap(map, keep = 50) {
  const keys = Object.keys(map)
  if (keys.length <= keep) return map
  return Object.fromEntries(keys.slice(keys.length - keep).map((k) => [k, map[k]]))
}

// Undo-able delete: removes from UI, shows a toast with an Undo button,
// waits 5s, then commits the DB delete unless the user clicks Undo.
export function undoableDelete(message) {
  return new Promise((resolve) => {
    let settled = false
    const id = String(Date.now())

    showToast.delete(message, { duration: 5000, id })

    // Inject an Undo button into the toast after it renders using safe DOM methods
    setTimeout(() => {
      const containers = document.querySelectorAll('[role="status"]')
      containers.forEach((c) => {
        if (c.textContent.includes(message) && !c.querySelector(`[data-undo-id]`)) {
          const btn = document.createElement('button')
          btn.setAttribute('data-undo-id', id)
          btn.style.cssText = 'color:#FAF8F6;background:none;border:none;cursor:pointer;margin-left:auto;display:flex;align-items:center;opacity:0.8'
          btn.onmouseenter = () => { btn.style.opacity = 1 }
          btn.onmouseleave = () => { btn.style.opacity = 0.8 }
          const ico = document.createElement('i')
          ico.className = 'ph ph-arrow-counter-clockwise'
          ico.style.cssText = 'font-size:18px;line-height:18px'
          btn.appendChild(ico)
          c.style.display = 'flex'
          c.style.alignItems = 'center'
          c.style.gap = '4px'
          c.appendChild(btn)
        }
      })
    }, 50)

    // Listen for undo click (dispatched from UndoListener in App.jsx)
    const handler = () => {
      if (settled) return
      settled = true
      toast.dismiss(id)
      resolve(false)
    }
    window.addEventListener(`kolumn:undo:${id}`, handler, { once: true })

    setTimeout(() => {
      window.removeEventListener(`kolumn:undo:${id}`, handler)
      if (!settled) { settled = true; resolve(true) }
    }, 5000)
  })
}

// Fire-and-forget activity logger — never blocks the calling action.
// v2: resolves board_id (required by RLS + the board feed) and snapshots
// the card's identity into meta so rows can render their card chip after
// the card is deleted (card_id nulls out on delete).
export async function logActivity(cardId, action, detail, meta = null, boardIdOverride = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const profile = useAuthStore.getState().profile
    const actorName = profile?.display_name || user.email || 'Unknown'
    // Dynamic import: helpers.js is imported by the slices that compose the
    // store, so a static import of '../index' here would be circular.
    const { useBoardStore } = await import('./index')
    const card = cardId ? useBoardStore.getState().cards[cardId] : null
    const boardId = boardIdOverride || card?.board_id
    if (!boardId) return
    const snapshot = card ? { card_title: card.title, card_icon: card.icon || null } : {}
    const mergedMeta = { ...snapshot, ...(meta || {}) }
    await supabase.from('card_activity').insert({
      card_id: cardId,
      board_id: boardId,
      user_id: user.id,
      actor_name: actorName,
      action,
      detail,
      ...(Object.keys(mergedMeta).length ? { meta: mergedMeta } : {}),
    })
  } catch (err) {
    // Activity logging should never break the main flow
    logError('logActivity failed:', err)
  }
}
