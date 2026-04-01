import { useEffect, useRef } from 'react'
import { WifiOff } from 'lucide-react'
import { showToast } from '../../utils/toast'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useBoardStore } from '../../store/boardStore'
import { useNoteStore } from '../../store/noteStore'

export default function OfflineBanner() {
  const online = useOnlineStatus()
  const wasOffline = useRef(false)
  const fetchBoards = useBoardStore((s) => s.fetchBoards)
  const fetchNotes = useNoteStore((s) => s.fetchNotes)

  useEffect(() => {
    if (!online) {
      wasOffline.current = true
    } else if (wasOffline.current) {
      wasOffline.current = false
      showToast.success('Back online — syncing data')
      fetchBoards()
      fetchNotes()
    }
  }, [online, fetchBoards, fetchNotes])

  if (online) return null

  return (
    <div className="bg-[#D4A843] text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium">
      <WifiOff className="w-4 h-4 shrink-0" />
      You're offline — changes may not be saved
    </div>
  )
}
