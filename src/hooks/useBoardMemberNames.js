import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBoardStore } from '../store/boardStore'
import { useWorkspacesStore } from '../store/workspacesStore'

export function useBoardMemberNames(card) {
  const [names, setNames] = useState([])
  const board = useBoardStore((s) => (card ? s.boards[card.board_id] : null))
  const workspaceId = board?.workspace_id || null
  const workspaceMembers = useWorkspacesStore((s) => (workspaceId ? s.members[workspaceId] : null))

  useEffect(() => {
    if (!card) return

    // Clear prior names when switching boards so the picker never flashes
    // stale members from the previously-open card.
    setNames([])

    if (workspaceId) {
      useWorkspacesStore.getState().fetchMembers(workspaceId)
      return
    }

    let cancelled = false
    ;(async () => {
      const { data: rows, error } = await supabase
        .from('board_members')
        .select('user_id')
        .eq('board_id', card.board_id)
      if (cancelled || error || !rows?.length) return
      const userIds = rows.map((r) => r.user_id)
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds)
      if (cancelled || pErr) return
      setNames((profiles || []).map((p) => p.display_name).filter(Boolean))
    })()

    return () => { cancelled = true }
  }, [card?.board_id, workspaceId])

  useEffect(() => {
    if (!workspaceId) return
    setNames((workspaceMembers || []).map((m) => m.display_name).filter(Boolean))
  }, [workspaceId, workspaceMembers])

  return names
}
