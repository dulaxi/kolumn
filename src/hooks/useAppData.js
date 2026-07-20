import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useBoardStore } from '../store/boardStore'
import { useBoardSharingStore } from '../store/boardSharingStore'
import { useWorkspacesStore } from '../store/workspacesStore'
import { useNotificationStore } from '../store/notificationStore'
import { hasLocalData, migrateLocalData } from '../lib/migrateLocalData'
import { trySeedOnboardingBoard } from '../lib/seedOnboardingBoard'
import { showToast } from '../utils/toast'

/**
 * Wires up everything that depends on the signed-in user:
 *
 *   1. Initial data fetch — boards, notes, invitations, workspaces,
 *      workspace invitations, notifications. Each is independent;
 *      uses Promise.allSettled so a single failure doesn't block.
 *   2. Realtime subscriptions for boards + notifications (subscribed
 *      AFTER the initial fetch so realtime doesn't overwrite fresh data
 *      with stale messages already in the channel).
 *   3. Recurring-task spawn (run-once on auth change).
 *   4. Due-date reminder toasts — shown once per session for the
 *      signed-in user's overdue / due-today cards.
 *   5. Local-data migration prompt — exposed as `showMigration` state
 *      so the layout can render the banner.
 *
 * All of this used to live inline inside AppLayout's render body.
 * Moving it here keeps the layout component focused on layout.
 */
export function useAppData() {
  const user = useAuthStore((s) => s.user)
  const profileId = useAuthStore((s) => s.profile?.id)
  const profileSeededAt = useAuthStore((s) => s.profile?.tour_board_seeded_at)
  const fetchBoards = useBoardStore((s) => s.fetchBoards)
  const spawnRecurringTasks = useBoardStore((s) => s.spawnRecurringTasks)
  const subscribeToBoards = useBoardStore((s) => s.subscribeToBoards)
  const unsubscribeAll = useBoardStore((s) => s.unsubscribeAll)
  const fetchInvitations = useBoardSharingStore((s) => s.fetchInvitations)
  const fetchSharedBoards = useBoardSharingStore((s) => s.fetchSharedBoards)
  const subscribeToBoardInvitations = useBoardSharingStore((s) => s.subscribeToInvitations)
  const fetchWorkspaces = useWorkspacesStore((s) => s.fetchWorkspaces)
  const fetchWorkspaceInvitations = useWorkspacesStore((s) => s.fetchInvitations)
  const subscribeToWorkspaceInvitations = useWorkspacesStore((s) => s.subscribeToInvitations)
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications)
  const subscribeToNotifications = useNotificationStore((s) => s.subscribeToNotifications)

  const [showMigration, setShowMigration] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const remindersShown = useRef(false)

  useEffect(() => {
    if (!user) return

    let cancelled = false

    const loadAllData = () => Promise.allSettled([
      fetchBoards(),
      fetchInvitations(),
      fetchSharedBoards(),
      fetchWorkspaces(),
      fetchWorkspaceInvitations(),
      fetchNotifications(),
    ])

    loadAllData().then((results) => {
      if (cancelled) return

      // Subscribe to realtime AFTER data is loaded so the channel can't
      // race with our fetch and overwrite fresh state with a stale event
      // queued before subscription started.
      subscribeToBoards()
      spawnRecurringTasks()

      // Due-date reminder toasts — once per session, only if boards
      // fetched successfully (skipping otherwise prevents a misleading
      // "0 overdue" reading from incomplete data).
      const boardsFetchOk = results[0]?.status === 'fulfilled'
      if (remindersShown.current || !boardsFetchOk) return
      remindersShown.current = true

      const profile = useAuthStore.getState().profile
      const displayName = profile?.display_name || ''
      const cards = useBoardStore.getState().cards
      const todayStr = new Date().toISOString().split('T')[0]

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
    const unsubBoardInvites = subscribeToBoardInvitations(user.email, user.id)
    const unsubWorkspaceInvites = subscribeToWorkspaceInvitations(user.email, user.id)

    if (hasLocalData()) setShowMigration(true)

    return () => {
      cancelled = true
      unsubscribeAll()
      unsubNotifications()
      unsubBoardInvites()
      unsubWorkspaceInvites()
    }
    // The fetch / subscribe functions are stable Zustand action refs;
    // re-running this effect for them would just thrash subscriptions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Tour-board seed. Runs as soon as the profile lands (it may arrive
  // after the initial data fetch). Idempotent: re-runs are a no-op
  // because tour_board_seeded_at flips to a timestamp on first success,
  // and the seeder also re-checks the DB for any partial-seed board.
  useEffect(() => {
    if (!profileId || profileSeededAt) return
    trySeedOnboardingBoard(profileId)
  }, [profileId, profileSeededAt])

  const handleMigrate = async () => {
    setMigrating(true)
    const fullyMigrated = await migrateLocalData()
    await fetchBoards()
    setMigrating(false)
    setShowMigration(false)
    if (!fullyMigrated) {
      showToast.warn('Some items could not be imported — your local data was kept so you can retry')
    }
  }

  const handleSkipMigration = () => setShowMigration(false)

  return { showMigration, migrating, handleMigrate, handleSkipMigration }
}
