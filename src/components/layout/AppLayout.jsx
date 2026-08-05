import { useEffect, useMemo, useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import WorkspaceSidebar from './WorkspaceSidebar'
import Header from './Header'
import { HeaderSlotProvider } from './headerSlot'
import SearchDialog from '../SearchDialog'
import ShortcutsSheet from '../ShortcutsSheet'
import SettingsModal from '../settings/SettingsModal'
import CreateBoardModal from '../board/CreateBoardModal'
import BottomTabBar from './BottomTabBar'
import Button from '../ui/Button'
import InlineNotice from '../ui/InlineNotice'
import { useSettingsStore } from '../../store/settingsStore'
import { useAuthStore } from '../../store/authStore'
import { applyTheme } from '../../utils/theme'
import { applyMotion } from '../../utils/motion'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useAppData } from '../../hooks/useAppData'
import { useBoardStore } from '../../store/boardStore'
import { resumeStep } from '../../lib/onboardingSteps'
import OfflineBanner from './OfflineBanner'
import InlineErrorBoundary from '../InlineErrorBoundary'

const pageTitles = {
  '/dashboard': 'Home',
  '/boards': 'Boards',
  '/build': 'Builder',
  '/workspace': 'Workspace',
}

export default function AppLayout() {
  const profile = useAuthStore((s) => s.profile)
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed)
  const workspaceSidebarOpen = useSettingsStore((s) => s.workspaceSidebarOpen)
  const theme = useSettingsStore((s) => s.theme)
  const motion = useSettingsStore((s) => s.motion)
  const font = useSettingsStore((s) => s.font)
  const isDesktop = useIsDesktop()
  const location = useLocation()
  const navigate = useNavigate()
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar)

  const [searchOpen, setSearchOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsSection, setSettingsSection] = useState('general')
  // null | { workspaceId } — create-board modal opens over whatever page
  // you're on (no pre-navigation); only after creation do we go to /boards.
  const [createBoard, setCreateBoard] = useState(null)

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
    applyMotion(motion)
  }, [motion])

  useEffect(() => {
    document.documentElement.style.removeProperty('font-family')
  }, [font])

  // Listen for global "open this dialog" events so menus can trigger them
  useEffect(() => {
    const openSearch = () => setSearchOpen(true)
    const openShortcuts = () => setShortcutsOpen(true)
    const openSettings = (e) => {
      setSettingsSection(e?.detail?.section || 'general')
      setSettingsOpen(true)
    }
    const openCreateBoard = (e) => {
      setCreateBoard({ workspaceId: e?.detail?.workspaceId || null })
    }
    window.addEventListener('kolumn:focus-search', openSearch)
    window.addEventListener('kolumn:open-shortcuts', openShortcuts)
    window.addEventListener('kolumn:open-settings', openSettings)
    window.addEventListener('kolumn:create-board', openCreateBoard)
    return () => {
      window.removeEventListener('kolumn:focus-search', openSearch)
      window.removeEventListener('kolumn:open-shortcuts', openShortcuts)
      window.removeEventListener('kolumn:open-settings', openSettings)
      window.removeEventListener('kolumn:create-board', openCreateBoard)
    }
  }, [])

  // Reopen Settings after returning from a focused route that lives outside
  // this layout (e.g. the /plans page's Back button). That route unmounts
  // AppLayout, so a same-tick custom event would land before this listener
  // exists — a sessionStorage breadcrumb survives the remount instead.
  useEffect(() => {
    const pane = sessionStorage.getItem('kolumn:reopen-settings')
    if (pane) {
      sessionStorage.removeItem('kolumn:reopen-settings')
      setSettingsSection(pane)
      setSettingsOpen(true)
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
  const aDialogIsOpen = searchOpen || shortcutsOpen || settingsOpen || !!createBoard
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
  // /chat/:id uses the wide project-page layout (conversation + card rail);
  // the /chat list keeps the narrow reading column. Filter(Boolean) so a
  // trailing slash on the bare list route (/chat/) doesn't misclassify as detail.
  const isChatDetail = basePath === '/chat' && location.pathname.split('/').filter(Boolean).length > 1
  const activeBoardName = useBoardStore((s) => s.boards[s.activeBoardId]?.name)
  const title = basePath === '/boards' && activeBoardName
    ? activeBoardName
    : pageTitles[basePath] || 'Kolumn'

  // Un-onboarded profiles (new OAuth signups, abandoned flows) finish
  // onboarding before seeing the shell. Existing users are backfilled.
  // Must come after every hook above — never between hooks.
  if (profile && !profile.onboarded_at) {
    return <Navigate to={`/onboarding?step=${resumeStep(profile)}`} replace />
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--surface-board)] overflow-hidden">
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ShortcutsSheet open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} initialSection={settingsSection} />
      {createBoard && (
        <CreateBoardModal
          workspaceId={createBoard.workspaceId}
          onClose={() => setCreateBoard(null)}
          onCreated={() => navigate('/boards')}
        />
      )}
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
        <HeaderSlotProvider>
        <InlineErrorBoundary name="header">
          <Header title={title} />
        </InlineErrorBoundary>
        {/* Page heading — OUTSIDE the scroll container so it stays pinned.
            /boards owns its own heading row (inline with Share/Sort/Filter). */}
        {isDesktop && !['/dashboard', '/workspace', '/boards', '/build', '/chat'].includes(basePath) && (
          <div className="shrink-0 px-4 sm:px-8 w-full max-w-4xl mx-auto">
            <header className="flex items-end h-9 md:h-9 shrink-0 mb-6">
              <h1 className="font-heading font-[425] text-3xl tracking-tight text-[var(--text-primary)] flex items-center gap-2 min-w-0">
                <span className="truncate">{title}</span>
              </h1>
            </header>
          </div>
        )}
        <main className={`flex-1 min-h-0 flex flex-col ${basePath === '/boards' ? 'px-4 sm:px-8' : `px-4 sm:px-8 pb-12 ${isChatDetail ? 'max-w-7xl' : 'max-w-4xl'} mx-auto overflow-y-auto w-full subtle-scrollbar`} ${isDesktop && basePath === '/boards' ? 'pt-[18px]' : ''} ${!isDesktop ? 'pb-20' : ''}`}>
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
        </HeaderSlotProvider>
        <BottomTabBar />
      </div>
    </div>
  )
}
