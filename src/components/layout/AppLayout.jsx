import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import WorkspaceSidebar from './WorkspaceSidebar'
import Header from './Header'
import SearchDialog from '../SearchDialog'
import BottomTabBar from './BottomTabBar'
import { useSettingsStore } from '../../store/settingsStore'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { useAuthStore } from '../../store/authStore'
import { useBoardStore } from '../../store/boardStore'
import { useNoteStore } from '../../store/noteStore'
import { useBoardSharingStore } from '../../store/boardSharingStore'
import { useWorkspacesStore } from '../../store/workspacesStore'
import { useNotificationStore } from '../../store/notificationStore'
import { hasLocalData, migrateLocalData } from '../../lib/migrateLocalData'
import { showToast } from '../../utils/toast'
import OfflineBanner from './OfflineBanner'
import InlineErrorBoundary from '../InlineErrorBoundary'

const pageTitles = {
  '/dashboard': 'Home',
  '/boards': 'Boards',
  '/calendar': 'Calendar',
  '/notes': 'Notes',
  '/workspace': 'Workspace',
  '/settings': 'Settings',
}

export default function AppLayout() {
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed)
  const workspaceSidebarOpen = useSettingsStore((s) => s.workspaceSidebarOpen)
  const theme = useSettingsStore((s) => s.theme)
  const font = useSettingsStore((s) => s.font)
  const isDesktop = useIsDesktop()
  const [searchOpen, setSearchOpen] = useState(false)

  // Open search dialog from sidebar or Ctrl+K
  useEffect(() => {
    const openSearch = () => setSearchOpen(true)
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true) }
    }
    window.addEventListener('kolumn:focus-search', openSearch)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('kolumn:focus-search', openSearch)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const fetchBoards = useBoardStore((s) => s.fetchBoards)
  const spawnRecurringTasks = useBoardStore((s) => s.spawnRecurringTasks)
  const subscribeToBoards = useBoardStore((s) => s.subscribeToBoards)
  const unsubscribeAll = useBoardStore((s) => s.unsubscribeAll)
  const fetchNotes = useNoteStore((s) => s.fetchNotes)
  const fetchInvitations = useBoardSharingStore((s) => s.fetchInvitations)
  const fetchSharedBoards = useBoardSharingStore((s) => s.fetchSharedBoards)
  const fetchWorkspaces = useWorkspacesStore((s) => s.fetchWorkspaces)
  const fetchWorkspaceInvitations = useWorkspacesStore((s) => s.fetchInvitations)
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications)
  const subscribeToNotifications = useNotificationStore((s) => s.subscribeToNotifications)
  const [showMigration, setShowMigration] = useState(false)
  const remindersShown = useRef(false)
  const [migrating, setMigrating] = useState(false)

  useEffect(() => {
    if (theme !== 'default') {
      document.documentElement.setAttribute('data-theme', theme)
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    return () => document.documentElement.removeAttribute('data-theme')
  }, [theme])

  useEffect(() => {
    document.documentElement.style.removeProperty('font-family')
  }, [font])

  // Fetch data and set up real-time when authenticated
  useEffect(() => {
    if (!user) return

    let cancelled = false

    // Each fetch is independent — use allSettled so one failure doesn't block others
    const loadAllData = () => Promise.allSettled([
      fetchBoards(),
      fetchNotes(),
      fetchInvitations(),
      fetchSharedBoards(),
      fetchWorkspaces(),
      fetchWorkspaceInvitations(),
      fetchNotifications(),
    ])

    // Initial fetch + subscriptions
    loadAllData().then((results) => {
      if (cancelled) return

      // Subscribe to realtime AFTER data is loaded to avoid stale overwrites
      subscribeToBoards()

      spawnRecurringTasks()

      // Due date reminders — run once per session, only if boards fetched successfully
      const boardsFetchOk = results[0]?.status === 'fulfilled'
      if (remindersShown.current || !boardsFetchOk) return
      remindersShown.current = true
      const profile = useAuthStore.getState().profile
      const displayName = profile?.display_name || ''
      const cards = useBoardStore.getState().cards
      const now = new Date()
      const todayStr = now.toISOString().split('T')[0]

      let overdue = 0
      let dueToday = 0
      Object.values(cards).forEach((card) => {
        if (card.completed || card.archived || !card.due_date) return
        if (displayName) {
          const names = (card.assignees && card.assignees.length)
            ? card.assignees
            : (card.assignee_name ? [card.assignee_name] : [])
          if (!names.includes(displayName)) return
        }
        const dueDateStr = card.due_date.split('T')[0]
        if (dueDateStr < todayStr) overdue++
        else if (dueDateStr === todayStr) dueToday++
      })

      if (overdue > 0) {
        showToast.overdue(`You have ${overdue} overdue task${overdue > 1 ? 's' : ''}`)
      }
      if (dueToday > 0) {
        showToast.warn(`${dueToday} task${dueToday > 1 ? 's' : ''} due today`)
      }
    })

    const unsubNotifications = subscribeToNotifications(user.id)

    // Check for local data migration
    if (hasLocalData()) {
      setShowMigration(true)
    }

    return () => {
      cancelled = true
      unsubscribeAll()
      unsubNotifications()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleMigrate = async () => {
    setMigrating(true)
    await migrateLocalData()
    await fetchBoards()
    await fetchNotes()
    setMigrating(false)
    setShowMigration(false)
  }

  const handleSkipMigration = () => {
    setShowMigration(false)
  }

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable

      // Cmd/Ctrl+K — focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const searchInput = document.querySelector('header input[type="text"]')
        if (searchInput) searchInput.focus()
        return
      }

      // Esc — close detail panel / blur search
      if (e.key === 'Escape') {
        window.dispatchEvent(new CustomEvent('kolumn:close-panel'))
        const active = document.activeElement
        if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') {
          active.blur()
        }
        return
      }

      if (isTyping) return

      // N — new card (only on boards page)
      if (e.key === 'n' && location.pathname.startsWith('/boards')) {
        window.dispatchEvent(new CustomEvent('kolumn:new-card'))
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [location.pathname])

  // Match the base path for title — on /boards, show the active board name
  const basePath = '/' + (location.pathname.split('/')[1] || '')
  const activeBoardId = useBoardStore((s) => s.activeBoardId)
  const activeBoardName = useBoardStore((s) => s.boards[s.activeBoardId]?.name)
  const title = basePath === '/boards' && activeBoardName
    ? activeBoardName
    : pageTitles[basePath] || 'Kolumn'

  return (
    <div className="h-screen flex flex-col bg-[var(--surface-board)] overflow-hidden">
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
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
              : collapsed ? 'ml-12' : 'ml-[287px]'
            : 'ml-0'
        }`}
      >
        <InlineErrorBoundary name="header">
          <Header title={title} />
        </InlineErrorBoundary>
        {/* Page heading — OUTSIDE the scroll container so it stays pinned.
            /boards owns its own heading row (inline with Share/Sort/Filter). */}
        {isDesktop && !['/dashboard', '/workspace', '/boards'].includes(basePath) && (
          <div className="shrink-0 px-4 sm:px-8 max-w-4xl mx-auto w-full">
            <header className="flex items-end h-8 md:h-8 shrink-0 mb-[26px]">
              <h1 className="font-heading text-2xl text-[var(--text-primary)] flex items-center gap-2 min-w-0">
                <span className="truncate">{title}</span>
              </h1>
            </header>
          </div>
        )}
        <main className={`flex-1 min-h-0 flex flex-col ${['/boards', '/calendar', '/notes'].includes(basePath) ? 'px-4 sm:px-8 pb-12' : 'px-4 sm:px-8 pb-12 max-w-4xl mx-auto overflow-y-auto w-full subtle-scrollbar'} ${!isDesktop ? 'pb-20' : ''}`}>
          {/* Migration banner */}
          {showMigration && (
            <div className="mb-4 bg-[var(--accent-lime-wash)] border border-[#C2D64A] rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Local data detected</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Import your existing boards and notes into your account?
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSkipMigration}
                  className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleMigrate}
                  disabled={migrating}
                  className="px-3 py-1.5 text-xs font-medium bg-[var(--text-primary)] text-white rounded-lg hover:bg-[#333] disabled:opacity-50 transition-colors"
                >
                  {migrating ? 'Importing...' : 'Import data'}
                </button>
              </div>
            </div>
          )}
          <Outlet />
        </main>
        <BottomTabBar />
      </div>
    </div>
  )
}
