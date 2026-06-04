import { supabase } from './supabase'
import { useAuthStore } from '../store/authStore'
import { useBoardStore } from '../store/boardStore'
import { ONBOARDING_BOARD } from '../data/onboardingBoard'
import { logError } from '../utils/logger'

// Resolve sentinel due-date values in the data file to real ISO strings.
// Add more cases here when the board adds e.g. "in-3-days" or "next-monday".
function resolveDueDate(spec) {
  if (!spec) return null
  if (spec === 'tomorrow') {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString()
  }
  return spec
}

// Module-level in-flight map. React StrictMode runs effects twice in
// development, so two parallel seed calls would otherwise both pass
// the "does a tour board exist?" check before either commits its
// insert. We reuse the first promise for any concurrent caller so the
// insert only happens once.
const inFlightSeeds = new Map()

// One-time seed of the "Welcome to Kolumn" tour board. Called from
// useAppData after the initial fetch settles. Idempotency is enforced
// via three safeguards:
//   1. inFlightSeeds — JS-level dedup within a single page load.
//   2. profiles.tour_board_seeded_at — the source of truth. Set as
//      soon as the board row exists so a retry can't double-seed.
//   3. boards.is_tour — flagged on the new board. Used to dedupe if
//      step 2 didn't get to run because of an interrupted seed.
export function seedOnboardingBoard(userId) {
  if (inFlightSeeds.has(userId)) return inFlightSeeds.get(userId)
  const promise = doSeed(userId).finally(() => {
    inFlightSeeds.delete(userId)
  })
  inFlightSeeds.set(userId, promise)
  return promise
}

async function doSeed(userId) {
  // Guard A: profile flag set → never seed again.
  const profile = useAuthStore.getState().profile
  if (profile?.tour_board_seeded_at) return null

  // Guard B: a tour board already exists for this user but the flag
  // wasn't recorded (partial seed). Backfill the flag and bail.
  const { data: existing } = await supabase
    .from('boards')
    .select('id')
    .eq('owner_id', userId)
    .eq('is_tour', true)
    .limit(1)
    .maybeSingle()

  if (existing) {
    const now = new Date().toISOString()
    await supabase.from('profiles').update({ tour_board_seeded_at: now }).eq('id', userId)
    useAuthStore.setState((s) => ({
      profile: s.profile ? { ...s.profile, tour_board_seeded_at: now } : s.profile,
    }))
    return existing.id
  }

  // 1. Board row. Trigger on boards auto-inserts the owner into
  // board_members, which is what RLS uses to gate the subsequent
  // column / label / card / card_labels inserts.
  //
  // Important: do NOT chain .select().single() here. The boards SELECT
  // policy goes through a STABLE helper get_my_board_ids() whose
  // snapshot is taken at statement start — before the auto-add-owner
  // trigger commits — so the post-insert select fails RLS with 403.
  // We construct the board row ourselves (we already own the UUID and
  // all the fields).
  const boardId = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const board = {
    id: boardId,
    name: ONBOARDING_BOARD.name,
    icon: ONBOARDING_BOARD.icon,
    owner_id: userId,
    is_tour: true,
    next_task_number: 1,
    created_at: createdAt,
  }
  const { error: boardErr } = await supabase.from('boards').insert(board)
  if (boardErr) throw boardErr

  // 2. Set the profile flag IMMEDIATELY now that a board row exists.
  // If anything after this throws, the user gets a partial board
  // instead of a duplicate board on retry.
  const seededAt = new Date().toISOString()
  await supabase.from('profiles').update({ tour_board_seeded_at: seededAt }).eq('id', userId)

  // 3. Columns. Insert in one shot so positions match the data file.
  // No .select() — same reason as the board insert. We already own the
  // UUIDs and the rows we sent.
  const columnInserts = ONBOARDING_BOARD.columns.map((col, i) => ({
    id: crypto.randomUUID(),
    board_id: boardId,
    title: col.title,
    position: i,
  }))
  const { error: colErr } = await supabase.from('columns').insert(columnInserts)
  if (colErr) throw colErr

  // 4. Labels. Order matches Object.values(ONBOARDING_BOARD.labels).
  const labelDefs = Object.values(ONBOARDING_BOARD.labels)
  const labelInserts = labelDefs.map((l) => ({
    id: crypto.randomUUID(),
    board_id: boardId,
    text: l.text,
    color: l.color,
  }))
  const { error: labelErr } = await supabase.from('labels').insert(labelInserts)
  if (labelErr) throw labelErr

  // Map the data-file key (e.g. "welcome") to the new label uuid we
  // generated client-side.
  const labelIdByKey = {}
  labelDefs.forEach((l, i) => { labelIdByKey[l.id] = labelInserts[i].id })

  // 5. Cards. Build everything then batch-insert. Track label
  // associations to apply right after.
  let taskCounter = 1
  const cardInserts = []
  const cardLabelPlan = [] // { cardId, labelKeys: [...] }
  ONBOARDING_BOARD.columns.forEach((colDef, colIdx) => {
    const realCol = columnInserts[colIdx]
    if (!realCol) return
    colDef.cards.forEach((cardDef, cardIdx) => {
      const cardId = crypto.randomUUID()
      cardInserts.push({
        id: cardId,
        board_id: boardId,
        column_id: realCol.id,
        position: cardIdx,
        task_number: taskCounter,
        global_task_number: taskCounter,
        title: cardDef.title,
        description: cardDef.description || '',
        priority: cardDef.priority || 'medium',
        icon: cardDef.icon || null,
        due_date: resolveDueDate(cardDef.dueDate),
        completed: !!cardDef.completed,
        checklist: cardDef.checklist || [],
      })
      if (cardDef.labels?.length) {
        cardLabelPlan.push({ cardId, labelKeys: cardDef.labels })
      }
      taskCounter++
    })
  })
  const { error: cardErr } = await supabase.from('cards').insert(cardInserts)
  if (cardErr) throw cardErr

  // 6. card_labels join rows.
  const cardLabelInserts = []
  cardLabelPlan.forEach(({ cardId, labelKeys }) => {
    labelKeys.forEach((key, idx) => {
      const labelId = labelIdByKey[key]
      if (labelId) cardLabelInserts.push({ card_id: cardId, label_id: labelId, position: idx })
    })
  })
  if (cardLabelInserts.length > 0) {
    const { error: clErr } = await supabase.from('card_labels').insert(cardLabelInserts)
    if (clErr) throw clErr
  }

  // 7. Bump next_task_number so the user's own additions start from
  // the right counter.
  await supabase
    .from('boards')
    .update({ next_task_number: taskCounter })
    .eq('id', boardId)

  // 8. Sync all of this into the local boardStore + authStore so the
  // UI updates without waiting for realtime.
  useAuthStore.setState((s) => ({
    profile: s.profile ? { ...s.profile, tour_board_seeded_at: seededAt } : s.profile,
  }))
  useBoardStore.setState((s) => {
    const cardLabelMap = { ...s.cardLabels }
    cardLabelInserts.forEach(({ card_id, label_id }) => {
      const next = new Set(cardLabelMap[card_id] || [])
      next.add(label_id)
      cardLabelMap[card_id] = next
    })
    return {
      boards: {
        ...s.boards,
        [boardId]: { ...board, next_task_number: taskCounter },
      },
      columns: {
        ...s.columns,
        ...Object.fromEntries(columnInserts.map((c) => [c.id, c])),
      },
      cards: {
        ...s.cards,
        ...Object.fromEntries(cardInserts.map((c) => [c.id, c])),
      },
      labels: {
        ...s.labels,
        ...Object.fromEntries(labelInserts.map((l) => [l.id, l])),
      },
      cardLabels: cardLabelMap,
    }
  })

  return boardId
}

// Convenience wrapper that swallows errors — useful as a fire-and-forget
// call from a mount effect where we don't want a failed seed to crash
// the rest of the load.
export async function trySeedOnboardingBoard(userId) {
  try {
    return await seedOnboardingBoard(userId)
  } catch (err) {
    logError('seedOnboardingBoard failed', err)
    return null
  }
}
