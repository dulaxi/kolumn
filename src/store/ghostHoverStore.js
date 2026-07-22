import { create } from 'zustand'

// Ephemeral: which card is hovered for a ghost peek. Never persisted.
export const useGhostHoverStore = create((set) => ({
  hoverCardId: null,
  setHoverCard: (id) => set({ hoverCardId: id }),
  clearHoverCard: () => set({ hoverCardId: null }),
}))
