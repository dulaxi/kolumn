import { supabase } from '../lib/supabase'
import { logError } from './logger'

// workspace_members / board_members FK to auth.users (not profiles), so PostgREST
// can't auto-embed a nested profile select. Fetch profiles in a second round-trip.
export async function fetchProfilesByIds(userIds, fields = 'id, display_name, icon, color, email') {
  if (!userIds || userIds.length === 0) return new Map()
  const { data, error } = await supabase.from('profiles').select(fields).in('id', userIds)
  if (error) {
    logError('fetchProfilesByIds failed:', error)
    return new Map()
  }
  return new Map((data || []).map((p) => [p.id, p]))
}
