# Board activity tracker — design

**Date:** 2026-07-23
**Status:** approved (brainstorm session; user approved design + full pipeline)

## What

A board-level activity feed: a `ClockCounterClockwise` button in the board
toolbar's collapsible tool cluster opens a Kolumn-style modal listing every
action taken on the board — who moved/renamed/completed/deleted/etc. what —
line by line, grouped by date, filterable by activity type. Card references
render with the card's icon and open the card; references to deleted cards
render inert.

## Data (migration `2026-07-23-board-activity.sql`)

`card_activity` today: `id, card_id (FK cascade), user_id, actor_name,
action, detail, meta jsonb, created_at`. Two problems: no board-scoped
query path, and card deletion cascades away all history.

Changes:
- `add column board_id uuid references public.boards(id) on delete cascade`
  — backfill from `cards.board_id`, then `alter ... set not null`; index
  `(board_id, created_at desc)`.
- `card_id`: drop the cascade FK, re-add as `references cards(id) on delete
  set null` (nullable). History now outlives the card.
- RLS: rewrite both policies to check board membership via `board_id`
  (member of the board OR of its workspace — same predicate the `cards`
  policies use).
- `supabase/schema.sql` updated to match (it is the canonical schema).

**Snapshot convention:** every `logActivity` call now merges
`{ card_title, card_icon }` into `meta` at write time (helper does this
automatically by reading the card from the store), so any row can render
its card chip forever, including after deletion.

`logActivity(cardId, action, detail, meta)` helper gains `board_id`
resolution (from the store card; the pre-delete `deleted` log passes it
explicitly) and the snapshot merge. Fire-and-forget as today.

## Action vocabulary (complete set)

Existing: `created, moved, renamed, updated_priority, updated_assignee,
updated_due_date, completed, reopened, archived, unarchived, attached`.

New loggers added in the slices:
- `deleted` — logged in `deleteCard` BEFORE the delete (undoable delete:
  log after the undo window commits, not on optimistic hide)
- `duplicated` — in `duplicateCard` (on the source card)
- `icon_changed` — `updateCard` when `icon` differs
- `description_edited` — `updateCard` when description differs (no diff in
  detail, just the event)
- `checklist_added` / `checklist_completed` — `updateCard` checklist diff:
  new item text(s) / newly-done item text(s); no event for unchecks or
  item deletions in v1
- `label_added` / `label_removed` — in `addLabelToCard` /
  `removeLabelFromCard`, detail = label text

## Type filter groups (UI)

Seven chips mapping to action sets (multi-select; empty = all):
| Chip | Actions |
|------|---------|
| Created | created, duplicated |
| Moved | moved |
| Edited | renamed, updated_priority, updated_assignee, updated_due_date, icon_changed, description_edited, checklist_added |
| Completed | completed, reopened, checklist_completed |
| Deleted | deleted, archived, unarchived |
| Labels | label_added, label_removed |
| Files | attached |

## UI — `BoardActivityModal`

- Trigger: `ClockCounterClockwise` icon button in the tool cluster
  (after Ghost), `TOOLBAR_ICON_BTN + TOOLBAR_BTN_FILL`, tooltip "Activity".
- Modal: `Modal` primitive, Create-Workspace anatomy — `text-xl
  font-semibold` "Activity" header + X close, `max-w-lg`,
  body `max-h-[65vh] overflow-y-auto`.
- Filter chips row under the header: `h-6 rounded-full border` chips,
  selected = `bg-[var(--color-mauve-cream)]` (app selection wash),
  unselected = sand border + muted text.
- List grouped by day: sticky-free plain headers — `Today`, `Yesterday`,
  else `MMM d` (`text-[11px] uppercase tracking-wide text-faint`,
  mono). Rows (`py-1.5 flex gap-2.5 items-start`):
  - actor `Avatar` size sm
  - sentence, 13px: **actor** verb phrase + card chip + detail. Verb
    phrases: "created", "moved", "renamed", "set priority", "assigned",
    "set deadline", "completed", "reopened", "archived", "restored",
    "deleted", "duplicated", "changed icon of", "edited description of",
    "added checklist item to", "checked off item on", "labeled",
    "unlabeled", "attached file to".
  - card chip: `DynamicIcon` (from meta snapshot, fallback FileText) +
    truncated title, `hover:underline cursor-pointer`, dispatches
    `kolumn:open-card` with the card id and closes the modal. Deleted
    (card_id null) → muted, no hover, no click.
  - detail rendered after the chip where present ("Backlog → Done",
    "high → low", label text, filename, date) in `text-muted`.
  - time: `font-mono text-[11px] text-faint` right-aligned (`HH:mm`).
- Data: `fetchBoardActivity(boardId, { before })` in a new
  `activitySlice` (or commentsSlice extension — implementer's plan
  decides): select from `card_activity` where `board_id` eq, order
  `created_at desc`, `limit 200`; "Show more" fetches the next 200 with
  `lt(created_at, oldestLoaded)`. Store shape:
  `boardActivity: { [boardId]: rows[] }` replaced on open, appended on
  page. No realtime subscription in v1.
- Empty states: no rows → EmptyState-style centered muted text
  ("Nothing yet — activity shows up as your team works"); filters that
  match nothing → "No matching activity".

## Testing

- Store: `fetchBoardActivity` query shape + pagination merge; logActivity
  snapshot merge (title/icon in meta) with mocked supabase.
- Component: day grouping (Today/Yesterday/date), chip filtering by
  group, deleted-card row renders muted and unclickable, card chip
  dispatches `kolumn:open-card`.
- Migration applied to live project via MCP by the controller; verified
  via information_schema + a backfill count check.

## Out of scope (v1)

- Realtime updates while the modal is open
- Unchecked/removed checklist item events
- Per-card activity view changes (existing `fetchActivity` untouched)
- Cross-board / workspace-level feeds
- Retention policy (rows kept indefinitely)
