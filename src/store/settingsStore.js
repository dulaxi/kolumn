import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      theme: 'default',
      font: 'mona-sans',
      mobileMenuOpen: false,
      favoriteBoards: [],
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),
      closeMobileMenu: () => set({ mobileMenuOpen: false }),
      setTheme: (theme) => set({ theme }),
      setFont: (font) => set({ font }),
      toggleFavorite: (boardId) => {
        const favs = get().favoriteBoards
        const next = favs.includes(boardId)
          ? favs.filter((id) => id !== boardId)
          : [...favs, boardId]
        set({ favoriteBoards: next })
      },
      isFavorite: (boardId) => get().favoriteBoards.includes(boardId),
    }),
    {
      name: 'gambit-settings',
    }
  )
)
