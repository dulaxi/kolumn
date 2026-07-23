import { create } from 'zustand'

// How long the cursor must rest on a card before its ghost is summoned.
// Casual mouse travel across a column fires enter/leave per card; without
// this dwell every crossing shoves the layout (ghost slot grow + snap).
// 180ms is under perception-as-lag but over sweep-transit time per card.
export const GHOST_HOVER_DWELL_MS = 180

let dwellTimer = null

// Ephemeral: which card is hovered for a ghost peek. Never persisted.
// setHoverCard defers the commit by the dwell; re-entering another card
// restarts the clock, leaving cancels it. clearHoverCard is immediate —
// exits should feel tidy, not laggy.
export const useGhostHoverStore = create((set) => ({
  hoverCardId: null,
  setHoverCard: (id) => {
    clearTimeout(dwellTimer)
    dwellTimer = setTimeout(() => set({ hoverCardId: id }), GHOST_HOVER_DWELL_MS)
  },
  clearHoverCard: () => {
    clearTimeout(dwellTimer)
    set({ hoverCardId: null })
  },
}))
