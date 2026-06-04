# Tool spec — `delete_card`

**Date:** 2026-05-13 (rev 2 — decisions locked)
**Status:** Decisions locked. Ready for implementation.
**Scope:** Polish pass for the `delete_card` AI tool. Fourth of 18 per-tool polish passes (after `create_card`, `move_card`, `update_card`).

## Surface

`delete_card` is a **pill-only** tool in practice. The schema is shared with
chat, but free tier blocks it via `PRO_ONLY_TOOLS` server-side, and the
chat-side write-tools strip is pending (backlog T1-#2). It's listed in
`DESTRUCTIVE_ACTIONS` so the chat path renders an in-chat approval card
before executing — but the **pill bypasses that entirely and executes
immediately**. That asymmetry is the most user-visible polish issue for this
tool.

## Intent

`delete_card` permanently removes a single card on the user's current board.
Common shapes:
- *"delete the buy milk card"*
- *"remove Fix login"*
- *"trash the standup notes one in To Do"* (ambiguous resolver needed)

Destructive enough that a fast-fingered typo could wipe real work, but
common enough that a hard "are you sure?" modal every time would be tedious.

## Current state (three surfaces)

### 1. Schema — `supabase/functions/chat/tools.ts:76-87`

```
required: card_title
optional: board
description: "Delete a card. Always ask the user for confirmation before executing this action."
```

The description tells the model to ask for confirmation — but the *executor*
doesn't enforce that. The model's "ask first" turn happens in *text*, then
the user replies "yes," then the model emits `delete_card`. The executor
just deletes.

### 2. Prompt rules — `supabase/functions/chat/context.ts`

Currently only the global *"Execute destructive actions (delete board,
delete column, remove member) without asking for confirmation first"*
**Never** rule — notably missing `delete_card` from that list. Inconsistent.

### 3. Executor — `src/lib/toolExecutor.js:562-567`

```js
if (action === 'delete_card') {
  const card = findCardByTitle(params.card_title)
  if (!card) return { ok: false, error: `Card "${params.card_title}" not found` }
  await store.deleteCard(card.id)
  return { ok: true }
}
```

- `findCardByTitle` — **global** search across all cards (no pill scope).
- No ambiguity check.
- No cardId support.
- Returns `{ ok: true }`. No info about what was deleted.

### 4. Destructive UI (chat only) — `src/store/chatStore.js:141`

When chat receives a destructive tool call, it sets the message's
`pendingToolCall.status = 'pending'` and renders an in-chat approval card
(approve/reject buttons). On approve, the executor runs. The pill never
hits this path — it calls `executeTool` directly.

## Issues this polish pass addresses

1. **Pill deletes without any user confirmation.** Most user-visible
   concern. The pill's "type and act" model is great for creates but
   risky for deletes. Today a tiny mistype like "delete Buy milk and the
   rest" could wipe one card and quietly produce no other tool call — the
   user has no recovery.
2. **Global card search.** Same problem move/update had: card titles
   collide across boards, wrong card gets deleted silently.
3. **No ambiguity detection.** Two cards with the same title on the same
   board → first-found wins. With deletes, this is catastrophic — the
   user can't restore the wrong one easily.
4. **Stale `board` field in schema.** Mirrors what `move_card` had
   before its polish. The pill is single-board; this field should go.
5. **`delete_card` is missing from the Never-without-confirmation prompt
   rule.** The rule mentions `delete_board`, `delete_column`,
   `remove_member` — but not `delete_card`. Either the rule should include
   it, or we accept that *all* card deletes go through an enforced UI
   gate (e.g., the proposed undo toast).
6. **Result shape is minimal.** `{ ok: true }` doesn't say what was
   deleted. For an undo flow (Q3 option b), we need enough info to recreate.

## Proposed behavior

### Inputs (schema)

| Field | Required | Description |
|-------|----------|-------------|
| `card_title` | yes | Case-insensitive match on the current board. |
| `cardId` | no | Forward-compat. Internal — same pattern as move/update. |

The `board` field is removed (pill scope handles it).

### Resolution rules

1. `cardId` (scope-checked) > `card_title` scoped to `params.boardId`.
2. Card not found → error names current board.
3. Multiple matches in scope → error with column hints, no silent first-pick.

### Success result

```ts
{
  ok: true,
  cardId: string,
  card: {
    // Enough info to render the undo toast and reconstruct on undo
    id, title, task_number,
    description, priority, icon, labels, checklist,
    assignee_name, due_date, completed,
    column_id, position
  },
  resolved: {
    board: { id, name },
    column: { id, title },
  }
}
```

The full card snapshot enables a true undo (`recreateCard(card)`) rather than
just visually-temporary deletion.

### Failure modes

| Case | Error |
|------|-------|
| `card_title` not found on current board | `` `Card "X" not found on board "Y"` `` |
| `cardId` doesn't resolve / wrong board | `Card is not on the current board` |
| Multiple matches | `Multiple cards titled "X" on board "Y" (one in To Do, one in Done). Be more specific.` |

## Out of scope

- T1-#1 mode parameter — already partially landed (boardId scope), full mode gating still pending.
- T1-#3 tool-result loop — we return rich result now; protocol change later.
- T3-#15 the broader destructive vs pro-only architectural reconciliation — see Q4 below for the narrow piece relevant to *this* tool.

## Decisions (locked 2026-05-13)

**D1 — Strict pill scope.** Same as move/update. Search only on
`params.boardId`'s board for the card; cardId lookups scope-checked.
Defensive global fallback only when boardId is absent (future non-pill caller).

**D2 — `cardId` forward-compat field.** Optional schema field with the
"Internal use only" description (same pattern as move/update). No prompt
change today.

**D3 — Delete + undo toast.** Card disappears immediately; a toast appears
with an Undo button via the existing `UndoListener` pattern.

**Important discovery during implementation prep:**
`store.deleteCard` already calls `undoableDelete()` internally — the undo
toast is wired at the **store level**, not the pill level. This means the
existing `await store.deleteCard(cardId)` call in the executor *already*
shows an undo toast (top-center, via the global `<Toaster>`). No new
`recreateCard` path needed in boardStore; no new toast wiring in
QuickAddBar. The polish for this pass is therefore just: scope, ambiguity,
schema cleanup, and result shape.

**D4 (REVERSED after manual verification) — Split the prompt rule, do NOT
add `delete_card` to the "ask first" list.** Initial decision was to include
delete_card in the destructive-confirm rule alongside delete_board / delete_column /
remove_member. In practice this caused the model to respond with text
*"Are you sure you want to delete X? This is reversible for 5 seconds..."*
instead of firing the tool — redundant with the undo toast.

The new rule splits by reversibility:
- `delete_board`, `delete_column`, `remove_member` → ask first in text. No undo.
- `delete_card` → fire immediately on explicit user intent. The undo toast IS the confirmation.

The phrasing in `context.ts` Never section was reworked so the model never adds a "let me confirm" turn before delete_card.

**Implied defaults (not asked, applied directly):**
- Card not found → error names the source board.
- Multiple matches in scope → error lists each card's column.
- Result shape: include the deleted card snapshot so future tool-result-loop
  work can surface the result, even though the undo doesn't need it (store
  handles undo internally).

## Test plan

After Q1–Q4 resolve:

- Unit tests in `src/__tests__/toolExecutor.delete_card.test.js`:
  - Happy path: delete by card_title on pill board.
  - cardId direct delete, in scope.
  - cardId on another board → error (strict scope).
  - Card not found on current board → error with board name.
  - Multiple cards same title → error with hints.
  - Result shape: card snapshot includes everything needed for undo.
- If Q3 picks (b): tests for the undo flow — verify a `recreateCard` path
  restores all fields, position included.
- Manual test: delete a real card, verify the chosen flow (Q3) feels right,
  cross-board attempt errors, undo (if applicable) restores correctly.
