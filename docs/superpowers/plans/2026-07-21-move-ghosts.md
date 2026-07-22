# Move Ghosts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On any board, a header ghost toggle lets you hover a card to see a faded, inert "ghost" of it pinned to the exact slot it was last moved from, tagged with who moved it and when.

**Architecture:** Every cross-column move writes a denormalized `cards.last_move` (fast, zero-query hover path) and an append-only structured `card_activity.meta` row (durable history for a future full-trail tier). A pure `deriveGhosts(moves, columnIds)` turns a *list* of moves into ghost placements (v1 passes one; the future tier passes many — a data swap, not a rewrite). Rendering is hover-scoped: only the hovered card's origin column ever holds a ghost node.

**Tech Stack:** React 19, Zustand, Supabase (Postgres + Realtime), @dnd-kit, Vitest + @testing-library/react, date-fns, @phosphor-icons/react, Tailwind v4.

## Global Constraints

- **Scalability is a priority** (user-stated): hover path stays at **zero queries** (reads `card.last_move`, already in the store); `card_activity` history is append-only behind `idx_card_activity_card_id` and the future trail read must be **bounded/paginated**; `deriveGhosts` is **pure and list-shaped** (1→N is a data swap); rendering is **hover-scoped** (never all cards' ghosts at once); the two move writes are **fire-and-forget**, off the drag's critical path.
- **Every board, no tier gate and no workspace gate** — personal, shared, and workspace boards all get it, including solo.
- **v1 records cross-column moves only** (matches existing `logCardMove`); same-column reorders are not recorded, though `deriveGhosts` handles them defensively.
- **Coherency rules:** Phosphor icons only; colors via `var(--token)` (no hex); cards 16px radius (`rounded-2xl`); lime is a *state* color (armed toggle uses `--accent-lime-wash` / `--accent-lime-dark`), never a button fill; never write `assignee_name` as source of truth; ghost is inert (`pointer-events: none`, not draggable, out of the DnD context).
- **Fire-and-forget writes never break the drag** — swallow errors via `logError`, exactly like the existing `logActivity`.
- **Model/verification:** `npm run test` (Vitest single run), `npm run build`, `npm run lint`.

---

### Task 1: Database — `cards.last_move` + `card_activity.meta`

**Files:**
- Create: `supabase/migrations/2026-07-21-move-ghosts.sql`
- Modify: `supabase/schema.sql` (add `last_move jsonb` to the `create table public.cards` block; add `meta jsonb` to the `create table public.card_activity` block near line 984)

**Interfaces:**
- Produces: a nullable `cards.last_move jsonb` column and a nullable `card_activity.meta jsonb` column. No RLS change (both inherit the row's existing policies).

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/2026-07-21-move-ghosts.sql`:

```sql
-- Move Ghosts: denormalized last-move pointer + structured move history.
-- last_move powers the zero-query hover ghost; card_activity.meta is the
-- append-only structured history (every move) for the future full-trail tier.
alter table public.cards
  add column if not exists last_move jsonb;

alter table public.card_activity
  add column if not exists meta jsonb;
```

- [ ] **Step 2: Apply the migration**

Apply to the live project via the Supabase MCP `apply_migration` (name: `move_ghosts`, the SQL above), or `supabase db push`.
Expected: both `alter table` statements succeed (idempotent — safe to re-run).

- [ ] **Step 3: Verify the columns exist**

Run this query (Supabase MCP `execute_sql` or SQL editor):
```sql
select table_name, column_name, data_type
from information_schema.columns
where (table_name = 'cards' and column_name = 'last_move')
   or (table_name = 'card_activity' and column_name = 'meta');
```
Expected: two rows, both `data_type = jsonb`.

- [ ] **Step 4: Update `supabase/schema.sql`**

In the `create table public.cards (...)` block, add a line `  last_move jsonb,` alongside the other nullable columns. In the `create table public.card_activity (...)` block (near line 984), add `  meta jsonb,` after `detail text,`. This keeps `schema.sql` authoritative.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/2026-07-21-move-ghosts.sql supabase/schema.sql
git commit -m "feat(db): add cards.last_move + card_activity.meta for move ghosts"
```

---

### Task 2: Pure helpers — `buildLastMove`, `deriveGhosts`, `interleaveGhosts`

**Files:**
- Create: `src/lib/moveGhosts.js`
- Test: `src/__tests__/moveGhosts.test.js`

**Interfaces:**
- Produces:
  - `buildLastMove(origin, landing, actor) -> lastMove` where `origin`/`landing` are `{ columnId, position }`, `actor` is `{ id, name, color, at }` (`at` = ISO string), and `lastMove` is `{ from_column_id, from_position, to_column_id, to_position, moved_by_id, moved_by_name, moved_by_color, moved_at }`.
  - `deriveGhosts(moves, columnIds) -> Array<{ columnId, position, move, age, approximate }>`. `moves` is newest-first; `columnIds` is an array of currently-existing column id strings. `columnId` is `null` when the origin column no longer exists.
  - `interleaveGhosts(cardIds, ghosts) -> Array<{ type: 'card', id } | { type: 'ghost', ghost }>`. Inserts each ghost at its `position` index among `cardIds` (clamped to `[0, cardIds.length]`).
- Note: the spec's `deriveGhosts(moves, columns, cardsById)` dropped `cardsById` (unused — the renderer looks up the card title itself). Intentional YAGNI trim.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/moveGhosts.test.js`:

```js
import { describe, test, expect } from 'vitest'
import { buildLastMove, deriveGhosts, interleaveGhosts } from '../lib/moveGhosts'

describe('buildLastMove', () => {
  test('assembles the denormalized payload from origin, landing, actor', () => {
    const lm = buildLastMove(
      { columnId: 'col-a', position: 2 },
      { columnId: 'col-b', position: 0 },
      { id: 'u1', name: 'Maya', color: 'copper', at: '2026-07-21T10:00:00.000Z' },
    )
    expect(lm).toEqual({
      from_column_id: 'col-a', from_position: 2,
      to_column_id: 'col-b', to_position: 0,
      moved_by_id: 'u1', moved_by_name: 'Maya', moved_by_color: 'copper',
      moved_at: '2026-07-21T10:00:00.000Z',
    })
  })
})

describe('deriveGhosts', () => {
  const cols = ['col-a', 'col-b', 'col-c']
  const move = (from, pos) => ({ from_column_id: from, from_position: pos, moved_by_name: 'Maya' })

  test('empty moves -> empty array', () => {
    expect(deriveGhosts([], cols)).toEqual([])
    expect(deriveGhosts(null, cols)).toEqual([])
  })

  test('places a ghost at the exact origin slot', () => {
    const [g] = deriveGhosts([move('col-a', 3)], cols)
    expect(g.columnId).toBe('col-a')
    expect(g.position).toBe(3)
    expect(g.age).toBe(1)
    expect(g.approximate).toBe(false)
  })

  test('missing position falls back to column top, approximate=true', () => {
    const [g] = deriveGhosts([{ from_column_id: 'col-a', moved_by_name: 'Maya' }], cols)
    expect(g.columnId).toBe('col-a')
    expect(g.position).toBe(0)
    expect(g.approximate).toBe(true)
  })

  test('deleted origin column -> columnId null', () => {
    const [g] = deriveGhosts([move('col-gone', 1)], cols)
    expect(g.columnId).toBeNull()
  })

  test('N moves get ascending age (newest first = age 1)', () => {
    const ghosts = deriveGhosts([move('col-a', 0), move('col-b', 1), move('col-c', 2)], cols)
    expect(ghosts.map((g) => g.age)).toEqual([1, 2, 3])
  })
})

describe('interleaveGhosts', () => {
  test('inserts a ghost at its position among cards', () => {
    const out = interleaveGhosts(['x', 'y', 'z'], [{ position: 1, age: 1 }])
    expect(out).toEqual([
      { type: 'card', id: 'x' },
      { type: 'ghost', ghost: { position: 1, age: 1 } },
      { type: 'card', id: 'y' },
      { type: 'card', id: 'z' },
    ])
  })

  test('position beyond length clamps to the end', () => {
    const out = interleaveGhosts(['x'], [{ position: 9 }])
    expect(out).toEqual([
      { type: 'card', id: 'x' },
      { type: 'ghost', ghost: { position: 9 } },
    ])
  })

  test('no ghosts -> just cards', () => {
    expect(interleaveGhosts(['x', 'y'], [])).toEqual([
      { type: 'card', id: 'x' },
      { type: 'card', id: 'y' },
    ])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/moveGhosts.test.js`
Expected: FAIL — `buildLastMove is not a function` (module doesn't exist yet).

- [ ] **Step 3: Implement the pure module**

Create `src/lib/moveGhosts.js`:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/moveGhosts.test.js`
Expected: PASS (all in the three describe blocks).

- [ ] **Step 5: Commit**

```bash
git add src/lib/moveGhosts.js src/__tests__/moveGhosts.test.js
git commit -m "feat(board): pure move-ghost helpers (buildLastMove, deriveGhosts, interleaveGhosts)"
```

---

### Task 3: Record moves — `last_move` + structured `meta`

**Files:**
- Modify: `src/store/boardStore/helpers.js:88-106` (extend `logActivity` with a `meta` param)
- Modify: `src/store/boardStore/slices/cardsSlice.js:520-525` (rewrite `logCardMove`; add imports)
- Modify: `src/hooks/useBoardDnd.js:81-95` and `:182-192` (capture origin position; pass positions to `logCardMove`)
- Test: `src/__tests__/moveGhostsRecording.test.js`

**Interfaces:**
- Consumes: `buildLastMove` from Task 2.
- Produces: `logCardMove(cardId, fromColumnId, toColumnId, fromPosition, toPosition)` — optimistically sets the local card's `last_move`, fire-and-forget persists it to the `cards` row, and appends a `card_activity` row with structured `meta`. `logActivity(cardId, action, detail, meta = null)`.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/moveGhostsRecording.test.js` (mirrors the mock pattern in `boardStoreErrors.test.js`):

```js
import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase', () => {
  const { createMockSupabase } = require('./mocks/supabase')
  return { supabase: createMockSupabase() }
})
vi.mock('../utils/logger', () => ({ logError: vi.fn() }))
vi.mock('../utils/toast', () => ({
  showToast: { error: vi.fn(), warn: vi.fn(), success: vi.fn(), restore: vi.fn(), archive: vi.fn(), delete: vi.fn(), info: vi.fn(), overdue: vi.fn() },
}))

import { useBoardStore } from '../store/boardStore'
import { useAuthStore } from '../store/authStore'

describe('logCardMove records last_move', () => {
  beforeEach(() => {
    useAuthStore.setState({ profile: { id: 'u1', display_name: 'Maya', color: 'copper' } })
    useBoardStore.setState({
      columns: { 'col-a': { id: 'col-a', title: 'To do' }, 'col-b': { id: 'col-b', title: 'Doing' } },
      cards: { 'card-1': { id: 'card-1', column_id: 'col-b', position: 0, title: 'Fix bug' } },
    })
  })

  test('optimistically sets last_move on the local card', () => {
    useBoardStore.getState().logCardMove('card-1', 'col-a', 'col-b', 2, 0)
    const lm = useBoardStore.getState().cards['card-1'].last_move
    expect(lm).toMatchObject({
      from_column_id: 'col-a', from_position: 2,
      to_column_id: 'col-b', to_position: 0,
      moved_by_id: 'u1', moved_by_name: 'Maya', moved_by_color: 'copper',
    })
    expect(typeof lm.moved_at).toBe('string')
  })

  test('no-op safe when the card is missing', () => {
    expect(() => useBoardStore.getState().logCardMove('nope', 'col-a', 'col-b', 0, 0)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/moveGhostsRecording.test.js`
Expected: FAIL — `last_move` is `undefined` (old `logCardMove` doesn't set it).

- [ ] **Step 3: Extend `logActivity` with a `meta` param**

In `src/store/boardStore/helpers.js`, change the signature and the insert:

```js
export async function logActivity(cardId, action, detail, meta = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const profile = useAuthStore.getState().profile
    const actorName = profile?.display_name || user.email || 'Unknown'
    await supabase.from('card_activity').insert({
      card_id: cardId,
      user_id: user.id,
      actor_name: actorName,
      action,
      detail,
      ...(meta ? { meta } : {}),
    })
  } catch (err) {
    // Activity logging should never break the main flow
    logError('logActivity failed:', err)
  }
}
```

- [ ] **Step 4: Rewrite `logCardMove`**

In `src/store/boardStore/slices/cardsSlice.js`, add these imports near the top (with the other imports):

```js
import { useAuthStore } from '../../authStore'
import { buildLastMove } from '../../../lib/moveGhosts'
import { supabase } from '../../../lib/supabase'
import { logError } from '../../../utils/logger'
```

(Only add an import that isn't already present — `supabase`, `logError`, and the helpers may already be imported in this file; do not duplicate.)

Replace `logCardMove` (lines 520-525) with:

```js
  logCardMove: (cardId, fromColumnId, toColumnId, fromPosition, toPosition) => {
    const state = get()
    const fromCol = state.columns[fromColumnId]
    const toCol = state.columns[toColumnId]
    const profile = useAuthStore.getState().profile

    const lastMove = buildLastMove(
      { columnId: fromColumnId, position: fromPosition },
      { columnId: toColumnId, position: toPosition },
      { id: profile?.id ?? null, name: profile?.display_name || 'Someone', color: profile?.color ?? null, at: new Date().toISOString() },
    )

    // Optimistic local update so the mover sees their own ghost immediately;
    // other clients receive it via the existing realtime cards subscription.
    set((s) => (s.cards[cardId]
      ? { cards: { ...s.cards, [cardId]: { ...s.cards[cardId], last_move: lastMove } } }
      : {}))

    // Fire-and-forget: persist to the card row (never blocks the drag).
    supabase.from('cards').update({ last_move: lastMove }).eq('id', cardId)
      .then(({ error }) => { if (error) logError('last_move write failed:', error) })

    // Append-only structured history (powers the future full-trail tier).
    logActivity(cardId, 'moved', `${fromCol?.title || 'Unknown'} → ${toCol?.title || 'Unknown'}`, {
      from_column_id: fromColumnId,
      from_position: fromPosition,
      to_column_id: toColumnId,
      to_position: toPosition,
    })
  },
```

- [ ] **Step 5: Capture origin position and pass positions in `useBoardDnd`**

In `src/hooks/useBoardDnd.js`, in `handleDragStart` (line ~91), record the card's origin position:

```js
    const card = state.cards[id]
    dragOriginRef.current = card ? { cardId: id, columnId: card.column_id, position: card.position } : null
```

In `handleDragEnd` (lines ~184-192), pass the from/to positions:

```js
    if (dragOriginRef.current) {
      const { cardId: draggedId, columnId: origColumnId, position: origPosition } = dragOriginRef.current
      const currentCard = useBoardStore.getState().cards[draggedId]
      if (currentCard && currentCard.column_id !== origColumnId) {
        movedCrossColumn = true
        logCardMove(draggedId, origColumnId, currentCard.column_id, origPosition, currentCard.position)
      }
      dragOriginRef.current = null
    }
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/__tests__/moveGhostsRecording.test.js`
Expected: PASS (both tests).

- [ ] **Step 7: Verify nothing else broke**

Run: `npx vitest run src/__tests__/boardStoreErrors.test.js src/__tests__/moveGhostsRecording.test.js`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/store/boardStore/helpers.js src/store/boardStore/slices/cardsSlice.js src/hooks/useBoardDnd.js src/__tests__/moveGhostsRecording.test.js
git commit -m "feat(board): record last_move + structured move meta on cross-column moves"
```

---

### Task 4: `settingsStore` — per-board armed state

**Files:**
- Modify: `src/store/settingsStore.js:18-31` (add state) and `:80` (add actions)
- Test: `src/__tests__/settingsStore.ghost.test.js`

**Interfaces:**
- Produces: `ghostBoards: { [boardId]: boolean }` persisted state; `toggleGhostMode(boardId)`; `isGhostArmed(boardId) -> boolean`.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/settingsStore.ghost.test.js`:

```js
import { describe, test, expect, beforeEach } from 'vitest'
import { useSettingsStore } from '../store/settingsStore'

describe('settingsStore ghost mode', () => {
  beforeEach(() => useSettingsStore.setState({ ghostBoards: {} }))

  test('defaults to disarmed', () => {
    expect(useSettingsStore.getState().isGhostArmed('b1')).toBe(false)
  })

  test('toggle arms then disarms a single board', () => {
    useSettingsStore.getState().toggleGhostMode('b1')
    expect(useSettingsStore.getState().isGhostArmed('b1')).toBe(true)
    useSettingsStore.getState().toggleGhostMode('b1')
    expect(useSettingsStore.getState().isGhostArmed('b1')).toBe(false)
  })

  test('armed state is independent per board', () => {
    useSettingsStore.getState().toggleGhostMode('b1')
    expect(useSettingsStore.getState().isGhostArmed('b1')).toBe(true)
    expect(useSettingsStore.getState().isGhostArmed('b2')).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/settingsStore.ghost.test.js`
Expected: FAIL — `isGhostArmed is not a function`.

- [ ] **Step 3: Add the state + actions**

In `src/store/settingsStore.js`, add to the initial state object (near line 29, alongside `workspaceSidebarOpen`):

```js
      ghostBoards: {}, // { [boardId]: true } — per-board "ghost mode" armed state
```

Add these actions before the closing `}),` of the store creator (near line 80, after `toggleIconStyle`):

```js
      toggleGhostMode: (boardId) => set((s) => {
        const next = { ...s.ghostBoards }
        if (next[boardId]) delete next[boardId]
        else next[boardId] = true
        return { ghostBoards: next }
      }),
      isGhostArmed: (boardId) => !!get().ghostBoards[boardId],
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/__tests__/settingsStore.ghost.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/settingsStore.js src/__tests__/settingsStore.ghost.test.js
git commit -m "feat(board): per-board ghost-mode armed state in settingsStore"
```

---

### Task 5: Hover store + `SortableCard` hover wiring

**Files:**
- Create: `src/store/ghostHoverStore.js`
- Modify: `src/components/board/SortableCard.jsx:1-10, 44-66` (set/clear hover on the card root)
- Test: `src/__tests__/ghostHoverStore.test.js`

**Interfaces:**
- Consumes: `useSettingsStore().isGhostArmed`, `useBoardStore.getState()._isDragging`.
- Produces: `useGhostHoverStore` with `hoverCardId: string | null`, `setHoverCard(id)`, `clearHoverCard()`.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/ghostHoverStore.test.js`:

```js
import { describe, test, expect, beforeEach } from 'vitest'
import { useGhostHoverStore } from '../store/ghostHoverStore'

describe('ghostHoverStore', () => {
  beforeEach(() => useGhostHoverStore.setState({ hoverCardId: null }))

  test('sets and clears the hovered card', () => {
    useGhostHoverStore.getState().setHoverCard('card-1')
    expect(useGhostHoverStore.getState().hoverCardId).toBe('card-1')
    useGhostHoverStore.getState().clearHoverCard()
    expect(useGhostHoverStore.getState().hoverCardId).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/ghostHoverStore.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the store**

Create `src/store/ghostHoverStore.js`:

```js
import { create } from 'zustand'

// Ephemeral: which card is hovered for a ghost peek. Never persisted.
export const useGhostHoverStore = create((set) => ({
  hoverCardId: null,
  setHoverCard: (id) => set({ hoverCardId: id }),
  clearHoverCard: () => set({ hoverCardId: null }),
}))
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/__tests__/ghostHoverStore.test.js`
Expected: PASS.

- [ ] **Step 5: Wire hover into `SortableCard`**

In `src/components/board/SortableCard.jsx`, add imports:

```js
import { useGhostHoverStore } from '../../store/ghostHoverStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useBoardStore } from '../../store/boardStore'
```

Inside the component, after `const isMobile = useIsMobile()`:

```js
  const setHoverCard = useGhostHoverStore((s) => s.setHoverCard)
  const clearHoverCard = useGhostHoverStore((s) => s.clearHoverCard)

  const onGhostEnter = () => {
    if (!useSettingsStore.getState().isGhostArmed(card.board_id)) return
    if (useBoardStore.getState()._isDragging) return
    setHoverCard(card.id)
  }
  const onGhostLeave = () => clearHoverCard()
```

Add `onMouseEnter={onGhostEnter} onMouseLeave={onGhostLeave}` to the desktop root (line ~63) and the mobile root (line ~46). The desktop root becomes:

```jsx
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onMouseEnter={onGhostEnter} onMouseLeave={onGhostLeave}>
      <Card card={card} onClick={onClick} onComplete={onComplete} isSelected={isSelected} />
    </div>
  )
```

(Reading `isGhostArmed`/`_isDragging` via `getState()` in the handler — not via a hook subscription — keeps `SortableCard` from re-rendering on hover or arm changes.)

- [ ] **Step 6: Verify the suite still passes + build**

Run: `npx vitest run src/__tests__/ghostHoverStore.test.js && npm run build`
Expected: test PASS; build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/store/ghostHoverStore.js src/components/board/SortableCard.jsx src/__tests__/ghostHoverStore.test.js
git commit -m "feat(board): ephemeral ghost-hover store + SortableCard hover wiring"
```

---

### Task 6: `GhostCard` presentational component

**Files:**
- Create: `src/components/board/GhostCard.jsx`
- Test: `src/__tests__/GhostCard.test.jsx`

**Interfaces:**
- Consumes: `resolveProfileColor` from `src/constants/colors`; `formatDistanceToNowStrict` from `date-fns`.
- Produces: `<GhostCard title moverName moverColor movedAt age approximate />` — an inert dashed/translucent card. `age` (1..N) drives opacity; `approximate` shows a "~" origin hint.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/GhostCard.test.jsx`:

```jsx
import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import GhostCard from '../components/board/GhostCard'

describe('GhostCard', () => {
  test('renders the card title and who moved it', () => {
    render(<GhostCard title="Fix login bug" moverName="Maya" moverColor="copper" movedAt="2026-07-21T10:00:00.000Z" age={1} approximate={false} />)
    expect(screen.getByText('Fix login bug')).toBeInTheDocument()
    expect(screen.getByText(/Maya moved this/)).toBeInTheDocument()
  })

  test('is inert (aria-hidden, pointer-events none)', () => {
    const { container } = render(<GhostCard title="X" moverName="Sam" movedAt="2026-07-21T10:00:00.000Z" age={1} approximate={false} />)
    const root = container.firstChild
    expect(root).toHaveAttribute('aria-hidden', 'true')
    expect(root.style.pointerEvents).toBe('none')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/GhostCard.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `GhostCard`**

Create `src/components/board/GhostCard.jsx`:

```jsx
import { formatDistanceToNowStrict } from 'date-fns'
import { resolveProfileColor } from '../../constants/colors'

const AGE_OPACITY = { 1: 1, 2: 0.62, 3: 0.4 }

// Inert, dashed placeholder shown at a card's previous slot while its source
// card is hovered in ghost mode. Never interactive; never in the DnD context.
export default function GhostCard({ title, moverName, moverColor, movedAt, age = 1, approximate = false }) {
  const pc = resolveProfileColor(moverColor)
  const color = pc.style?.background || 'var(--color-mist)'
  const when = movedAt ? formatDistanceToNowStrict(new Date(movedAt), { addSuffix: true }) : ''
  const initial = (moverName?.[0] || '?').toLowerCase()

  return (
    <div
      aria-hidden="true"
      style={{
        pointerEvents: 'none',
        opacity: AGE_OPACITY[age] ?? 0.26,
        borderColor: `color-mix(in srgb, ${color} 55%, transparent)`,
        backgroundImage: `repeating-linear-gradient(135deg, color-mix(in srgb, ${color} 7%, transparent) 0 6px, transparent 6px 12px)`,
      }}
      className="relative rounded-2xl border-[1.5px] border-dashed p-3 select-none"
    >
      <span
        className="absolute -top-2 -right-2 w-[19px] h-[19px] rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-[var(--surface-sidebar)]"
        style={{ ...pc.style, background: color }}
      >
        {initial}
      </span>
      <div className="text-[13px] font-medium leading-snug text-[var(--text-muted)]">{title}</div>
      <div className="mt-2 flex items-center gap-1.5 font-mono text-[10.5px] text-[var(--text-muted)]">
        <span className="w-[17px] h-[17px] rounded-full flex items-center justify-center text-[8.5px] font-bold text-white shrink-0" style={{ ...pc.style, background: color }}>{initial}</span>
        {approximate ? `${moverName} moved this from here · ${when}` : `${moverName} moved this · ${when}`}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/__tests__/GhostCard.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/board/GhostCard.jsx src/__tests__/GhostCard.test.jsx
git commit -m "feat(board): GhostCard — inert dashed placeholder for a card's prior slot"
```

---

### Task 7: `GhostToggle` header button

**Files:**
- Create: `src/components/board/GhostToggle.jsx`
- Modify: `src/pages/BoardsPage.jsx:11` (import) and `:115` (render beside `PresenceBar`)
- Test: `src/__tests__/GhostToggle.test.jsx`

**Interfaces:**
- Consumes: `useSettingsStore` (`ghostBoards`, `toggleGhostMode`); Phosphor `Ghost` icon.
- Produces: `<GhostToggle boardId />` — a header button reflecting/toggling the armed state. Renders nothing when `boardId` is falsy or `'__all__'`.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/GhostToggle.test.jsx`:

```jsx
import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import GhostToggle from '../components/board/GhostToggle'
import { useSettingsStore } from '../store/settingsStore'

describe('GhostToggle', () => {
  beforeEach(() => useSettingsStore.setState({ ghostBoards: {} }))

  test('renders nothing for the all-tasks view', () => {
    const { container } = render(<GhostToggle boardId="__all__" />)
    expect(container.firstChild).toBeNull()
  })

  test('reflects and toggles armed state', () => {
    render(<GhostToggle boardId="b1" />)
    const btn = screen.getByRole('button', { name: /ghost/i })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(btn)
    expect(useSettingsStore.getState().isGhostArmed('b1')).toBe(true)
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/GhostToggle.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `GhostToggle`**

Create `src/components/board/GhostToggle.jsx`:

```jsx
import { Ghost } from '@phosphor-icons/react'
import { useSettingsStore } from '../../store/settingsStore'
import Tooltip from '../ui/Tooltip'

// Header toggle that arms "ghost mode" for this board. Lime is a *state* color
// here (armed = lime wash), never a button fill — per coherency rules.
export default function GhostToggle({ boardId }) {
  const armed = useSettingsStore((s) => !!s.ghostBoards[boardId])
  const toggleGhostMode = useSettingsStore((s) => s.toggleGhostMode)

  if (!boardId || boardId === '__all__') return null

  return (
    <Tooltip content={armed ? 'Ghost mode on — hover a card to see its last move' : 'Show where cards were last moved from'}>
      <button
        type="button"
        aria-label="Ghost mode"
        aria-pressed={armed}
        onClick={() => toggleGhostMode(boardId)}
        className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors ${
          armed
            ? 'bg-[var(--accent-lime-wash)] border-[var(--accent-lime-dark)]/40 text-[var(--accent-lime-dark)]'
            : 'bg-[var(--surface-card)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)]'
        }`}
      >
        <Ghost size={16} weight={armed ? 'fill' : 'regular'} />
        Ghosts
      </button>
    </Tooltip>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/__tests__/GhostToggle.test.jsx`
Expected: PASS.

- [ ] **Step 5: Place it in the board header**

In `src/pages/BoardsPage.jsx`, add the import near line 11:

```js
import GhostToggle from '../components/board/GhostToggle'
```

Render it right after `<PresenceBar />` (line 115):

```jsx
          <PresenceBar />
          <GhostToggle boardId={activeBoardId} />
```

- [ ] **Step 6: Build + commit**

Run: `npm run build`
Expected: succeeds.

```bash
git add src/components/board/GhostToggle.jsx src/pages/BoardsPage.jsx src/__tests__/GhostToggle.test.jsx
git commit -m "feat(board): GhostToggle header button, wired into BoardsPage"
```

---

### Task 8: Render ghosts on hover — `BoardView` + `Column` wiring

**Files:**
- Modify: `src/components/board/BoardView.jsx:1-10, 17-23, 58-76` (compute placements; pass to columns)
- Modify: `src/components/board/Column.jsx:1-14, 40, 240-258` (accept `ghosts`/`ghostInfo`; interleave `GhostCard` into the list)
- Test: `src/__tests__/moveGhosts.render.test.jsx`

**Interfaces:**
- Consumes: `deriveGhosts`, `interleaveGhosts` (Task 2); `useGhostHoverStore` (Task 5); `GhostCard` (Task 6); `useSettingsStore.ghostBoards` (Task 4).
- Produces: on-hover ghost rendering. `Column` gains props `ghosts` (`Array<{ position, age, approximate, floating }>`) and `ghostInfo` (`{ title, moverName, moverColor, movedAt } | null`).

- [ ] **Step 1: Write the failing test** (drives the `Column` interleave path with a real `GhostCard`)

Create `src/__tests__/moveGhosts.render.test.jsx`:

```jsx
import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { interleaveGhosts } from '../lib/moveGhosts'
import GhostCard from '../components/board/GhostCard'

// The Column interleave is `interleaveGhosts` + a GhostCard per ghost slot.
// This test locks that contract without standing up the full DnD tree.
function ColumnGhosts({ cardIds, ghosts, info }) {
  const seq = interleaveGhosts(cardIds, ghosts)
  return (
    <div>
      {seq.map((n, i) => n.type === 'ghost'
        ? <GhostCard key={`g${i}`} title={info.title} moverName={info.moverName} moverColor={info.moverColor} movedAt={info.movedAt} age={n.ghost.age} approximate={n.ghost.approximate} />
        : <div key={n.id} data-card={n.id}>{n.id}</div>)}
    </div>
  )
}

describe('column ghost interleave', () => {
  const info = { title: 'Fix login bug', moverName: 'Maya', moverColor: 'copper', movedAt: '2026-07-21T10:00:00.000Z' }

  test('a ghost slot renders a GhostCard at its position', () => {
    render(<ColumnGhosts cardIds={['a', 'b']} ghosts={[{ position: 1, age: 1, approximate: false }]} info={info} />)
    expect(screen.getByText('Fix login bug')).toBeInTheDocument()
    expect(screen.getByText(/Maya moved this/)).toBeInTheDocument()
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.getByText('b')).toBeInTheDocument()
  })

  test('no ghosts -> no GhostCard', () => {
    render(<ColumnGhosts cardIds={['a']} ghosts={[]} info={info} />)
    expect(screen.queryByText(/moved this/)).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/moveGhosts.render.test.jsx`
Expected: FAIL — `GhostCard` import resolves (Task 6) but this file drives the interleave contract; it fails first because the file/import graph isn't wired until you add the real Column path. If it passes immediately (both deps already exist), proceed — it still guards the contract Column depends on.

- [ ] **Step 3: Compute placements in `BoardView`**

In `src/components/board/BoardView.jsx`, add imports:

```js
import { useGhostHoverStore } from '../../store/ghostHoverStore'
import { useSettingsStore } from '../../store/settingsStore'
import { deriveGhosts } from '../../lib/moveGhosts'
```

After `const boardColumns = useBoardStore(columnSelector)` (line ~19):

```js
  const ghostArmed = useSettingsStore((s) => !!s.ghostBoards[boardId])
  const hoverCardId = useGhostHoverStore((s) => s.hoverCardId)
  // Subscribe to ONLY the hovered card (null when not hovering) — keeps this
  // component off the full cards slice.
  const hoverCard = useBoardStore((s) => (ghostArmed && hoverCardId) ? s.cards[hoverCardId] : null)

  const ghostPlacements = useMemo(() => {
    if (!hoverCard?.last_move) return []
    const columnIds = boardColumns.map((c) => c.id)
    return deriveGhosts([hoverCard.last_move], columnIds).map((p) =>
      // Deleted origin column -> float at the top of the card's current column.
      p.columnId ? p : { ...p, columnId: hoverCard.column_id, position: 0, floating: true }
    )
  }, [hoverCard, boardColumns])

  const ghostInfo = hoverCard?.last_move ? {
    title: hoverCard.title,
    moverName: hoverCard.last_move.moved_by_name || 'Someone',
    moverColor: hoverCard.last_move.moved_by_color || null,
    movedAt: hoverCard.last_move.moved_at || null,
  } : null
```

Pass per-column ghosts in the `boardColumns.map` (line ~62):

```jsx
        {boardColumns.map((column) => (
          <Column
            key={column.id}
            column={column}
            boardId={boardId}
            onCardClick={onCardClick}
            onCreateCard={onCreateCard}
            onCompleteCard={completeCard}
            inlineCardId={inlineCardId}
            onInlineDone={onInlineDone}
            selectedCardId={selectedCardId}
            filters={filters}
            sortBy={sortBy}
            ghosts={ghostPlacements.filter((p) => p.columnId === column.id)}
            ghostInfo={ghostInfo}
          />
        ))}
```

- [ ] **Step 4: Interleave ghosts in `Column`**

In `src/components/board/Column.jsx`, add imports:

```js
import GhostCard from './GhostCard'
import { interleaveGhosts } from '../../lib/moveGhosts'
```

Add `ghosts = [], ghostInfo` to the destructured props (line 40):

```js
export default function Column({ column, boardId, onCardClick, onCreateCard, onCompleteCard, inlineCardId, onInlineDone, selectedCardId, filters, sortBy, dragHandleProps, ghosts = [], ghostInfo }) {
```

Replace the card `.map` inside `<SortableContext>` (lines 249-257) with an interleaved sequence:

```jsx
          {interleaveGhosts(filteredCards.slice(0, visibleCount).map((c) => c.id), ghosts).map((node, idx) => {
            if (node.type === 'ghost') {
              return ghostInfo ? (
                <GhostCard
                  key={`ghost-${idx}`}
                  title={ghostInfo.title}
                  moverName={ghostInfo.moverName}
                  moverColor={ghostInfo.moverColor}
                  movedAt={ghostInfo.movedAt}
                  age={node.ghost.age}
                  approximate={node.ghost.approximate}
                />
              ) : null
            }
            const card = filteredCards.find((c) => c.id === node.id)
            if (!card) return null
            const isInline = card.id === inlineCardId || (inlineCardId && tempIdMap?.[inlineCardId] === card.id)
            return isInline ? (
              <InlineCardEditor key={card.id} cardId={card.id} onDone={onInlineDone} />
            ) : (
              <SortableCard key={card.id} card={card} onClick={onCardClick} onComplete={onCompleteCard} isSelected={card.id === selectedCardId} />
            )
          })}
```

(The ghost is rendered inside `SortableContext` but is not one of its `items`, so dnd-kit ignores it — it stays inert.)

- [ ] **Step 5: Run the render test + full suite + build**

Run: `npx vitest run src/__tests__/moveGhosts.render.test.jsx`
Expected: PASS.

Run: `npm run test`
Expected: full suite PASS.

Run: `npm run build && npm run lint`
Expected: build succeeds; lint clean.

- [ ] **Step 6: Manual verification (two-tab)**

Start `npm run dev`. On a shared board in two sessions: move a card cross-column; in the other session arm the header **Ghosts** toggle and hover the moved card → a dashed ghost appears in the origin column at the moved-from slot, labeled "<name> moved this · <time>". Hover an un-moved card → nothing. Toggle off → nothing. Delete the origin column, then hover → the ghost floats at the top of the card's current column.

- [ ] **Step 7: Commit**

```bash
git add src/components/board/BoardView.jsx src/components/board/Column.jsx src/__tests__/moveGhosts.render.test.jsx
git commit -m "feat(board): render move ghosts on hover when ghost mode is armed"
```

---

## Self-Review

**1. Spec coverage:**
- `cards.last_move` + `card_activity.meta` → Task 1. ✅
- Enhanced move-logging (structured column ids + positions) → Task 3. ✅
- `deriveGhosts` pure, list-shaped; `buildLastMove` → Task 2. ✅
- `GhostToggle` header, per-board armed in `settingsStore`, off by default → Tasks 4, 7. ✅
- Inert transient phantom, hover-scoped → Tasks 5, 6, 8. ✅
- Every board / no tier gate → `GhostToggle` renders for any real `boardId`; no tier check anywhere. ✅
- Fallbacks: missing position → column-top `approximate` (Task 2 test); deleted origin column → float at current column top (Task 8, Step 3). ✅
- Full-trail seam: `deriveGhosts`/`interleaveGhosts`/`GhostCard age` all handle N; only the read path (`fetchCardMoveHistory`) is deferred and unbuilt, as specified. ✅
- Scalability constraints (zero-query hover, fire-and-forget writes, hover-scoped subscription to only the hovered card) → Tasks 3, 8. ✅

**2. Placeholder scan:** No TBD/TODO; every code step shows complete code; every test has real assertions. ✅

**3. Type consistency:** `buildLastMove(origin, landing, actor)` and its `last_move` shape (incl. `moved_by_color`) are consistent across Tasks 2, 3, 6, 8. `deriveGhosts(moves, columnIds)` and `interleaveGhosts(cardIds, ghosts)` signatures match between Task 2 and Task 8. `logCardMove(cardId, fromColumnId, toColumnId, fromPosition, toPosition)` consistent between Tasks 3 and its caller in `useBoardDnd`. `GhostCard` props consistent between Tasks 6 and 8. `ghostBoards`/`toggleGhostMode`/`isGhostArmed` consistent between Tasks 4, 5, 7, 8. ✅

**Note for the executor:** `moved_by_color` is an addition beyond the spec's listed `last_move` shape (spec omitted color). It's an intentional zero-lookup refinement so ghosts render in the mover's profile color without a members query — consistent with the approved mockup. Flag to the user only if they object to the extra field.
