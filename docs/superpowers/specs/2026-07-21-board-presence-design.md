# Board Presence — Design Spec

**Date:** 2026-07-21
**Status:** Approved (design); pending implementation plan
**Context:** First piece of the "invest in teams / real collaboration" direction.
Kolumn already has live board sync, comments, @mentions, and an activity log —
but nothing that lets you *see the other people*. Presence is the missing,
most-visceral multiplayer signal, and it makes every shared board feel alive.

## Goal

When two or more people are on the same board, each person can see:
1. **Who else is here** — avatars in the board header with a live count.
2. **Who's on which card** — a subtle cue on a card (and in its detail panel)
   when a teammate is viewing/editing it.

Presence is **ephemeral and view-scoped**: it reflects "right now, on this
board," and disappears when people leave. No history, no persistence.

## Scope

**In scope (v1):**
- Per-board presence via Supabase Realtime Presence (no database).
- Board-header presence bar (stacked avatars + count + name tooltips).
- Per-card presence cue (corner avatar + soft ring; "Maya is here" line in the
  card detail panel).
- Correct lifecycle: join on board open, update on card open/close, leave on
  board switch / unmount / tab close.

**Out of scope (clean fast-follows, explicitly not v1):**
- Live card *movement* as others drag (drag-position broadcast + conflict UI).
- Cursors.
- Workspace-level "who's online across all boards."
- Any change to card-data realtime sync (presence is additive and separate).

## Architecture

**Transport: Supabase Realtime Presence.** One presence channel per board,
named `presence-board-{boardId}`. Presence is purpose-built for this: each
client `track()`s a small state object; the channel emits `sync` / `join` /
`leave`; disconnects (tab close, network drop) auto-remove the client. No
schema, no heartbeat timer, no cleanup job.

**Presence payload** each client tracks (identity from `authStore.profile`):
```
{ user_id, name, color, icon, card_id: string | null }
```
`card_id` is the card the user currently has open (detail panel or inline
editor), or `null` when they're just viewing the board.

**State: a focused `presenceStore` (Zustand).** It owns the channel lifecycle
and derives view-ready state. Chosen over a React Context to match the
codebase's Zustand convention; chosen over a DB table because presence is
ephemeral and Supabase Presence already handles join/leave/disconnect.

### `presenceStore` public API
```
state:
  members: Array<{ user_id, name, color, icon, card_id }>   // everyone here (incl. self)
  byCard:  Record<cardId, Array<member>>                    // derived: who's on each card

actions:
  joinBoard(boardId): subscribe to presence-board-{boardId}, track self ({card_id:null}),
                      wire sync/join/leave -> recompute members + byCard.
  setViewingCard(cardId | null): update self's tracked card_id (re-track).
  leaveBoard(): untrack + remove the channel; clear members/byCard.
```
`members` includes self (so the header can show "you + others"); `byCard`
consumers exclude self for the "someone *else* is here" cues. Dedup by
`user_id` (multiple tabs from one person collapse to one entry; the most recent
`card_id` wins).

## Lifecycle wiring (the entire integration surface — 3 call sites)

- **Board view** (the component that owns the active board — `BoardView` /
  `BoardsPage`): `joinBoard(boardId)` when a board becomes active; `leaveBoard()`
  on unmount and before switching to a different board.
- **`CardDetailPanel`**: `setViewingCard(cardId)` on open, `setViewingCard(null)`
  on close.
- **`InlineCardEditor`**: same as the detail panel (a card being created/edited
  inline also counts as "viewing" it).

## Components

- **`PresenceBar`** (new) — rendered in the board header. Overlapping `Avatar`s
  (reusing profile color/icon), a "+N" overflow chip past ~4, a "N here" count,
  and name-on-hover tooltips. Hidden when you're the only member (no noise on
  solo/personal boards).
- **Card cue** (in `Card.jsx`) — when `byCard[cardId]` contains someone *other
  than you*, render a small avatar in a corner and a soft ring around the card.
- **Card-detail cue** (in `CardDetailPanel`) — a quiet "Maya is here" line when
  others share the open card.

All visuals reuse existing primitives (`Avatar`, `resolveProfileColor`) and
tokens — no new color/spacing vocabulary.

## Identity, self, and dedup

- Name/color/icon come from `authStore.profile` at join time.
- The UI **always excludes the current user** from "someone else" cues (card
  ring, card avatar, "is here" line). The header bar may show you subtly, but
  the count reads naturally.
- **Multiple tabs** from the same `user_id` collapse to a single person in all
  views; their effective `card_id` is the most recently tracked one.

## Edge cases

- **Disconnect / tab close** → Supabase Presence removes the client
  automatically; no ghost avatars.
- **Solo / personal board** → bar hides when alone; no card cues (self is
  excluded). Presence still runs harmlessly.
- **Board switch** → `leaveBoard()` before `joinBoard(next)` so channels don't
  leak; only one presence channel is active at a time.
- **No interaction with card-data sync** → presence is a separate channel and
  never writes card state, so it cannot regress the realtime overwrite-guard
  work from the audit.
- **Auth not ready** → `joinBoard` no-ops until a profile is available.

## Testing

- **Unit (pure):** `presenceStore`'s event→state derivation — feed mocked
  `sync`/`join`/`leave` payloads and assert `members` and `byCard`, including
  dedup-by-user_id, most-recent-card-wins, and self-exclusion helpers.
- **Thin wiring:** channel subscribe/track calls are a small adapter; covered
  by mocking the supabase channel in the store test.
- Manual: two browser sessions on one shared board — avatars appear/disappear,
  opening a card lights it up for the other person, closing clears it, closing a
  tab removes the avatar.

## Success criteria

Two people on the same board each see the other's avatar in the header within a
second, see a card light up when the other opens it, and see it clear when they
close it or leave — with zero impact on card-data correctness and no persisted
presence state.
