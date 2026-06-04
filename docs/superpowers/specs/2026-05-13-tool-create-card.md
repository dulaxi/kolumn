# Tool spec — `create_card`

**Date:** 2026-05-13 (rev 4 — assignee default reversed, title cap added after manual verification feedback)
**Status:** Implemented + tested + manually verified. Edge function deploy pending.
**Scope:** Polish pass for the `create_card` AI tool. First of 18 per-tool polish passes.

## Surface

`create_card` is a **pill-only** tool. It is called from `QuickAddBar.jsx`
(board pages), never from the chat surface. The pill always passes
`board: boardName` from its `boardId` prop. This collapses an entire class of
resolution problems that earlier drafts of this spec wrestled with.

There are **two code paths** that reach `executeTool('create_card', ...)` from
the pill:

1. **Fast path (bypasses the LLM):** if user input contains commas or
   newlines, `QuickAddBar` splits it and calls `executeTool('create_card',
   { title, board: boardName })` directly per part. Cheap, deterministic, no
   token spend. Today this path passes **only** `title` and `board` — none
   of the optional fields.

2. **LLM path:** `streamChat()` → model emits `tool_use` for `create_card` →
   `executor` is called with whatever fields the model populated. Today this
   path is constrained by the system prompt rules in `context.ts` (priority,
   icon, default assignee, etc.).

**The polish target makes these two paths apply the same defaults.** Today
they don't.

## Intent

`create_card` produces a card on the host pill's board that looks like one the
user would have created by hand: sensible defaults, validated input, and a
result the model can reference on the next turn (forward-compat with the
tool-result loop in backlog T1-#3).

## Current state (three surfaces)

### 1. Schema — `supabase/functions/chat/tools.ts:1-36`

```
required: title
optional: description, board, column, priority, icon, labels, checklist, assignee, due_date
```

The `board` field is technically optional in the schema, but **the pill always
sends it**. This is fine; the executor defaults to "first board in store" if
omitted (which shouldn't happen from the pill).

### 2. Prompt rules — `supabase/functions/chat/context.ts:110-118`

- "Always include title, priority, icon (from the list above), assignee (default {user})"
- 83-name Phosphor icon allowlist (hardcoded in the prompt)
- Default assignee = user's display name
- Priority inference from language ("urgent" → high)
- Label inference from content (technical terms → `/frontend`, `/backend`)
- Parse natural-language dates relative to Today

### 3. Executor — `src/lib/toolExecutor.js:99-136`

- Board resolution: `findBoardByName(params.board)` case-insensitive
- Column resolution: `findColumnByName(board.id, params.column)`, defaults to first column by position
- Defaults applied today: `priority: 'medium'`, `description: ''`, `labels: []`, `checklist: []`, `icon: null`, `assignee_name: null`, `dueDate: null`
- `due_date` (schema) → `dueDate` (boardStore.addCard input) — the store stores it as `due_date` internally. API quirk.
- Returns `{ ok: true, cardId }`
- 4-second polling loop waiting for the real ID after temp insert (kept as-is per backlog T1-#5)

## Issues this polish pass addresses

1. **Fast-path / LLM-path divergence.** Fast path produces cards with
   `assignee_name: null` because the assignee default lives only in the prompt.
   Move all defaults into the executor so both paths produce identical output
   for identical input.

2. **Assignee default is documented in the prompt but not enforced
   client-side.** If the model omits `assignee` (or the fast path doesn't
   include it), the card is created with `null` instead of the user's display
   name. Move the default into the executor.

3. **No icon validation.** Model can send a name not in the allowlist; unknown
   icons fall through. Coerce or drop.

4. **No length caps.** Title and description are passed straight through. A
   runaway prompt could create a card with a 20k-char title.

5. **Result shape is minimal.** Returns only `cardId`. Cheap to enrich now,
   ready for the tool-result loop in T1-#3.

6. **camelCase `dueDate` vs snake_case `due_date`** is undocumented. Worth a
   one-line comment so future readers don't "fix" it.

7. **Ambiguous board** — not a real concern from the pill, but worth a
   defensive note: if the pill ever sends a `boardName` that resolves to
   multiple boards (e.g. two boards in different workspaces share a name),
   what happens?

## Proposed behavior

### Inputs (schema unchanged, descriptions tightened)

| Field | Required | Description |
|-------|----------|-------------|
| `title` | yes | 1–200 chars after trim. |
| `description` | no | Markdown. ≤ 5,000 chars. |
| `board` | yes-in-practice (pill always sends it) | Case-insensitive match. Defensive fallback: most-recently-updated board. |
| `column` | no | Case-insensitive match. Defaults to first column by position. |
| `priority` | no | `low | medium | high`. Default `medium`. |
| `icon` | no | Phosphor kebab-case from the allowlist. Off-list → coerce or drop (see Q2). |
| `labels` | no | `[{ text, color }]`. |
| `checklist` | no | `string[]` → `[{ text, done: false }]`. |
| `assignee` | no | Display name. **Default: requesting user's display name** (new — enforced client-side). |
| `due_date` | no | `YYYY-MM-DD` or full ISO. |

### Defaults (enforced in executor — fast path AND LLM path)

| Field | Default | Notes |
|-------|---------|-------|
| `priority` | `medium` | System default — not user-attributive |
| `assignee` | `null` | **No auto-default.** Reversed after manual verification (see D4 below). |
| `labels` | `[]` | |
| `checklist` | `[]` | |
| `icon` | `null` | After `normalizeIcon` coercion |
| `due_date` | `null` | |
| `description` | `''` | Truncated to 5000 if longer (D1) |

### Title normalization (applied to both paths)

- Trim leading/trailing whitespace.
- Capitalize the first letter **only** when the first word has no uppercase letters (i.e. accidental lowercase from fast-path paste like "buy milk"). Preserve intentional casing: "iPhone repair", "macOS update", "API rewrite" pass through unchanged.

### Validation

- `title`: trimmed, 1–200 chars. Empty/whitespace → error.
- `description`: ≤ 5,000 chars. (see Q1 for overflow behavior)
- `icon`: must be in allowlist. (see Q2 for off-list behavior)
- `labels.color`: 7-color enum (already enforced by schema).
- `due_date`: accept `YYYY-MM-DD` or full ISO; if neither, drop silently.

### Success result

```ts
{
  ok: true,
  cardId: string,           // real ID after temp resolution
  task_number: number,
  resolved: {
    board: { id, name },
    column: { id, title },
  },
  applied_defaults: string[] // e.g. ["assignee", "priority"]
}
```

The richer shape costs ~5 lines now and is ready for the tool-result loop
(backlog T1-#3).

### Failure modes

| Case | Error |
|------|-------|
| Empty `title` after trim | `"Card title is required"` |
| `title` > 200 chars | `"Card title is too long (max 200 chars)"` |
| `board` not found (defensive) | `` `Board "X" not found` `` |
| Multiple boards match `board` | (see Q3) |
| `column` provided but not found | `` `Column "Y" not found on "X". Available: …` `` |
| `addCard` returns no temp ID | `"Failed to create card"` |

## Out of scope for this pass

Tracked in `2026-05-13-ai-workflow-rework-backlog.md`:

- T1-#3 tool-result loop, T1-#5 temp-ID polling replacement — return the
  richer shape now but don't change the protocol yet.
- T2-#7 prompt caching split, T2-#9 model selection — unrelated to this tool.
- T3-#11 implementing read-only tools — separate surface.
- T3-#14 resolve cards by ID — `create_card` doesn't resolve existing cards.
- T3-#16 dropping unwired note tools — separate pass.

## Decisions (locked 2026-05-13)

**D1 — Description overflow:** truncate silently to 5,000 chars and return
`truncated: true` in the result. No hard failure; the user always gets a card,
and the future tool-result loop (backlog T1-#3) can surface the truncation to
the model so it knows to shorten next time.

**D2 — Off-allowlist icon names:** run through `LEGACY_ICON_REMAP` first; if
no match, set `icon: null` silently. Forgiving without being magical.

**D4 — Assignee default (reversed after manual verification):** do NOT
auto-default assignee to the current user. Leave `null` unless the user
explicitly named a person. Manual verification surfaced that auto-attribution
felt presumptuous — users want unassigned cards as a triage bucket. The new
rule: tools never invent user attributions. The prompt rule was changed from
"default to current user, override if specified" to "do not include assignee
unless the user explicitly names a person." See memory
`feedback_ai_tool_defaults_conservative`.

**D5 — Title capitalization:** apply first-letter capitalization in the
executor (both paths) when the title is accidentally lowercase ("buy milk" →
"Buy milk"). Preserve intentional casing by skipping when the first word
already contains any uppercase letter ("iPhone", "macOS", "API" pass through).

**D3 — Board contract:** switch `create_card` from `boardName` to `boardId`.
Rationale: the pill already has the board ID in its `boardId` prop, so passing
it directly eliminates name resolution entirely for this tool. The model never
sees or emits the board field — it's caller-injected context, like today's
`board: boardName` but using the ID.

Concretely:
- The `board` field is **removed from the model-facing schema** in `tools.ts`. The model emits `{ title, description, priority, ... }` and nothing else.
- The executor's `create_card` branch accepts `params.boardId` (caller-injected). Falls back to `params.board` (name) only if `boardId` is absent — kept for future surfaces that may not have a pinned board.
- `QuickAddBar.jsx` changes its two call sites from `{ ..., board: boardName }` to `{ ..., boardId }`.
- The system prompt's pill template (when T2-#6 lands) says "you are operating on this board" with the snapshot inline, never asking the model to specify a board.

## Test plan

Implementation lands with:

- Unit tests in `src/__tests__/toolExecutor.create_card.test.js` covering:
  - happy path (LLM-style call with all fields)
  - happy path (fast-path call with only `title` + `board`) — verifies defaults applied identically
  - assignee default applied when omitted (regression test for the fast-path gap)
  - column defaulting to first by position
  - column provided but not found → error message lists available columns
  - title empty / whitespace → error
  - title too long → error
  - description overflow (per Q1)
  - icon off-allowlist (per Q2)
  - ambiguous board (per Q3)
- Manual test in dev server: open a board, use the pill in both bulk-paste mode and natural-language mode, verify cards look identical and assignee is set to current user in both.
