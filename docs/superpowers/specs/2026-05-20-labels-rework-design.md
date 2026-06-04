# Labels Rework — Design Spec

**Branch:** `development`
**Date:** 2026-05-20
**Status:** Approved by user, ready for implementation planning

## 1. Background

Card labels in Kolumn today are stored as a `jsonb` array of `{text, color}` objects on each `cards` row. There is no board-level (or workspace-level) label entity. This denormalization causes a set of compounding problems:

- **Fragmentation.** Same conceptual label exists as independent strings across cards (`/Frontend`, `/frontend`, `/front-end`). No rename or merge operation propagates.
- **Color drift per card.** Same text can carry different colors on different cards. There is no canonical color for a label.
- **8-vs-9 color drift across surfaces.** The AI tool schema accepts 8 colors; the human color picker offers 9 (`neutral` + 8). `neutral` is unreachable for the model.
- **Color invisible by default.** The default card rendering renders labels as muted gray prose with no color cue, so the color the user chose isn't actually shown unless they discover the alt rendering.
- **AI invents labels every turn.** The model has no view of existing labels, so it generates stylistic variants that fragment the taxonomy further.
- **Defense-in-depth helpers paper over the architecture.** `dedupLabels()` in `CardDetailPanel.jsx` exists to scrub duplicates that a unique constraint would have prevented.

This spec replaces the embedded structure with a board-scoped registry, normalizes the AI surface, and adds a management UI — without changing the existing card-render visual surface.

## 2. Goals and non-goals

### Goals
- A first-class `labels` entity scoped per board, with case-insensitive uniqueness.
- Free-text label entry with autocomplete from the registry; typing a new text creates a new label.
- Server-side normalization shared by the human UI and the AI tool path.
- A label-management surface (rename, merge, archive, recolor) reachable from both the board header and the autocomplete dropdown footer.
- AI model sees the existing labels per board and is steered to reuse them; no new AI tools added.

### Non-goals (this rework)
- Workspace-scoped labels.
- Migration of existing card-label data (none preserved).
- Changes to card-render styling (`Card.jsx` JSX, `LABEL_BG`/`LABEL_OUTLINE` tokens, tap-to-toggle, `settingsStore.labelStyle`).
- AI tools for rename/merge/archive.
- Label icons, label permissions, or cross-board label operations.
- Tying this rework's completion to T1-#3 (tool-result loop) — that backlog item is complementary but not a prerequisite.

## 3. Decisions log

| # | Topic | Decision | Rationale |
|---|---|---|---|
| 1 | Scope | Board-scoped. | Solves the dominant pain (fragmentation) without locking the design into workspace-scoping ambiguities. Migrating later to workspace is non-breaking. |
| 2 | Creation model | Free-text + autocomplete. Server upserts into registry. | Matches the existing slash-command aesthetic, kills fragmentation by surfacing matches at the point of typing, and keeps the "Enter to create" friction at one keystroke. |
| 3a | Render toggle | Status quo — tap-to-toggle stays. | Visual surface is intentionally out of scope; minimizes user-visible disruption. |
| 3b | Renderings | Default `/text` colorless and alt outline-pill both stay byte-for-byte. | Same reason as 3a. |
| 4 | AI surface | Hybrid — model sees labels in system prompt; no new tools; server normalizes; deterministic hash-based color for unseen labels. | Highest leverage change is the model *seeing* existing labels. New tools would expand the surface without commensurate value. |
| 5 | Management UI | Shared modal opened from Board header menu *and* autocomplete dropdown footer. | Discoverability at the point of pain plus an obvious administrative home. |
| 6 | Migration | None — drop `cards.labels` column; new tables come up empty. | No real users; cleanest schema; no banner, no dual-write, no conflict-resolution heuristics. |

## 4. Data model

### 4.1 New tables

```sql
create table labels (
  id           uuid primary key default gen_random_uuid(),
  board_id     uuid not null references boards(id) on delete cascade,
  text         text not null check (length(trim(text)) > 0 and length(text) <= 64),
  color        text not null check (color in ('red','orange','yellow','green','blue','purple','pink','gray')),
  created_at   timestamptz not null default now(),
  archived_at  timestamptz
);

create unique index labels_board_text_lower_uq
  on labels (board_id, lower(text))
  where archived_at is null;

create index labels_board_id_idx on labels (board_id);

create table card_labels (
  card_id    uuid not null references cards(id) on delete cascade,
  label_id   uuid not null references labels(id) on delete cascade,
  position   smallint not null default 0,
  created_at timestamptz not null default now(),
  primary key (card_id, label_id)
);

create index card_labels_label_id_idx on card_labels (label_id);
```

### 4.2 Dropped column

```sql
alter table cards drop column labels;
```

### 4.3 Schema rationale

- **Case-insensitive unique partial index** (`where archived_at is null`) allows the same text to be reused after archiving, without name collisions on active labels.
- **`archived_at` not hard delete** preserves history and keeps `card_labels` joins intact if a label is archived while attached. Archived labels are hidden from autocomplete and the registry view.
- **`position smallint`** is allocated now for future per-card label ordering — costs nothing to add at creation, expensive to add later.
- **`color` as text + check constraint** instead of a Postgres `enum` — easier to extend or migrate.
- **`length(text) <= 64`** — defensive limit; current frontend has no length cap.
- **Cascade deletes** on both FKs — card deletion or board deletion cleans up join rows.

### 4.4 RLS

Both tables inherit access via the board:

- `labels` policies: SELECT/INSERT/UPDATE/DELETE if `auth.uid()` is a member of `labels.board_id` (mirroring existing `cards` policies).
- `card_labels` policies: SELECT/INSERT/UPDATE/DELETE if `auth.uid()` has access to the card (joined through `cards → boards`).

Exact policy SQL is modeled on existing `cards` table policies.

### 4.5 Realtime

`boardStore` subscribes to `postgres_changes` on `labels` (filtered by `board_id` of the active board) and `card_labels` (filtered indirectly through the cards subscription). Existing subscription lifecycle (auth-bound, torn down on unmount) is extended to cover both tables.

## 5. Server-side API

Mutations that require normalization (text matching, color assignment, multi-row transactions) route through Postgres functions so the human UI and the AI tool path share one path. Idempotent single-row writes (rename, recolor, archive, detach) go direct to the table — RLS still protects them.

### 5.1 `upsert_label(p_board_id, p_text, p_color default null) returns uuid`

- Trims `p_text`; raises if empty.
- Looks up an existing active label by `lower(text)`; returns its id if found.
- Otherwise inserts a new label. If `p_color` is null, picks color via `hashtext(lower(text)) % 8` against the 8-color palette.
- Returns the resolved label id.
- `security definer`, `search_path = public` pinned.

### 5.2 `attach_label_by_text(p_card_id, p_text, p_color default null) returns uuid`

- Looks up the card's `board_id`.
- Calls `upsert_label`.
- Inserts `(card_id, label_id)` into `card_labels` with `on conflict (card_id, label_id) do nothing`.
- Returns the label id.

### 5.3 `merge_labels(p_from_id, p_into_id) returns void`

- Inserts `(card_id, p_into_id)` for every row currently in `card_labels` with `label_id = p_from_id`, ignoring conflicts.
- Deletes the old join rows.
- Deletes the `p_from_id` label row.
- Single transaction; realtime events fire for every affected card.

### 5.4 Direct table writes (allowed)

- `update labels set text = ?` for rename. Hits the unique index on conflict → caller surfaces a "merge instead" toast.
- `update labels set color = ?` for recolor.
- `update labels set archived_at = now()` for archive; `update ... set archived_at = null` for unarchive.
- `delete from card_labels where card_id = ? and label_id = ?` for detach.

These don't need RPCs because they're idempotent single-row writes that RLS already protects.

## 6. Frontend changes

### 6.1 Store

`boardStore` state shape:

```js
{
  cards:      { [id]: <card without `labels` field> },
  labels:     { [id]: { id, board_id, text, color, archived_at, created_at } },
  cardLabels: { [cardId]: Set<labelId> },
}
```

`selectors.js` additions:

- `selectCardLabels(cardId)(state)` — returns the active label objects for a card, or a module-level `EMPTY_LABELS` frozen array. Stable identity prevents unnecessary `Card.jsx` re-renders.
- `selectBoardLabels(boardId)(state)` — returns active labels for the board, sorted by `lower(text)`.
- `selectBoardLabelByText(boardId, text)(state)` — case-insensitive lookup, used by the autocomplete.

New store actions:

- `addLabelToCard(cardId, text, color?)` → RPC `attach_label_by_text`.
- `removeLabelFromCard(cardId, labelId)` → direct delete on `card_labels`.
- `renameLabel(labelId, newText)` → direct update; surface unique-violation toast.
- `updateLabelColor(labelId, color)` → direct update.
- `mergeLabels(fromId, intoId)` → RPC `merge_labels`.
- `archiveLabel(labelId)` / `unarchiveLabel(labelId)` → direct update on `archived_at`.

Optimistic updates: per-operation optimism against `cardLabels` and `labels`. No temp-id scheme is needed — `upsert_label` returns a real id in one round-trip, so optimistic attach uses the real id once available. The one case that holds local state without a real id is `InlineCardEditor`'s pending list for a card that hasn't been inserted yet; those entries are flushed via `attach_label_by_text` after the card insert resolves.

### 6.2 Card.jsx

One change. The destructure at the top swaps from `const { ...labels, ... } = card` to:

```js
const labels = useBoardStore(selectCardLabels(card.id))
```

The JSX block (lines 111–137 with the `labelStyle === 'alt'` branch and the tap-to-toggle handler) stays byte-for-byte identical.

### 6.3 LabelAutocomplete.jsx (new)

Shared component used by `InlineCardEditor` and `CardDetailPanel`.

Props:
- `boardId` — required.
- `excludeIds` — labels already attached to the card (hidden from the dropdown).
- `onPick(label)` — called when user selects an existing label.
- `onCreate(text, color)` — called when user creates a new label (color from the inline picker on the "Create new" row).
- `onManage()` — called when the user clicks the "Manage labels…" footer row.

Behavior:
- Filters labels by case-insensitive prefix first, then fuzzy contains.
- Keyboard nav: ArrowUp/Down to highlight, Enter to commit, Escape to close.
- Permanent footer row: **Manage labels…** → opens the management modal.
- Per-row display: color dot + text + (subtle) usage count.

### 6.4 InlineCardEditor.jsx and CardDetailPanel.jsx

Replace each existing `/label` input block with `<LabelAutocomplete>`.

`InlineCardEditor` local state:
- For a card being created (no `card.id` yet): `pendingLabels: Array<{text, color}>` accumulates additions. On save, after the card is created, `attach_label_by_text` is called for each pending entry against the new card id.
- For an existing card: each pick/create fires `addLabelToCard` immediately, optimistic.

`CardDetailPanel` keeps the existing color picker but renders it only on the "Create new label" row inside the autocomplete dropdown — picking an existing label uses that label's stored color.

Removed: the `dedupLabels` helper (DB unique constraint replaces it).

### 6.5 LabelManagerModal.jsx (new)

A single `Modal` showing a table of all active labels on the board.

Row contents: color dot (clickable → existing color picker), label text (click to inline-rename), usage count, overflow menu (`⋯`).

Overflow menu actions:
- **Merge into…** — opens a label picker; calls `mergeLabels(fromId, pickedId)`.
- **Archive** — calls `archiveLabel(id)`.

Bottom:
- **+ New label** button — opens a small "name + color" form, calls `upsert_label`.
- **Show archived** toggle — when on, shows archived labels with an **Unarchive** action.

Opened from:
1. Board header menu — new `Menu.Item` "Manage labels…".
2. `LabelAutocomplete` footer row.

Uses only existing primitives (`Modal`, `Menu`, `Input`, `Button`, `Tooltip`).

### 6.6 Other files

- `src/utils/schemas.js` — drop `labels` from card schemas; add `labelSchema` and `cardLabelSchema`.
- `src/utils/cardFilters.js:17` — rewrite filter to look up via `selectCardLabels`.
- `src/constants/colors.js:8` — `LABEL_COLORS` drops `'neutral'`. Both human picker and AI now share the 8-color set.
- `src/hooks/useCardEditState.js` — replace `labels` field with `labelIds` + `pendingLabels`.

### 6.7 Files explicitly NOT modified

- `src/utils/formatting.js` — `LABEL_BG`, `LABEL_BG_QUIET`, `LABEL_OUTLINE` survive untouched.
- `src/store/settingsStore.js` — `labelStyle` and `toggleLabelStyle` survive untouched.
- `src/index.css` — `--label-*` tokens survive untouched.

## 7. AI surface changes

### 7.1 System prompt (`supabase/functions/chat/context.ts`)

A sixth parallel Supabase query fetches labels for every accessible board:

```ts
supabase
  .from('labels')
  .select('id, board_id, text, color')
  .in('board_id', userBoardIds)
  .is('archived_at', null)
```

Per-board prompt assembly gains a `Labels:` line:

```
- "Marketing Q3" (4 columns, 23 cards)
  Columns: Backlog, In progress, Review, Done
  Labels: /campaign (blue), /design (purple), /copy (green), /urgent (red)
  …
```

New instruction rules added to the existing block:

> - Labels are per-board entities. The current labels on each board are listed above. When attaching a label that already exists on a board, pass its exact text — the server matches case-insensitively, so don't worry about casing. Only invent a new label name when none of the existing labels fit the user's intent. Never invent stylistic variants (e.g. `/front-end` when `/frontend` exists).
> - When you create a new label by passing a previously-unseen text, the server assigns its color deterministically. You may pass a color hint, but you don't have to — and the schema below no longer accepts colors.

### 7.2 Tool schemas (`supabase/functions/chat/tools.ts`)

For `create_card`, `update_card`, `update_cards`, `duplicate_card`: the `labels` argument changes from `Array<{text, color}>` to `Array<string>`.

```ts
labels: {
  type: "array",
  items: { type: "string" },
  description: "Label texts. The server matches case-insensitively against existing labels on the board; unseen texts create a new label with a deterministic color."
}
```

`update_card.labels` and `update_cards.labels` keep replace semantics (pass `["a","b"]` to make those the only labels; `null` or `[]` clears).

### 7.3 Tool execution (`supabase/functions/chat/index.ts`)

New helper:

```ts
async function resolveAndSyncLabels(supabase, cardId, boardId, texts) {
  if (texts === undefined) return  // no change requested
  const resolvedIds = []
  for (const text of texts ?? []) {
    const { data } = await supabase.rpc('upsert_label', { p_board_id: boardId, p_text: text })
    resolvedIds.push(data)
  }
  // sync card_labels: remove anything not in resolvedIds, add anything new
  if (resolvedIds.length === 0) {
    await supabase.from('card_labels').delete().eq('card_id', cardId)
  } else {
    await supabase
      .from('card_labels')
      .delete()
      .eq('card_id', cardId)
      .not('label_id', 'in', `(${resolvedIds.join(',')})`)
    await supabase.from('card_labels').upsert(
      resolvedIds.map((label_id) => ({ card_id: cardId, label_id })),
      { onConflict: 'card_id,label_id' }
    )
  }
}
```

Called from each of `create_card`, `update_card`, `update_cards`, `duplicate_card` after the card row is created/updated.

### 7.4 Tier gating

No changes to `tier.ts`. Labels remain non-gated as a field on already-gated tools.

## 8. Verification gates

Per implementation step:

1. **After schema migration:** Supabase MCP `get_advisors` (RLS + indexes); `list_tables` confirms structure; `execute_sql` for RPC unit cases (upsert idempotency, attach idempotency, merge with duplicate join row, archive + recreate same text).
2. **After boardStore changes:** `npm run test` for selector + reducer behavior (mocked RPC); two-tab manual realtime verification.
3. **After UI changes:** `npm run dev` walkthrough — add label by typing, autocomplete reuse, manage modal rename, manage modal merge, manage modal archive, settings parity.
4. **After AI changes:** `supabase functions deploy chat`; pill + chat exercises with new-label / existing-label / unseen-color cases; `get_logs` confirms prompt contains `Labels:` lines.

## 9. File map

### New
- `supabase/migrations/<timestamp>_labels_registry.sql`
- `src/components/board/LabelManagerModal.jsx` (~250 lines)
- `src/components/board/LabelAutocomplete.jsx` (~150 lines)
- `src/__tests__/labels.test.js`

### Modified
- `src/store/boardStore.js`
- `src/store/selectors.js`
- `src/components/board/Card.jsx`
- `src/components/board/InlineCardEditor.jsx`
- `src/components/board/CardDetailPanel.jsx`
- `src/components/board/Board.jsx` (board header menu addition)
- `src/hooks/useCardEditState.js`
- `src/utils/schemas.js`
- `src/utils/cardFilters.js`
- `src/constants/colors.js`
- `supabase/functions/chat/context.ts`
- `supabase/functions/chat/tools.ts`
- `supabase/functions/chat/index.ts`
- `supabase/schema.sql` (canonical full schema regenerated)

### Untouched (intentional)
- `src/utils/formatting.js`
- `src/store/settingsStore.js`
- `src/index.css`

## 10. Open follow-ups (out of scope)

These are explicitly *not* part of this rework but are made cheaper by it:

- **Workspace-scoped labels** — add `labels.workspace_id nullable`; XOR with `board_id`. Future rework.
- **Cross-board label search/filter** — filter cards by label across boards.
- **AI tools for admin ops** — `rename_label`, `merge_labels`, `archive_label` tool surface if usage justifies it.
- **Label icons** — Linear-style icon-per-label.
- **Per-card label ordering UI** — `position` column already in place.
