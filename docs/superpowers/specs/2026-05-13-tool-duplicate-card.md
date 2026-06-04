# Tool spec — `duplicate_card`

**Date:** 2026-05-13
**Status:** Draft — 3 open questions.
**Scope:** Polish pass for the `duplicate_card` AI tool. Fifth of 18 per-tool polish passes (after `create_card`, `move_card`, `update_card`, `delete_card`).

## Surface

Pill-only tool. Same call path as the other card mutators — LLM emits the
tool call, executor runs against the pill's board scope.

## Intent

`duplicate_card` makes a copy of an existing card on the current board. The
common shape is *"duplicate Buy milk"* — produces a `"Buy milk (copy)"` card
in the same column. The duplicate is a fresh card (new id, new task_number,
`completed: false`) but inherits the source's description, labels, priority,
icon, assignee, due_date, and checklist items (all unchecked).

This is the **last single-card tool with a cross-board field** in its schema
(`to_board`). Polishing this closes the pill-scope consistency story: every
single-card mutator becomes uniformly board-scoped.

## Current state (three surfaces)

### 1. Schema — `supabase/functions/chat/tools.ts:155-167`

```
required: card_title
optional: to_board, to_column
```

Both cross-board fields present. `to_board` is the stale leak that move/update/delete already shed.

### 2. Prompt rules — `supabase/functions/chat/context.ts`

No `duplicate_card`-specific rules today. Inherits the general "use tools for create/move/update/delete" guidance.

### 3. Executor — `src/lib/toolExecutor.js:719-739`

- `findCardByTitle(params.card_title)` — **global search**, no pill scope.
- Calls `store.duplicateCard(card.id)` which creates a same-board same-column copy.
- If `to_board` or `to_column` provided, immediately moves the new card via `updateCard` — but the cross-board destination conflicts with pill scope.
- Returns `{ ok: true, cardId: newId }` — minimal.

### 4. Store — `src/store/boardStore.js:571-585`

```js
duplicateCard: async (cardId) => {
  const card = get().cards[cardId]
  if (!card) return null
  return get().addCard(card.board_id, card.column_id, {
    title: `${card.title} (copy)`,
    description: card.description || '',
    assignee: card.assignee_name || '',
    labels: card.labels ? [...card.labels] : [],
    dueDate: card.due_date || null,
    priority: card.priority || 'medium',
    icon: card.icon || null,
    completed: false,
    checklist: card.checklist ? card.checklist.map((item) => ({ text: item.text, done: false })) : [],
  })
}
```

Fields copied: description, assignee (legacy `assignee_name`), labels, dueDate, priority, icon, checklist (all items reset to `done: false`). `completed` reset to false. `assignees` array NOT copied (only legacy assignee_name) — possible bug worth a quick fix.

## Issues this polish pass addresses

1. **Global card search** — same problem move/update/delete had. Strict pill scope.
2. **No ambiguity detection.** Two cards with the same title on the same board → first-found wins, user duplicates the wrong one.
3. **Stale `to_board` cross-board field.** Pill is single-board; remove the field from the schema.
4. **`to_column` retains some value** — the user might want the duplicate to land in a different column on the same board ("duplicate Buy milk to Achieved"). Keep this, scope to source board.
5. **Result shape is minimal** (`{ cardId }`). Add the duplicated card snapshot so the chat UI / future tool-result loop can reference it.
6. **`assignees` array not copied** by store.duplicateCard — only legacy `assignee_name`. Bug worth flagging; either fix here or split into a separate boardStore polish.
7. **Title suffix on repeated duplicates.** Currently each duplicate gets `" (copy)"`, so a chain becomes `"Card (copy) (copy) (copy)"`. Q3 below addresses this.
8. **No cardId forward-compat field.** Add it for consistency with move/update/delete.

## Proposed behavior

### Inputs

| Field | Required | Description |
|-------|----------|-------------|
| `card_title` | yes | Case-insensitive match on the current board. |
| `to_column` | no | Destination column name on the current board. Defaults to source column. |
| `cardId` | no | Forward-compat. Internal — same pattern as move/update/delete. |

`to_board` is **removed** from the schema.

### Resolution rules

1. **Source card:** `cardId` (scope-checked) > `card_title` scoped to `params.boardId`. Defensive global fallback when boardId absent.
2. **Ambiguity:** multiple matches in scope → error with column hints.
3. **Target column:** `to_column` resolves on the source board. If omitted, duplicate lands in the source's column (next position).
4. **Title:** see Q3 below.
5. **Fields copied:** title (with suffix), description, priority, icon, labels (array copy), checklist (items copied with `done: false`), assignee, due_date. `completed` set to false. `assignees` array also copied (fixing the latent bug in store.duplicateCard).

### Success result

```ts
{
  ok: true,
  cardId: string,
  card: {
    id, title, task_number,
    description, priority, icon, labels, checklist,
    assignee_name, due_date, completed,
    column_id, position,
  },
  source: {
    cardId: string,
    title: string,
  },
  resolved: {
    board: { id, name },
    column: { id, title },  // destination column
  },
}
```

### Failure modes

| Case | Error |
|------|-------|
| `card_title` not found on current board | `` `Card "X" not found on board "Y"` `` |
| `cardId` doesn't resolve / wrong board | `Card is not on the current board` |
| Multiple matches in scope | `Multiple cards titled "X" on board "Y" (...). Be more specific.` |
| `to_column` not found on source board | `Column "Z" not found on "Y". Available: A, B, C` |
| `store.addCard` returns no id | `Failed to duplicate card` (existing fallback) |

## Out of scope for this pass

- T1-#1 mode parameter — pill scope already enforces single-board.
- T1-#3 tool-result loop — return rich shape now; protocol change later.
- The `assignees` array vs legacy `assignee_name` debt in boardStore — fix it inline as part of duplicate_card polish since it's a one-line addition, but a broader boardStore audit is future work.

## Open questions

**Q1 — Source scope (default-yes, mirrors prior tools):**
  (a) **Strict pill scope.** Recommended for consistency.
  (b) Pill scope + global fallback (rejected by prior tools).

**Q2 — `cardId` forward-compat field (mirrors prior tools):**
  (a) **Yes, schema field, no prompt change.**
  (b) Skip — title-only.

**Q3 — Title suffix on repeated duplicates:**
  (a) **Always append `" (copy)"`** — current behavior. A chain becomes `"Card (copy) (copy) (copy)"`. Simplest.
  (b) **Smart increment.** If source title already ends with `" (copy)"` or `" (copy N)"`, increment the counter: `"Card (copy 2)"`, `"Card (copy 3)"`. Cleaner for repeated duplications.
  (c) **No suffix.** The model picks a title; if it doesn't, the executor just leaves the original title (and DB-side enforcement allows duplicate titles since the schema does).

## Test plan

After Q1–Q3 resolve:

- Unit tests in `src/__tests__/toolExecutor.duplicate_card.test.js`:
  - Happy path: duplicate by card_title on pill board, same column.
  - With `to_column`: duplicate lands in target column.
  - cardId direct lookup.
  - cardId on another board → error (strict scope).
  - Card not found on current board → error names the board.
  - Multiple cards same title → error with column hints.
  - `to_column` not found on source board → error lists available columns.
  - Result shape: `source.title`, `card.title` (with suffix), `resolved.column` populated correctly.
  - `assignees` array preserved on copy (regression for the latent bug).
  - Title suffix behavior per Q3.
- Manual test: duplicate a real card, verify suffix and field carryover, attempt cross-board (should error / not be exposed in schema).
