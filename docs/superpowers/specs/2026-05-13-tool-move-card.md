# Tool spec — `move_card`

**Date:** 2026-05-13 (rev 3 — cross-board removed entirely after manual verify)
**Status:** Implemented + tested + manually verified. Edge function v27 deployed.
**Scope:** Polish pass for the `move_card` AI tool. Second of 18 per-tool polish passes (after `create_card`).

## Surface

`move_card` is a **pill-only** tool (in the long-run; today it's still
reachable from chat until T1-#2 lands). It is called via the LLM path only —
there is no fast-path shortcut for moves the way there is for create. Every
move goes through `streamChat` → model emits `tool_use` → executor.

The pill always passes `board: boardName` and `boardId` to the executor (per
the `create_card` polish pass that updated `QuickAddBar`). `move_card`
currently ignores both, doing a **global card search across every board**.

## Intent

`move_card` relocates a single card. The common shape is "move <card> to
<column>" within the user's current board. The rare-but-supported shape is
cross-board moves: "move <card> to <column> on <other board>." Both should be
unambiguous — and when they can't be (multiple cards match the title), the
tool should fail loudly with a helpful error instead of silently picking one.

## Current state (three surfaces)

### 1. Schema — `supabase/functions/chat/tools.ts:37-48`

```
required: card_title, to_column
optional: to_board
```

No `boardId` injection. The model has no way to express card IDs (none in the
prompt snapshot).

### 2. Prompt rules — `supabase/functions/chat/context.ts`

No `move_card`-specific rules today. The model picks card titles out of the
board summary section of the prompt.

### 3. Executor — `src/lib/toolExecutor.js:239-253`

- `findCardByTitle(params.card_title)`: case-insensitive exact match, **searches every card globally** (any board, any column), returns first match in Zustand iterator order.
- `to_board` provided → resolve by name; not provided → keep current `card.board_id`.
- `findColumnByName(targetBoardId, params.to_column)`: case-insensitive exact match.
- Calls `store.updateCard(card.id, { column_id, board_id })` even when the card is already in the target column.
- Returns `{ ok: true }`. No info about what was moved.

## Issues this polish pass addresses

1. **Global card search is unsafe.** A user on board "Personal" saying "move bug-fix to Done" can silently hit a different board's card if "bug-fix" exists on multiple boards or only on a board the user wasn't thinking of. The pill knows which board we're on; we should use it.

2. **Ambiguity is silent.** Two cards with the same title in scope → the iterator's first one wins. The user gets no signal that the choice was even made.

3. **No "already there" detection.** Moving a card to its current column is a no-op-update — generates a wasted DB write and an `updated_at` bump.

4. **Column error doesn't list alternatives.** Mirror what `create_card` does ("not found on X. Available: A, B, C").

5. **Result shape is minimal.** Just `{ ok: true }`. The future tool-result loop will benefit from knowing what was moved and where from/to.

6. **`to_board` resolution is by name only.** Same risk as the old `create_card` `board` field — name collisions. Less acute here because cross-board moves are rarer, but worth fixing if we're going to expose card IDs (Q3 below).

## Proposed behavior

### Inputs

| Field | Required | Description |
|-------|----------|-------------|
| `card_title` | yes | Case-insensitive match within the source-board scope (see D1). |
| `to_column` | yes | Case-insensitive column name on the target board. |
| `to_board` | no | Destination board name (case-insensitive). Omit for same-board move. |
| `to_board_id` | no | Future: destination board ID. Preferred over `to_board` when both supplied. Not used today (model doesn't have IDs in the prompt). |
| `cardId` | no | Future: direct card ID. Preferred over `card_title` when supplied. Not used today, unless Q3 says enable. |

### Resolution rules

1. **Source card scope:** see D1 below (this is the central question).
2. **Target board:** `to_board_id` (if present) → `to_board` (name) → source board.
3. **Target column:** case-insensitive match within target board. Error if missing, lists available columns.
4. **Ambiguity:** if more than one card matches `card_title` within source scope, error with hints (board + column for each).
5. **No-op:** if card is already in target column on target board, return `{ ok: true, noop: true, resolved }` without writing.

### Success result

```ts
{
  ok: true,
  cardId: string,
  card: { id, title, task_number },
  from: {
    board: { id, name },
    column: { id, title },
  },
  to: {
    board: { id, name },
    column: { id, title },
  },
  noop?: true   // if already in target
}
```

### Failure modes

| Case | Error |
|------|-------|
| `card_title` not found in scope | `` `Card "X" not found on board "{currentBoardName}"` `` (or "globally" depending on D1) |
| Multiple cards match `card_title` | `` `Multiple cards titled "X". One is in {board}/{column}, another in {board}/{column}. Be more specific.` `` |
| `to_board` provided but not found | `` `Board "Y" not found` `` |
| `to_column` not found on target board | `` `Column "Z" not found on "{targetBoardName}". Available: A, B, C` `` |

## Out of scope for this pass

Tracked in `2026-05-13-ai-workflow-rework-backlog.md`:

- T1-#1 `mode` parameter / surface enforcement (still applies to all tools).
- T1-#3 tool-result loop — return enriched shape now, protocol change later.
- T2-#6 prompt branching — chat shouldn't be able to call move_card at all.
- T3-#14 resolve cards by ID — partial overlap with Q3 below.

## Decisions (locked 2026-05-13)

**D1 — Source card scope (strict pill scope):** when `boardId` is provided
(always, from the pill), search only on that board for the source card.
Cross-board source moves are blocked. The error message names the source
board so the user understands the scope. Defensive fallback: if `boardId` is
absent (no-pill future surface), fall back to global search.

**D2 — Ambiguity handling (error with hint):** if more than one card matches
`card_title` within scope, error with a list of `(board / column)` for each
match so the model can disambiguate on retry. No silent picks.

**D3 — Card resolution by ID (forward-compat field only):** add an optional
`cardId` field to the schema. The executor reads it (preferred over
`card_title` when present). The prompt does **not** yet expose card IDs in
the board snapshot — that change will land with a later tool (probably
`update_card`) where it's most needed. Cheap to add the field now.

**Implied defaults (not asked, applied directly):**
- **Already-in-target** → return `{ ok: true, noop: true, resolved }` without writing.
- **Column not found** → error lists available columns on the target board (mirrors `create_card` polish).
- **Result shape** → enriched with `card`, `from`, `to` for the future tool-result loop.
- **Title matching** → keep exact case-insensitive. No fuzzy match.

**D6 — Cross-board moves removed entirely (architectural shift, post-deploy):**
Manual verification surfaced that even with the spec's "strict pill scope," the
existence of `to_board`/`to_board_id` in the schema was a footgun — the model
could still try cross-board moves, and the user wanted the pill to be a
single-board surface end-to-end. Resolution:

- `to_board` and `to_board_id` removed from the `move_card` schema entirely.
- Executor's target board is always the source board.
- `cardId` lookups are scope-checked too — must point to a card on the pill's board.
- Edge function `index.ts` now accepts `boardId` in the request body and
  passes it to `buildContext`. When provided, the system prompt is scoped to
  that single board's snapshot, with a "Scope (LOCKED)" section telling the
  model it cannot reference any other board.
- `aiClient.js` forwards `boardId` from the pill; chat mode (no `boardId`)
  retains the all-boards prompt for now (chat doesn't have write tools yet).
- This is the pill-side of the backlog's T1-#1 / T2-#6 landing earlier than
  planned, because manual verification needed it.

**D7 — Pill feedback surface (post-deploy):**
The pill used to throw away model text (`onText: () => {}`) and tool results.
With strict scope and "refuse in text" responses, this made errors invisible.
Added a persistent feedback chip rendered above the pill modal: shows tool
errors (red) or model text when no tool fired (info). Persists until next
submit or manual dismiss via the × button. See
`feedback_pill_fast_path_heuristic` and the QuickAddBar component.

**D8 — Fast-path prose heuristic (post-deploy):**
The comma-split fast path was naively slicing natural-language inputs like
`"Add a card about X, due next month"` into two phantom cards. Added a prose
detector: any part starting with `Add`/`Create`/`Make`/`New `/`I need…` routes
the whole input through the LLM instead. Newline-split is unaffected.

## Test plan

After Q1–Q3 resolve:

- Unit tests in `src/__tests__/toolExecutor.move_card.test.js`:
  - Happy path: same-board move.
  - Happy path: cross-board move via `to_board`.
  - Card not found in scope → error names the scope (per Q1).
  - Multiple cards in scope with same title → error with hints (per Q2).
  - Column not found on target board → error lists available columns.
  - Already in target column → noop true, no updateCard call.
  - Source scope: card on another board → not found (under strict scope) OR moved (under fallback) (per Q1).
  - `boardId` absent (defensive fallback) → global search works (or errors cleanly).
  - `cardId` direct lookup (per Q3 if enabled).
- Manual test in dev server: same-board move, cross-board move, no-op move, ambiguous-title error path.
