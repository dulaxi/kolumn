import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { applyTheme } from '../utils/theme'
import { applyMotion } from '../utils/motion'

// v0 → v1: the theme setting used 'default' to mean light; it is now an
// explicit 'system' | 'light' | 'dark'. Persisted 'default' becomes 'light'
// (preserving the user's effective theme rather than switching them to
// system-following behavior they never chose).
export function migrateSettingsState(persistedState) {
  if (persistedState?.theme === 'default') {
    return { ...persistedState, theme: 'light' }
  }
  return persistedState
}

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      theme: 'system',
      motion: 'system', // 'system' | 'full' | 'reduced' — see utils/motion.js
      font: 'mona-sans',
      mobileMenuOpen: false,
      favoriteBoards: [],
      collapsedSpaces: {}, // { [workspaceId]: true } — persists workspace collapse state
      boardsCollapsed: false,
      sharedBoardsCollapsed: false,
      labelStyle: 'default',
      iconStyle: 'boxed',
      workspaceSidebarOpen: false,
      _sidebarBeforeWorkspace: false,
      ghostBoards: {}, // { [boardId]: true } — per-board "ghost mode" armed state
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
        applyTheme(theme)
      },
      setMotion: (motion) => {
        set({ motion })
        applyMotion(motion)
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
      // Cycle through the three label render styles on tap:
      //   default (/text prose) → alt (outline pill) → dot (color dot) → …
      toggleLabelStyle: () => set((s) => {
        const next = { default: 'alt', alt: 'dot', dot: 'default' }
        return { labelStyle: next[s.labelStyle] || 'alt' }
      }),
      toggleIconStyle: () => set((s) => ({ iconStyle: s.iconStyle === 'plain' ? 'boxed' : 'plain' })),
      toggleGhostMode: (boardId) => set((s) => {
        const next = { ...s.ghostBoards }
        if (next[boardId]) delete next[boardId]
        else next[boardId] = true
        return { ghostBoards: next }
      }),
      isGhostArmed: (boardId) => !!get().ghostBoards[boardId],
    }),
    {
      name: 'kolumn-settings',
      version: 1,
      migrate: migrateSettingsState,
    }
  )
)
