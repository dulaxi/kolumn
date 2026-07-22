# Move Ghosts — Design Spec

**Date:** 2026-07-21
**Status:** Approved (design + visual); pending implementation plan
**Context:** Next piece of the "invest in teams / make collaboration legible"
direction, following board presence. Presence answers *who is here now*; Move
Ghosts answers *what changed while I was away, and who did it* — the
asynchronous complement. Works on every board, including solo.

## Goal

On any board, a header **ghost toggle** arms "ghost mode." While armed, hovering
a card reveals a faded **ghost** of that card pinned to the exact slot it was
last moved from, tagged with who moved it and when. The ghost disappears on
mouse-out. Every move is also recorded to durable, structured history so a
future "see the whole trail" tier is a read-and-render extension, not a rewrite.

## Scope

**In scope (v1):**
- `cards.last_move jsonb` — denormalized pointer to a card's most recent move,
  written on every move, synced by existing realtime.
- Structured move history: a `meta jsonb` column on the existing `card_activity`
  table, populated on `'moved'` events with from/to column ids and positions.
- Enhanced move-logging in the drag-end flow to capture structured
  column ids + position indices (today it logs column *names* as text only).
- `GhostToggle` in the board header (Phosphor `Ghost` icon), armed state
  remembered per board in `settingsStore`. Off by default.
- Ghost rendering: a non-interactive, dashed/translucent phantom card inserted
  transiently at the origin slot while the source card is hovered.
- `deriveGhosts(moves[], columns, cards)` — a pure, list-based placement
  selector (v1 feeds it `[last_move]`; the future tier feeds it full history).
- Works on **every** board — personal, shared, workspace — with **no tier
  gate** and no workspace gate.

**Out of scope (recorded now, built later):**
- The "see all past moves" ghost trail as a shipped feature (the *rendering*
  supports N ghosts; the data is fully captured; only the read path +
  tier gate + trail visuals are deferred).
- A board-wide activity feed UI; move analytics.
- Any change to card-data realtime sync (Move Ghosts is additive; `last_move`
  rides the existing card row).
- Cursors / live drag broadcast (a different, synchronous feature).

## Architecture

Two writes happen on every card move, both from the **existing drag-end flow**
(`useBoardDnd.handleDragEnd` → `persistCardPositions` / `logCardMove`). Neither
blocks the drag; both are fire-and-forget like the current `logActivity`.

### Data model

**1. `cards.last_move jsonb` (new column, nullable).** The single most-recent
move. `null` until a card's first move.

```
{
  from_column_id: uuid,
  from_position:  int,
  to_column_id:   uuid,
  to_position:    int,
  moved_by_id:    uuid,
  moved_by_name:  text,
  moved_at:       timestamptz (ISO string)
}
```

Rides on the card row, so the **existing realtime `cards` subscription** keeps
ghost data fresh live — no new channel, no new subscription.

**2. `card_activity.meta jsonb` (new column, nullable).** The existing
append-only activity table already logs `'moved'` rows with `actor_name`,
`detail` (`"To Do → Doing"` text), and `created_at`. We add a `meta` column and,
on `'moved'` events, populate it with the structured payload:

```
{ from_column_id, from_position, to_column_id, to_position }
```

The existing text `detail` is preserved (the per-card activity list in
`fetchActivity` keeps working unchanged). `meta` is what makes the history
queryable and position-accurate — the durable source of truth for the future
full-trail tier. It is append-only: **every** move is recorded, not just the
last, so no history is ever lost.

### Why both `last_move` and `card_activity.meta`

- `last_move` is a **fast denormalized pointer** — already loaded with the card,
  zero queries, instant hover. It is the v1 read path.
- `card_activity.meta` is the **full append-only trail** — one row per move,
  queried on demand. It is the future-tier read path (`fetchCardMoveHistory`,
  a documented but unbuilt seam in v1).

`last_move` is derivable from the latest `card_activity` moved row; it exists
purely so the common case (show the last move) needs no query.

### Move-logging enhancement

`logCardMove(cardId, fromColumnId, toColumnId)` today writes only the text
`detail`. The move flow must be extended to also know **positions**:

- On drag-end, the code already computes affected cards and the dragged card's
  new column. Capture the dragged card's `from_column_id` + `from_position`
  (its origin index, from `dragOriginRef` + pre-move order) and
  `to_column_id` + `to_position` (its landing index).
- Write `cards.last_move` with that payload + actor (`authStore.profile`).
- Write the `card_activity` row with `meta` set.

**Move granularity (v1):** v1 records moves at the same granularity the
existing activity log already uses — **cross-column moves** (the dragged card
changed column). Same-column reorders are *not* recorded as moves in v1
(matches today's `logCardMove`, which only fires on a cross-column move, and
matches the "moved from which column" framing). Recording same-column reorders
is a possible later addition; `deriveGhosts` still handles the same-column case
defensively so no code change is needed if that data ever appears.

**Position fallback:** moves made *before* this ships have no structured
position (column-name text only). For those, `deriveGhosts` falls back to the
origin **column** at index 0 (top), `approximate = true`. Exact-slot ghosts
apply to moves made after ship. This is expected and must be handled, not
treated as an error.

## Components

### `GhostToggle` (new) — board header
- Phosphor `Ghost` icon + "Ghosts" label, placed in the board header near
  `PresenceBar`.
- Armed state stored per board in `settingsStore` (e.g.
  `ghostBoards: { [boardId]: boolean }`), so it persists across reloads and is
  independent per board. Off by default.
- Armed styling reuses the lime **state** vocabulary: `--accent-lime-wash`
  background, `--accent-lime-dark` text/border tint, plus a small state dot.
  (Lime is a state color here, never a button fill — per coherency rules.)

### Ghost rendering (in the board / column render path)
- When the board is armed **and** a card is hovered **and** that card has ≥1
  ghost from `deriveGhosts`, render each ghost as a **transient phantom** in its
  origin column at its slot.
- Visual (from approved mockup):
  - 16px radius (matches Kolumn card shape).
  - `1.5px dashed` border in the mover's profile colour at ~55% alpha.
  - Translucent hatched fill (repeating-linear-gradient in the mover's colour at
    low alpha) so it reads as unmistakably not-a-real-card.
  - Corner avatar (mover's initial in profile colour, echoing the presence
    halo) + an inline mono footer: `Maya moved this · 2h ago`.
  - Title in muted text.
  - `ghost-in` entrance animation (respecting `prefers-reduced-motion`).
- **Inert:** `pointer-events: none`, not draggable, excluded from the
  `DndContext` / `SortableContext` and from collision detection. It never
  participates in position persistence.
- Full-trail (future): `deriveGhosts` returns N placements; the renderer maps
  over them; older ghosts fade progressively (`data-age` → opacity decay:
  ~0.62 / 0.4 / 0.26). v1 only ever passes one move, so at most one ghost shows.

## Data flow

```
drag-end (useBoardDnd.handleDragEnd)
  ├─ persistCardPositions(...)                       (existing)
  ├─ compute {from_column_id, from_position,
  │           to_column_id, to_position}             (new)
  ├─ write cards.last_move  (fire-and-forget)        (new)
  └─ logCardMove → card_activity row + meta          (enhanced)

open board
  └─ existing cards fetch + realtime sub → card.last_move present on each card

arm ghost toggle → hover card
  └─ deriveGhosts(card.last_move ? [card.last_move] : [], columns, cards)
       → [{ columnId, position, move, age }]  → render phantom(s)
  mouse-out → remove phantom(s)
```

## `deriveGhosts` — the pure placement selector

```
deriveGhosts(moves, columns, cardsById) -> Array<{
  columnId,        // origin column to render the ghost in
  position,        // index within that column's card list
  move,            // the move record (for who/when)
  age,             // 1 = most recent … N = oldest (drives opacity)
  approximate      // true when position was unknown (pre-enhancement move)
}>
```

Rules:
- `moves` ordered newest → oldest. `age = index + 1`.
- If `move.from_column_id` exists in `columns` → place in that column.
  - `from_position` present → that index; else `position = 0`,
    `approximate = true`.
- If the origin column no longer exists (deleted) → the placement's `columnId`
  is `null`; the renderer shows a floating fallback ghost near the source card
  labelled `moved from a deleted column`.
- Same-column move (`from_column_id === to_column_id`) → ghost renders in that
  column at `from_position`. (Defensive: v1 does not generate these, but the
  selector handles them for forward-compatibility.)
- Pure: no React, no Supabase, no `Date.now()` in the derivation itself
  (relative "2h ago" formatting is a separate presentational helper).

## Error handling & edge cases

- **No `last_move`** → `deriveGhosts` returns `[]` → no ghost (the common case
  for un-moved cards; hover shows a quiet "no moves yet" affordance only when
  armed).
- **`last_move` write fails** → swallowed like `logActivity`; the drag and
  persist succeed regardless. Ghost data is best-effort, never load-bearing.
- **Deleted origin column** → floating fallback ghost (above).
- **Pre-enhancement move (no position)** → column-top fallback, `approximate`.
- **Realtime conflict** → none introduced: `last_move` is a field on the card
  row under the same last-write-wins sync already in place. No new channel.
- **Disarmed** → no hover handler effect; nothing renders.

## Testing

- **Pure/unit — `deriveGhosts`:** exact-slot placement; column-top fallback when
  position missing (`approximate`); deleted-column → `null` columnId; same-column
  move; empty `moves` → `[]`; N-move ordering + `age` assignment.
- **Pure/unit — `buildLastMove(origin, landing, actor)`:** constructs the
  `last_move` payload from a move's from/to column+position and actor.
- **Thin wiring (component, mocked store):** arming/disarming toggles hover
  behaviour; hovering a card with `last_move` inserts exactly one inert phantom
  in the right column/slot; mouse-out removes it; a card with no `last_move`
  renders none.
- **Manual:** two sessions on a shared board — move a card, the other reloads /
  observes the ghost at the origin slot with correct mover + time; delete the
  origin column and confirm the floating fallback; toggle off → clean board.

## Success criteria

On any board, arming the ghost toggle and hovering a moved card shows a faded,
inert placeholder in the exact slot it left, attributed to the mover with a
relative time — sourced from data that was captured whether or not you were
online when the move happened. Every move is durably recorded with structured
positions, so the future full-trail tier needs only a read path and trail
visuals. Zero impact on card-data correctness, drag behaviour, or the existing
per-card activity list.
