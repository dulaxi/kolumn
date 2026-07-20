import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useBoardStore } from '../store/boardStore'
import { useWorkspacesStore } from '../store/workspacesStore'

// Members (with ids) assignable on a card's board — board members for personal
// boards, workspace members for workspace boards. Returns [{ id, display_name }]
// so the assignee picker can capture the chosen member's id at pick time.
export function useBoardMembers(card) {
  const [members, setMembers] = useState([])
  const board = useBoardStore((s) => (card ? s.boards[card.board_id] : null))
  const workspaceId = board?.workspace_id || null
  const workspaceMembers = useWorkspacesStore((s) => (workspaceId ? s.members[workspaceId] : null))

  useEffect(() => {
    if (!card) return

    // Clear when switching boards so the picker never flashes stale members.
    setMembers([])

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
      setMembers((profiles || [])
        .filter((p) => p.display_name)
        .map((p) => ({ id: p.id, display_name: p.display_name })))
    })()

    return () => { cancelled = true }
    // Keyed on board_id, not the full `card` object: the store returns a new
    // card identity on every edit, and re-running would clear + refetch mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.board_id, workspaceId])

  useEffect(() => {
    if (!workspaceId) return
    setMembers((workspaceMembers || [])
      .filter((m) => m.display_name)
      .map((m) => ({ id: m.user_id, display_name: m.display_name })))
  }, [workspaceId, workspaceMembers])

  return members
}

// Names-only convenience wrapper for consumers that don't need ids.
export function useBoardMemberNames(card) {
  return useBoardMembers(card).map((m) => m.display_name)
}
