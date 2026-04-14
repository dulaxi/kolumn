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
      collapsedSpaces: {}, // { [workspaceId]: true } — persists workspace collapse state
      boardsCollapsed: false,
      sharedBoardsCollapsed: false,
      workspaceSidebarOpen: false,
      _sidebarBeforeWorkspace: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (val) => set({ sidebarCollapsed: val }),
      openWorkspaceSidebar: () => set((s) => ({
        workspaceSidebarOpen: true,
        _sidebarBeforeWorkspace: s.sidebarCollapsed,
        sidebarCollapsed: true,
      })),
      closeWorkspaceSidebar: () => set((s) => ({
        workspaceSidebarOpen: false,
        sidebarCollapsed: s._sidebarBeforeWorkspace,
      })),
      toggleWorkspaceSidebar: () => {
        const s = get()
        if (s.workspaceSidebarOpen) {
          set({ workspaceSidebarOpen: false, sidebarCollapsed: s._sidebarBeforeWorkspace })
        } else {
          set({ workspaceSidebarOpen: true, _sidebarBeforeWorkspace: s.sidebarCollapsed, sidebarCollapsed: true })
        }
      },
      toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),
      closeMobileMenu: () => set({ mobileMenuOpen: false }),
      setTheme: (theme) => {
        set({ theme })
        document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light')
      },
      setFont: (font) => set({ font }),
      toggleFavorite: (boardId) => {
        const favs = get().favoriteBoards
        const next = favs.includes(boardId)
          ? favs.filter((id) => id !== boardId)
          : [...favs, boardId]
        set({ favoriteBoards: next })
      },
      isFavorite: (boardId) => get().favoriteBoards.includes(boardId),
      toggleSpaceCollapsed: (workspaceId) => set((s) => {
        const next = { ...s.collapsedSpaces }
        if (next[workspaceId]) delete next[workspaceId]
        else next[workspaceId] = true
        return { collapsedSpaces: next }
      }),
      toggleBoardsCollapsed: () => set((s) => ({ boardsCollapsed: !s.boardsCollapsed })),
      toggleSharedBoardsCollapsed: () => set((s) => ({ sharedBoardsCollapsed: !s.sharedBoardsCollapsed })),
    }),
    {
      name: 'kolumn-settings',
    }
  )
)
