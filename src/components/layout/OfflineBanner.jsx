import { useEffect, useRef } from 'react'
import { showToast } from '../../utils/toast'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useBoardStore } from '../../store/boardStore'
import { useNoteStore } from '../../store/noteStore'

/**
 * Headless offline watcher. Offline state renders as a persistent
 * showToast.offline (top-center, where every toast lands) instead of a
 * layout-shifting banner; reconnecting swaps it for the lime success
 * toast and refetches. Decision: error-style-decisions-2.html (O2).
 */
export default function OfflineBanner() {
  const online = useOnlineStatus()
  const toastId = useRef(null)
  const fetchBoards = useBoardStore((s) => s.fetchBoards)
  const fetchNotes = useNoteStore((s) => s.fetchNotes)

  useEffect(() => {
    if (!online) {
      if (!toastId.current) {
        toastId.current = showToast.offline("You're offline — changes may not be saved")
      }
    } else if (toastId.current) {
      showToast.dismiss(toastId.current)
      toastId.current = null
      showToast.success('Back online — syncing data')
      fetchBoards()
      fetchNotes()
    }
  }, [online, fetchBoards, fetchNotes])

  return null
}
