// Pure presence derivation — no Supabase, no React, fully unit-testable.
// Supabase presenceState() shape: { [presenceKey]: Member[] }.
// Member = { user_id, name, color, icon, card_id: string | null }

export function derivePresence(presenceState) {
  const byUser = new Map()
  for (const entries of Object.values(presenceState || {})) {
    for (const e of entries) {
      const prev = byUser.get(e.user_id)
      // Keep one entry per user; prefer the one that has a card open.
      if (!prev || (!prev.card_id && e.card_id)) byUser.set(e.user_id, e)
    }
  }
  const members = [...byUser.values()]
  const byCard = {}
  for (const mem of members) {
    if (mem.card_id) (byCard[mem.card_id] ||= []).push(mem)
  }
  return { members, byCard }
}

export const othersOf = (members, selfId) =>
  (members || []).filter((mem) => mem.user_id !== selfId)

export const othersOnCard = (byCard, cardId, selfId) =>
  ((byCard && byCard[cardId]) || []).filter((mem) => mem.user_id !== selfId)
