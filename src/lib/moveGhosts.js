// Pure helpers for Move Ghosts — no React, no Supabase, fully unit-testable.

// Assemble the denormalized last_move payload written on each move.
// `at` is an ISO string supplied by the caller (keep this function pure).
export function buildLastMove(origin, landing, actor) {
  return {
    from_column_id: origin.columnId,
    from_position: origin.position,
    to_column_id: landing.columnId,
    to_position: landing.position,
    moved_by_id: actor.id,
    moved_by_name: actor.name,
    moved_by_color: actor.color ?? null,
    moved_at: actor.at,
  }
}

// Turn a newest-first list of moves into ghost placements. List-shaped so the
// v1 caller passes [last_move] and a future tier passes the full history.
export function deriveGhosts(moves, columnIds) {
  const existing = new Set(columnIds || [])
  return (moves || []).map((move, i) => {
    const originExists = !!(move && move.from_column_id && existing.has(move.from_column_id))
    const positionKnown = move && Number.isInteger(move.from_position)
    return {
      columnId: originExists ? move.from_column_id : null,
      position: positionKnown ? move.from_position : 0,
      move,
      age: i + 1,
      approximate: !positionKnown,
    }
  })
}

// Build a render sequence that inserts each ghost at its position among cardIds.
export function interleaveGhosts(cardIds, ghosts) {
  const ids = cardIds || []
  const byPos = new Map()
  for (const g of ghosts || []) {
    const p = Math.max(0, Math.min(g.position ?? 0, ids.length))
    if (!byPos.has(p)) byPos.set(p, [])
    byPos.get(p).push(g)
  }
  const out = []
  for (let i = 0; i <= ids.length; i++) {
    if (byPos.has(i)) for (const g of byPos.get(i)) out.push({ type: 'ghost', ghost: g })
    if (i < ids.length) out.push({ type: 'card', id: ids[i] })
  }
  return out
}
