# Chat Read Tools — search_cards + summarize_board (backlog T3-#11)

**Date:** 2026-07-25
**Status:** Approved
**Scope:** Backlog T3-#11, explicitly requested — the AI-workflow pause is lifted for exactly this work. Closes the chat surface's tool loop with two read-only tools; no write tools in chat, no pill changes.

## Summary

`search_cards` and `summarize_board` become real: schemas on the edge
function, execution in the browser against boardStore, a closed
`tool_use`/`tool_result` loop for the chat surface, subtle activity chips in
the reply, and tool-returned card ids feeding the chat page's card rail.

Decisions made during brainstorming:
- **All tiers** get the two read tools in chat *for now*; the paid-only gate
  from the (mode × tier) matrix is deferred to the tier redesign. Free
  chat's "no write tools" boundary is unchanged.
- **Subtle activity line** UI (claude.ai-chip spirit): muted mono line in
  the reply flow, e.g. `Searched cards · 4 results`. Not silent, not the
  pill's full progress rows.
- **Separate `chatAgentLoop.js`** mirroring `pillAgentLoop`'s proven round
  mechanics rather than extracting a shared core — the pill stays
  byte-untouched. Consolidation is a candidate for when the AI rework
  resumes.

## Server changes (`supabase/functions/chat/`)

### tools.ts
Append two schemas to `TOOLS` (same raw Anthropic shape as the 16 existing):

- `search_cards` — "Search the user's cards across all their boards."
  `input_schema`: `query` (string, required); `board` (string, optional —
  restrict to one board by name); `include_completed` (boolean, optional,
  default false).
- `summarize_board` — "Get a structured snapshot of one board: columns,
  cards, and totals." `input_schema`: `board` (string, required — the model
  knows every board name from the system prompt).

Also export `const CHAT_READ_TOOLS = ["search_cards", "summarize_board"]`.

### tier.ts
`filterToolsForMode` chat branch (currently `return []`) becomes: return the
tools whose names are in `CHAT_READ_TOOLS`. Comment records that tier gating
of read tools is deferred to the tier redesign. Pill branch untouched.

### index.ts
- Continuation gate at index.ts:131 drops the `mode === "pill"` condition:
  `const isContinuation = isContinuationMessage(body.message)` — chat
  tool_result rounds must not bill against the daily limit. (History block
  passthrough at index.ts:173-176 already supports multi-round; no change.)
- Prompt (planning revision): the original "short chat-mode suffix" idea was
  wrong — `context.ts` already has a dedicated `chatRulesSection` that
  hard-codes "You have no tools" with anti-tool coaching, which would
  suppress tool calls outright. That section is **rewritten** instead:
  describes the two read-only tools and when to use each, keeps the
  never-claim-write-actions rules verbatim in spirit, keeps the pill-pointer
  coaching. Pill mode prompt unchanged.

### Deploy & verify
`deno check supabase/functions/chat/index.ts` before deploy; deploy with
`supabase functions deploy chat` (or MCP `deploy_edge_function`); tail
`supabase functions logs chat` while exercising in the browser.

## Executor (`src/lib/toolExecutor.js`)

Replace the no-op placeholder (`if (action === 'search_cards' || …) return
{ ok: true, readOnly: true }`) with real implementations reading
`useBoardStore.getState()`:

- **search_cards({ query, board, include_completed })** — case-insensitive
  substring match over card `title`, `description`, and assignee names,
  across all loaded boards. If `board` given, resolve it with the executor's
  existing `findBoardByName` (case-insensitive exact match — "fuzzy" in the
  brainstorm was optimistic; that's what exists) and filter to it;
  unresolvable board →
  `{ ok: false, error }` (goes back to the model as an error tool_result).
  `completed` cards excluded unless `include_completed`. Ranking: title
  matches before description/assignee matches, then `updated_at` desc. Cap
  20 results, report the true total. Returns
  `{ ok: true, count, total, cards: [{ id, title, board, column, priority,
  due_date, completed, task_number }] }` (board/column as names).
- **summarize_board({ board })** — fuzzy-resolve name (same resolver);
  returns `{ ok: true, board, columns: [{ title, count, cards: [{ id,
  title, priority, due_date, completed }] }], totals: { cards, completed,
  overdue } }`. Cards per column capped at 15 with a `truncated: true` flag
  on capped columns. `overdue` = due_date before today and not completed
  (reuse `parseDueDate` from dateUtils).

Both results carry real card `id`s — that is what feeds the rail.

Note: ChatPage already calls `ensureAllCardsLoaded()` on mount, so the
executor sees every board's cards by the time a chat tool runs. The
implementations must still behave sanely on a partially loaded store (they
search what's there).

## Chat loop (`src/lib/chatAgentLoop.js` — new)

`runChatLoop({ text, history, today }, { onText, onActivity, onTier, onError }) -> Promise<{ fullText, toolCardIds, error }>`

Mirrors `pillAgentLoop`'s mechanics, chat-shaped:
- `MAX_ROUNDS = 3`, `MAX_TOOLS_PER_ROUND = 4`.
- Calls `streamChat({ message, history: transcript, mode: 'chat', today },
  …)` per round; **`onText` chunks stream straight through to the caller**
  (live UI streaming across rounds, unlike the pill's collect-then-return).
- Reconstructs the assistant turn (`text` block + `tool_use` blocks),
  pushes user/assistant turns onto the ephemeral transcript, executes tools
  sequentially via `executeTool(action, params)` — **no board/boardId
  injection** — and sends all results back as one `tool_result` user
  message (`is_error: true` when `!result.ok`), exactly the pill's shapes.
- Terminates when `stop_reason !== 'tool_use'` or no tool calls or round
  cap; second-to-last round appends the pill's round-limit note to the last
  tool_result.
- Emits `onActivity({ label })` once per executed tool, after execution:
  `Searched cards · {count} result{s}` / `Summarized {board}` on success;
  `Search failed` / `Couldn't summarize board` on error results.
- Collects every `cards[].id` from successful tool results into
  `toolCardIds` (deduped) and resolves them in the return value.

## Store (`src/store/chatStore.js`)

`sendMessage` swaps `streamChat` for `runChatLoop`:
- `onText` appends to the assistant message text as today.
- `onActivity` pushes `{ atChar: fullText.length, label }` onto the
  message's new `activities` array (default `[]` in `addMessage`).
  `atChar` always lands on a round boundary, so text-splitting for
  rendering is markdown-safe.
- On completion, `mentionedCardIds` = union of `toolCardIds` and the
  existing `findMentionedCardIds(fullText, cards)` title-scan (tools give
  exact ids; the scan remains the fallback for untooled mentions). The
  rail (`CardRail`) needs **no changes**.
- Error handling unchanged in shape: loop-level errors mark the message
  with `error` via the existing `friendlyChatError` path; partial-text
  mention stamping on error is preserved.
- Persisted history stays **plain text** `{ role, content }` — tool rounds
  are ephemeral within one send. Future turns see only final replies,
  which also sidesteps the orphaned-tool_use history hazard (T3-#13).

## Chip rendering (`src/components/chat/ChatMessage.jsx`)

Assistant messages with `activities` split `message.text` at each `atChar`;
segments render through the existing `MarkdownRenderer` with a chip between
segments: IBM Plex Mono 12px, `--text-muted`, Phosphor icon at 14px
(`MagnifyingGlass` for search chips, `Kanban` for summarize chips), no box,
no border, no interaction. Messages without `activities` (all existing
persisted history) render byte-identically to today.

Precondition: the working tree's uncommitted font-size edit to
ChatMessage.jsx (user bubble 14→15px, assistant 15→16px) is committed first
as its own `style(chat)` commit.

## Out of scope

- Write tools in chat; any pill changes; `pillAgentLoop` refactoring.
- Tier gating of read tools (deferred to tier redesign).
- Persisting tool transcripts; token-budgeted history (T3-#13 proper).
- System-prompt mode branching beyond the one-line chat suffix (T2-#6).

## Testing

- Vitest — executor: seeded boardStore; matching (case, fields), board
  filter + fuzzy resolve + unresolvable error, completed exclusion,
  ranking, 20-cap with true total, summarize column shapes + per-column
  cap + overdue math.
- Vitest — chatAgentLoop with mocked `streamChat`: no-tool single round;
  tool round → tool_result fed back verbatim shapes → final round; round
  cap + limit note; error result → `is_error`; activity emission order;
  toolCardIds dedup.
- Vitest — chatStore: activities `atChar` placement; mention union.
- Vitest — ChatMessage: segment/chip splitting; legacy no-activities
  message renders unchanged.
- Live: `deno check`, deploy, tail function logs, browser: ask "what's on
  <board>?" and "find <card>" — verify chips, rail population from tool
  ids, quota not consumed by continuation rounds, free-account behavior.
