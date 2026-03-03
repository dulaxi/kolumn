import { useEffect, useState } from 'react'
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
import { hasLocalData, migrateLocalData } from '../../lib/migrateLocalData'

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
  const [showMigration, setShowMigration] = useState(false)
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
  // Including store functions in deps so HMR re-creates trigger a re-fetch
  useEffect(() => {
    if (user) {
      fetchBoards().then(() => spawnRecurringTasks())
      fetchNotes()
      fetchInvitations()
      fetchSharedBoards()
      subscribeToBoards()

      // Check for local data migration
      if (hasLocalData()) {
        setShowMigration(true)
      }

      return () => {
        unsubscribeAll()
      }
    }
  }, [user, fetchBoards, spawnRecurringTasks, fetchNotes, fetchInvitations, fetchSharedBoards, subscribeToBoards])

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

  // Match the base path for title
  const basePath = '/' + (location.pathname.split('/')[1] || '')
  const title = pageTitles[basePath] || 'Gambit'

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div
        className={`transition-all duration-200 ${
          isDesktop ? (collapsed ? 'ml-16' : 'ml-60') : 'ml-0'
        }`}
      >
        <Header title={title} />
        <main className={`p-4 sm:p-6 ${!isDesktop ? 'pb-20' : ''}`}>
          {/* Migration banner */}
          {showMigration && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">Local data detected</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Import your existing boards and notes into your account?
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSkipMigration}
                  className="px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleMigrate}
                  disabled={migrating}
                  className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
