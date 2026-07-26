# Chat Data Completeness — archived filtering, labels, assignees, checklist, snippets

**Date:** 2026-07-26
**Status:** Approved
**Origin:** Live QA found `search_cards` blind to labels; a full audit of the
AI's data visibility found five sibling gaps. This pass binds all six at once
instead of patching them as they're discovered.

## The six gaps (audit result)

1. **Archived cards leak** into the board snapshot, alerts, activity counts,
   search results, and summaries — no AI read path filters `card.archived`.
2. **Labels on cards** are invisible: search doesn't match them, results
   don't carry them, and the prompt shows only label *definitions* — which
   led the model to state "no cards have /atoms applied" about a label two
   cards carry.
3. **Assignees** are search-matched but omitted from result objects.
4. **Checklist progress** (done/total) is exposed nowhere.
5. **Description** is search-matched but dead-ends — no snippet in results
   and no card-detail tool, so "what is X about?" is unanswerable.
6. **Prompt board snapshot** lines carry only title + due date; no per-card
   label/assignee markers.

## Changes

### Executor (`src/lib/toolExecutor.js`)

Both read tools exclude `card.archived` unconditionally (no
`include_archived` param — YAGNI).

`search_cards`:
- Builds a per-card label-text list from `store.cardLabels` (cardId → Set of
  label ids) + `store.labels` (skip labels with `archived_at`).
- Query also matches label text. **Ranking: a label match ranks with title
  matches** (tier 1 — "what's labelled X" is exact intent), then the
  existing updated_at desc tiebreak; description/assignee matches stay
  tier 2.
- Result card objects gain: `labels: string[]` (texts; `[]` when none),
  `assignees: string[]`, `checklist: { done, total }` **only when the card
  has checklist items**, `description`: first 160 chars **only when
  non-empty** (trimmed).

`summarize_board`:
- Filters archived from cards, counts, totals, and overdue math.
- Per-card objects gain the same `labels` / `assignees` / `checklist`
  fields (same only-when-present rules). No description in summaries.

### Tool schemas (`supabase/functions/chat/tools.ts`)

- `search_cards` description: "…Matches card titles, descriptions, assignee
  names, and label text. Archived cards are never returned…"
- `summarize_board` description gains "Archived cards are excluded."

### Prompt (`supabase/functions/chat/context.ts`)

- The card fetch result is filtered to non-archived **before** every
  consumer (boardSummary, dueToday/overdue alerts, recentCreated/
  recentCompleted activity counts).
- New parallel query: `card_labels` rows for the fetched cards, joined
  against the already-fetched `labels` (skip `archived_at` labels) into a
  cardId → `["text", …]` map.
- Board-snapshot card lines gain compact only-when-present markers after
  the due date: `/label` per label and `@Assignee` per assignee — e.g.
  `"Fix header" due 2026-07-30 /atoms @Sam`. Applies to open and done
  lines. **Deliberately shared with the pill** (same builder) — the pill
  gains the same per-card awareness; this is an intentional cross-surface
  improvement, not leakage.

### Out of scope (explicitly deferred)

- Comments & attachments exposure (own tool + design; backlog).
- Checklist item texts / full descriptions in context (bloat; a future
  card-detail tool's job).
- created_at/updated_at recency queries (activity counts cover it).
- Notes (UI unwired; T3-#16 wants those tools dropped).
- New tools; caps changes (search 20 / summarize 15 stand).

## Testing

- Vitest (`chatReadTools.test.js` extended): label-text match + tier-1
  ranking; archived-label exclusion from matching; archived-card exclusion
  from search AND summarize (results, counts, totals, overdue); new result
  fields present with only-when-present semantics (no `checklist` key
  without items, no `description` key when empty, `labels`/`assignees`
  arrays); description snippet truncation at 160.
- Deno: `deno check` (context.ts has no test harness; prompt changes are
  verified by review + live).
- Live: redeploy (expect v49); re-run the user's exact failing question
  ("what tasks are labelled atoms?") → both /atoms cards found, named, and
  in the rail; verify an archived card no longer appears in any answer.
