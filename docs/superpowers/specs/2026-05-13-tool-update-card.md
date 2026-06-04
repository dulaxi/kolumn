# Tool spec — `update_card`

**Date:** 2026-05-13 (rev 2 — decisions locked)
**Status:** Decisions locked. Ready for implementation.
**Scope:** Polish pass for the `update_card` AI tool. Third of 18 per-tool polish passes (after `create_card` and `move_card`).

## Surface

`update_card` is a **pill-only** write tool, callable through the LLM path
only (no fast-path for partial updates — they require natural-language
parsing). Like `move_card` after its polish, source resolution must respect
the pill's board scope.

## Intent

`update_card` mutates one or more fields on an existing card on the current
board. The common shape is *"change the priority of Buy milk to high"* or
*"add 'pickup at noon' to the description of Buy milk."* Less common but
real: *"remove the due date from Buy milk"* — which is the question that
makes `update_card` more complex than the previous two tools.

## Current state (three surfaces)

### 1. Schema — `supabase/functions/chat/tools.ts:50-73`

```
required: card_title, updates
updates: { title, description, priority, icon, labels, checklist, assignee, due_date }
```

No `completed` field (completing a card requires the separate `complete_cards`
batch tool). No `cardId` (model can only resolve by title).

### 2. Prompt rules — `supabase/functions/chat/context.ts`

- One reminder line: *"When the user asks to change or update a card you just created, use update_card — do NOT create a new card. Match by the card title you used when creating it."*
- No rules about how to express clearing a field.
- No rules about ambiguity (multiple cards with same title).

### 3. Executor — `src/lib/toolExecutor.js:360-377`

- `findCardByTitle` — **global search**, no pill-board scope.
- Spreads `params.updates` and:
  - Normalizes `checklist: string[]` → `[{ text, done: false }]`.
  - Renames `assignee` → `assignee_name` (because `boardStore.updateCard` reads `assignee_name`, not `assignee`).
- Passes through to `store.updateCard(card.id, updates)`.
- Returns `{ ok: true }`. No info about what was changed, what the previous values were, or which card was hit.

## Issues this polish pass addresses

1. **Global card resolution.** Same problem `move_card` had: a card title that exists on multiple boards picks whichever Zustand yields first. Especially dangerous for updates because the user may not realize the wrong card was modified — at least with `move`, the card visibly relocates.

2. **No ambiguity detection.** Two cards with the same title on the same board → silent first-pick. For `update_card` the consequences are higher.

3. **No "clear field" semantics.** The schema's `updates` fields are all optional strings/objects. There's no way for the model to express "remove the due date" or "clear the assignee." Today the model would have to guess: empty string? Skip the field? Send `null`?

4. **No validation on updated fields.**
   - `title`: no length check, no capitalization (we cap at 200 + capitalize for create_card; should match here).
   - `description`: no 5000-char truncation (we truncate for create_card).
   - `icon`: no `LEGACY_ICON_REMAP` coercion.
   - Updates accept anything the schema allows, no executor-side discipline.

5. **Result shape is minimal.** Just `{ ok: true }`. No info about what changed, what was hit, or the new state. The future tool-result loop will want at least the cardId and the resolved card name.

6. **Same `assignee → assignee_name` API quirk** as `addCard` — undocumented in the executor.

7. **No `completed` field.** If the user says *"mark Buy milk as done"*, the model has to call `complete_cards` (a batch tool that moves the card to the last column). A single-card `completed: true` update would be a cleaner expression. Worth considering.

## Proposed behavior

### Inputs

| Field | Required | Description |
|-------|----------|-------------|
| `card_title` | yes | Case-insensitive match on the current board. |
| `updates` | yes | Object with fields to update. At least one field required. |
| `cardId` | no | Forward-compat (Q3). Internal — model shouldn't emit unless IDs are exposed in the prompt. |

### Updates object

| Field | Type | Behavior |
|-------|------|----------|
| `title` | string | Trimmed, 1–200 chars, first-letter capitalization (same rules as create_card). |
| `description` | string | Truncated to 5000 chars with `truncated` flag in result. |
| `priority` | enum | `low | medium | high`. |
| `icon` | string | Normalized via `LEGACY_ICON_REMAP`; drop malformed silently. |
| `labels` | array | `[{ text, color }]`. Replaces full label set (not a diff). |
| `checklist` | string[] | Replaces full checklist; each item becomes `{ text, done: false }`. |
| `assignee` | string \| null | Display name. **`null` explicitly clears** (Q2). |
| `due_date` | string \| null | `YYYY-MM-DD` or full ISO. **`null` explicitly clears** (Q2). |
| `completed` | boolean | If Q4 enables it. |

### Resolution rules

1. **Card lookup:**
   - If `cardId` provided: direct ID lookup. Must be on the pill's board (strict scope, same as move_card).
   - Else `card_title` case-insensitive on the pill's board only.
   - No card found → error with the source-board name.
   - Multiple cards with same title on source board → error with hints listing column for each match.

2. **Partial updates:** only fields present in `updates` are touched. Fields not in the request are left alone.

3. **Clear semantics:** explicit `null` clears a field. `undefined`/missing leaves it. Empty string `""` for description is *allowed* (it's a valid empty description), but for `assignee` / `due_date` / `icon`, empty string is treated as `null` (clear) — those fields have no meaningful empty-string semantics.

4. **Validation per field** (same patterns as create_card where applicable):
   - `title`: trim, length check, capitalization heuristic.
   - `description`: truncate at 5000.
   - `icon`: normalize via `LEGACY_ICON_REMAP`.
   - `priority`: schema enum already enforced.

### Success result

```ts
{
  ok: true,
  cardId: string,
  card: { id, title, task_number },
  resolved: {
    board: { id, name },
    column: { id, title },
  },
  changed: string[],      // ["priority", "due_date"] — fields actually written
  cleared: string[],      // ["assignee"] — fields explicitly set to null
  truncated?: boolean     // if description was truncated
}
```

### Failure modes

| Case | Error |
|------|-------|
| `card_title` not found on current board | `` `Card "X" not found on board "<board name>"` `` |
| Multiple matches on source board | `` `Multiple cards titled "X" on board "Y": one in To Do, one in Done. Be more specific.` `` |
| `cardId` provided but not on current board | `Card is not on the current board` |
| Empty `updates` object | `update_card requires at least one field in 'updates'` |
| `title` empty after trim | `Card title cannot be empty` |
| `title` > 200 chars | `Card title is too long (max 200 chars)` |

## Out of scope

Tracked in `2026-05-13-ai-workflow-rework-backlog.md`:

- T1-#3 tool-result loop — return rich result now, protocol change later.
- T2-#6 chat-mode branching — chat shouldn't call update_card; gated server-side once mode is implemented.
- T3-#14 expose card IDs in prompt — partial overlap with Q3 below.

## Decisions (locked 2026-05-13)

**D1 — Source scope: strict pill scope.** Same as move_card. Search only on
`params.boardId`'s board. Cross-board updates blocked. `cardId` lookups also
scope-checked.

**D2 — "Clear field" semantics: `null` clears, missing leaves alone.**
Uniform across all field types. The model can express "remove the due date"
as `updates.due_date: null`. Missing/undefined fields stay untouched. For
arrays (`labels`, `checklist`), both `null` and `[]` are treated as "clear to
empty array"; an array of items replaces wholesale.

**D3 — `cardId` schema field, prompt unchanged.** Same as move_card —
forward-compat field for when T3-#14 lands. Model can't fabricate IDs today
because they're not in the prompt. Description tells the model: *"Internal
use only — do not specify unless an explicit card ID was provided."*

**D4 — `completed: boolean` added; card stays in place when marked
complete.** Reasoning: column titles are user content (not semantic
markers). A board with columns *Economics / Things / Personal Development /
Achieved* has no clean "is this the done column?" signal. Decoupling
`completed` from column position makes the flag board-agnostic. Side note:
this surfaces an inconsistency with the existing `complete_cards` tool
(which auto-moves to the last column by position). That tool will need its
own polish pass to align — flagged for the `complete_cards` spec when we
get to it.

**Downstream UI consideration (not this pass):** completed cards in
non-"Done"-named columns may render the same as not-completed cards. The
UI may need a distinct visual treatment for `completed: true` regardless of
column. Tracked but not in scope.

## Test plan

After Q1–Q4 resolve:

- Unit tests in `src/__tests__/toolExecutor.update_card.test.js`:
  - Happy path: change one field (priority).
  - Happy path: change multiple fields.
  - cardId direct lookup.
  - cardId pointing to another board → error (strict scope).
  - Card title not found in scope → error names current board.
  - Multiple title matches → error with column hints.
  - Empty `updates` → error.
  - title update: trimmed, length-checked, capitalized.
  - description update: truncated to 5000 with flag.
  - icon update: legacy remap (zap → lightning); malformed dropped.
  - assignee `null` clears; existing assignee gone after.
  - due_date `null` clears.
  - completed: true (per Q4 outcome).
  - Result shape: `changed`, `cleared`, `resolved` populated correctly.

- Manual test in dev server: rename a card, change priority, clear due date, mark complete, try cross-board (should error).
