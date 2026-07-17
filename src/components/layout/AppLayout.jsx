import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import WorkspaceSidebar from './WorkspaceSidebar'
import Header from './Header'
import SearchDialog from '../SearchDialog'
import ShortcutsSheet from '../ShortcutsSheet'
import SettingsModal from '../settings/SettingsModal'
import BottomTabBar from './BottomTabBar'
import Button from '../ui/Button'
import InlineNotice from '../ui/InlineNotice'
import { useSettingsStore } from '../../store/settingsStore'
import { applyTheme } from '../../utils/theme'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useAppData } from '../../hooks/useAppData'
import { useBoardStore } from '../../store/boardStore'
import OfflineBanner from './OfflineBanner'
import InlineErrorBoundary from '../InlineErrorBoundary'

const pageTitles = {
  '/dashboard': 'Home',
  '/boards': 'Boards',
  '/build': 'Builder',
  '/workspace': 'Workspace',
}

export default function AppLayout() {
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed)
  const workspaceSidebarOpen = useSettingsStore((s) => s.workspaceSidebarOpen)
  const theme = useSettingsStore((s) => s.theme)
  const font = useSettingsStore((s) => s.font)
  const isDesktop = useIsDesktop()
  const location = useLocation()
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar)

  const [searchOpen, setSearchOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { showMigration, migrating, handleMigrate, handleSkipMigration } = useAppData()

  // Apply the resolved theme; while set to 'system', follow OS changes live.
  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [theme])

  // Public pages outside the app shell are pinned light (their CSS is not
  // dark-ready) — restore light when the shell unmounts.
  useEffect(() => () => applyTheme('light'), [])

  useEffect(() => {
    document.documentElement.style.removeProperty('font-family')
  }, [font])

  // Listen for global "open this dialog" events so menus can trigger them
  useEffect(() => {
    const openSearch = () => setSearchOpen(true)
    const openShortcuts = () => setShortcutsOpen(true)
    const openSettings = () => setSettingsOpen(true)
    window.addEventListener('kolumn:focus-search', openSearch)
    window.addEventListener('kolumn:open-shortcuts', openShortcuts)
    window.addEventListener('kolumn:open-settings', openSettings)
    return () => {
      window.removeEventListener('kolumn:focus-search', openSearch)
      window.removeEventListener('kolumn:open-shortcuts', openShortcuts)
      window.removeEventListener('kolumn:open-settings', openSettings)
    }
  }, [])

  // Global keyboard shortcuts.
  //
  // Search / sidebar / cheatsheet bindings are suppressed while one of
  // our dialogs is already on screen — otherwise pressing `/` while the
  // `?` sheet is open would stack a search modal on top. The `?` toggle
  // stays live so users can dismiss the sheet with the same key that
  // opened it.
  //
  // `n` (new card) and `Esc` (close panel) fire global custom events
  // that BoardsPage listens for. They live here so the listener is
  // installed once at the layout level instead of being re-installed
  // every time BoardsPage mounts.
  const aDialogIsOpen = searchOpen || shortcutsOpen || settingsOpen
  const onBoardsPage = location.pathname.startsWith('/boards')

  const shortcuts = useMemo(() => [
    { key: 'k', mod: true, when: () => !aDialogIsOpen, handler: (e) => { e.preventDefault(); setSearchOpen(true) } },
    { key: 'b', mod: true, when: () => !aDialogIsOpen, handler: (e) => { e.preventDefault(); toggleSidebar() } },
    { key: '/', when: () => !aDialogIsOpen, handler: (e) => { e.preventDefault(); setSearchOpen(true) } },
    { key: '?', shift: true, handler: (e) => { e.preventDefault(); setShortcutsOpen((v) => !v) } },
    {
      key: 'Escape',
      allowInInput: true,
      handler: () => {
        window.dispatchEvent(new CustomEvent('kolumn:close-panel'))
        const active = document.activeElement
        if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') active.blur()
      },
    },
    { key: 'n', when: () => onBoardsPage, handler: () => window.dispatchEvent(new CustomEvent('kolumn:new-card')) },
  ], [toggleSidebar, aDialogIsOpen, onBoardsPage])
  useKeyboardShortcuts(shortcuts)

  // Match the base path for title — on /boards, show the active board name
  const basePath = '/' + (location.pathname.split('/')[1] || '')
  const activeBoardName = useBoardStore((s) => s.boards[s.activeBoardId]?.name)
  const title = basePath === '/boards' && activeBoardName
    ? activeBoardName
    : pageTitles[basePath] || 'Kolumn'

  return (
    <div className="h-screen flex flex-col bg-[var(--surface-board)] overflow-hidden">
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ShortcutsSheet open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <OfflineBanner />
      <InlineErrorBoundary name="sidebar">
        <Sidebar />
      </InlineErrorBoundary>
      <WorkspaceSidebar />
      <div
        className={`flex-1 min-h-0 flex flex-col transition-all duration-200 ${
          isDesktop
            ? workspaceSidebarOpen
              ? 'ml-[calc(3rem+280px)]'
              // 287px isn't on the 4px spacing grid, but it must match
              // Sidebar.jsx's `w-[287px]` exactly — box-sizing is
              // border-box (Tailwind preflight), so that width already
              // includes the 1px border and this offset sits flush
              // against it with no gap or overlap. Keep both in sync if
              // either changes.
              : collapsed ? 'ml-12' : 'ml-[287px]'
            : 'ml-0'
        }`}
      >
        <InlineErrorBoundary name="header">
          <Header title={title} />
        </InlineErrorBoundary>
        {/* Page heading — OUTSIDE the scroll container so it stays pinned.
            /boards owns its own heading row (inline with Share/Sort/Filter). */}
        {isDesktop && !['/dashboard', '/workspace', '/boards', '/build', '/chat'].includes(basePath) && (
          <div className="shrink-0 px-4 sm:px-8 w-full max-w-4xl mx-auto">
            <header className="flex items-end h-9 md:h-9 shrink-0 mb-6">
              <h1 className="font-heading text-3xl tracking-tight text-[var(--text-primary)] flex items-center gap-2 min-w-0">
                <span className="truncate">{title}</span>
              </h1>
            </header>
          </div>
        )}
        <main className={`flex-1 min-h-0 flex flex-col ${basePath === '/boards' ? 'px-4 sm:px-8' : 'px-4 sm:px-8 pb-12 max-w-4xl mx-auto overflow-y-auto w-full subtle-scrollbar'} ${!isDesktop ? 'pb-20' : ''}`}>
          {/* Migration banner */}
          {showMigration && (
            <InlineNotice variant="success" className="mb-4 justify-between font-sans">
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)]">Local data detected</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Import your existing boards and notes into your account?
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={handleSkipMigration}>Skip</Button>
                <Button variant="secondary" size="sm" onClick={handleMigrate} disabled={migrating} loading={migrating} loadingText="Importing">
                  Import data
                </Button>
              </div>
            </InlineNotice>
          )}
          <Outlet />
        </main>
        <BottomTabBar />
      </div>
    </div>
  )
}
