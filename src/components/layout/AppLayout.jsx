import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import BottomTabBar from './BottomTabBar'
import { useSettingsStore } from '../../store/settingsStore'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { useAuthStore } from '../../store/authStore'
import { useBoardStore } from '../../store/boardStore'
import { useNoteStore } from '../../store/noteStore'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { useNotificationStore } from '../../store/notificationStore'
import { hasLocalData, migrateLocalData } from '../../lib/migrateLocalData'
import { showToast } from '../../utils/toast'
import OfflineBanner from './OfflineBanner'
import InlineErrorBoundary from '../InlineErrorBoundary'

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/boards': 'Boards',
  '/calendar': 'Calendar',
  '/notes': 'Notes',
  '/workspace': 'Workspace',
  '/settings': 'Settings',
}

export default function AppLayout() {
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed)
  const theme = useSettingsStore((s) => s.theme)
  const font = useSettingsStore((s) => s.font)
  const isDesktop = useIsDesktop()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const fetchBoards = useBoardStore((s) => s.fetchBoards)
  const spawnRecurringTasks = useBoardStore((s) => s.spawnRecurringTasks)
  const subscribeToBoards = useBoardStore((s) => s.subscribeToBoards)
  const unsubscribeAll = useBoardStore((s) => s.unsubscribeAll)
  const fetchNotes = useNoteStore((s) => s.fetchNotes)
  const fetchInvitations = useWorkspaceStore((s) => s.fetchInvitations)
  const fetchSharedBoards = useWorkspaceStore((s) => s.fetchSharedBoards)
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
      fetchNotifications(),
    ])

    // Initial fetch + subscriptions
    loadAllData().then(() => {
      if (cancelled) return

      // Subscribe to realtime AFTER data is loaded to avoid stale overwrites
      subscribeToBoards()

      spawnRecurringTasks()

      // Due date reminders — run once per session
      if (remindersShown.current) return
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
        if (displayName && card.assignee_name !== displayName) return
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

    const unsubNotifications = subscribeToNotifications()

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
    <div className="min-h-screen bg-white">
      <OfflineBanner />
      <InlineErrorBoundary name="sidebar">
        <Sidebar />
      </InlineErrorBoundary>
      <div
        className={`transition-all duration-200 ${
          isDesktop ? (collapsed ? 'ml-16' : 'ml-60') : 'ml-0'
        }`}
      >
        <InlineErrorBoundary name="header">
          <Header title={title} />
        </InlineErrorBoundary>
        <main className={`p-4 sm:p-6 ${!isDesktop ? 'pb-20' : ''}`}>
          {/* Migration banner */}
          {showMigration && (
            <div className="mb-4 bg-[#EEF2D6] border border-[#C2D64A] rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#1B1B18]">Local data detected</p>
                <p className="text-xs text-[#5C5C57] mt-0.5">
                  Import your existing boards and notes into your account?
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSkipMigration}
                  className="px-3 py-1.5 text-xs font-medium text-[#5C5C57] hover:bg-[#E8E2DB] rounded-lg transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleMigrate}
                  disabled={migrating}
                  className="px-3 py-1.5 text-xs font-medium bg-[#1B1B18] text-white rounded-lg hover:bg-[#333] disabled:opacity-50 transition-colors"
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
