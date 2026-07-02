# AI Workflow Phase 1: `mode` Parameter + Closed Tool-Result Loop

**Date:** 2026-07-02
**Status:** Approved (design review with user)
**Backlog items:** T1-#1 (mode), T1-#2 (strip chat write tools), T1-#3 (close the loop), plus the pill rate-limit UX gap and the "silent board-drop" prompt gap found in the 2026-07-02 audit.

## Problem

The pill/chat split is enforced only by `pillMode = !!body.boardId` in the edge
function. Consequences, all confirmed in the audit:

1. **Chat lies.** `/chat` sends no `boardId`, so it receives the full write-tool
   set. `create_card` always fails there (no board context, and the tool schema
   has no board field), but the model's success prose streams before tools run
   and no result ever reaches it — the assistant confidently reports work it
   did not do.
2. **Chat mutates.** `create_board` succeeds from chat and navigates the user
   away; Pro chat exposes `delete_card` with a cross-board title search.
3. **No chaining.** The SSE stream closes after forwarding `tool_use` blocks
   (`index.ts:223`). Multi-step requests cannot use real IDs from earlier
   steps; the model never sees failures.
4. **Silent failures.** The pill's `onError` swallows everything including the
   429 daily-limit response; tool failures in chat are ignored
   (`chatStore.js:152` never checks `result.ok`).

## Decisions (made with user, 2026-07-02)

1. **Chat gets no tools this phase.** Pure Q&A over the system-prompt board
   snapshot. `search_cards` / `summarize_board` are a later phase.
2. **Loop architecture: client-driven continuation.** The browser executes
   tools and re-invokes the edge function with `tool_result` blocks appended.
   No server-side tool execution.
3. **Loop UX: progress + final summary.** The model is prompt-forbidden from
   claiming outcomes in tool rounds; the UI shows real execution progress; the
   model's final-round text (written after seeing results) is the confirmation.
4. **Destructive tools: execute immediately, undo toast is the safety net.**
   The tool result returns without awaiting the 5s undo window.

## Design

### API contract (edge function `supabase/functions/chat/`)

- Request body gains `mode: 'pill' | 'chat'` (required).
  - `mode: 'pill'` **requires** `boardId` → 400 otherwise.
  - `mode: 'chat'` ignores `boardId` if sent.
  - Missing/invalid `mode` → 400. The `pillMode = !!boardId` inference is
    deleted.
- Effective tools = server-side `(mode × tier)` matrix in `tier.ts`:

  | mode | free | pro / team |
  |------|------|------------|
  | pill | `create_card` | all write tools except `create_board` |
  | chat | *(none)* | *(none — read tools later)* |

  Chat mode passes `tools: []` to the Anthropic API.
- `history` entries change from `{ role, content: string }` to Anthropic-native
  content: `content` may be a string **or** an array of content blocks
  (`text`, `tool_use`, `tool_result`). The edge function forwards them
  unchanged.
- The `done` SSE event gains a payload: `{ type: 'done', stopReason }` where
  `stopReason` is Anthropic's `stop_reason` (`"tool_use"` | `"end_turn"` | …),
  captured from the `message_delta` stream event.
- **Rate limiting:** only user-initiated messages increment
  `increment_chat_usage`. A request whose last history entry contains a
  `tool_result` block is a continuation and skips the increment.
  *Accepted risk:* a hostile client can fake tool_results to dodge the
  counter; damage is bounded (free tier has only `create_card`, rounds are
  client-capped, and the 429 still fires on genuine user turns).

### Continuation loop (pill only)

```
round 1: pill → edge fn → Claude streams text + tool_use
         events: tier, text*, tool_call*, done{stopReason:"tool_use"}
         browser executes each tool via toolExecutor (sequential)
round 2: pill → edge fn; history ends with
           assistant: [ {text}, {tool_use}… ]
           user:      [ {tool_result}… ]        // ok or is_error, real IDs
         Claude chains / corrects / wraps up
repeat while stopReason === "tool_use", max 4 rounds
```

- **Round cap: 4.** On hitting the cap the client appends to the final
  tool_result: `"Round limit reached — summarize what was and wasn't done."`
  and sends one last non-continuing request.
- **Per-round tool cap: 10** executions client-side; excess tools get an
  `is_error` result: `"skipped: per-round tool limit"`.

### Client changes

**`src/lib/aiClient.js`**
- Forward `mode` (and `boardId` for pill) in the body.
- Accept structured `history`; stop assuming string content.
- `onDone(payload)` now receives `{ stopReason }`.

**`src/components/board/QuickAddBar.jsx`** — owns the loop:
- Maintains the structured transcript for the current pill interaction.
- On `done{stopReason:'tool_use'}`: executes collected tool calls in order,
  building `tool_result` blocks `{ type:'tool_result', tool_use_id, content,
  is_error? }`, then re-invokes `streamChat`.
- New progress UI: a list under the pill, one row per executed tool, driven by
  the **actual** executor result — `✓ Created "…"` / `✗ <error message>`.
- Fix the `onError` gap: all errors (including the 429 limit message) render
  as visible feedback; the daily-limit error shows an Upgrade link.
- Tool_use IDs: the edge function forwards Anthropic's `id` from the
  `content_block_start` event in the `tool_call` SSE event
  (`{ type:'tool_call', id, action, params }`) so results can reference
  `tool_use_id`.

**`src/store/chatStore.js` + chat components**
- Send `mode: 'chat'`.
- Delete the tool-execution path: `onToolCall` handler, `approveToolCall`,
  `rejectToolCall`, and `pendingToolCall` rendering in `ChatMessage.jsx`.
  (Server sends no tools; this is dead code — removing it is
  belt-and-suspenders.)
- Keep the italic-error rendering for now but route the 429 message to a
  proper inline notice with an upgrade link (small, contained change).

**`src/lib/toolExecutor.js`**
- Guarantee a uniform result shape `{ ok: boolean, error?: string, …ids }` on
  every path (it feeds `tool_result` content — serialize as JSON string).
- Destructive ops (`delete_card`, `delete_board`, `delete_column`): do **not**
  await the undo window. Fire the store call, return
  `{ ok: true, note: 'deleted — user has a 5-second undo' }` immediately.
  (`remove_member` has no undo; it executes and reports directly.)

### Prompt changes (`supabase/functions/chat/context.ts`)

Two rules appended to the static rules block (cache-safe — static prefix):

1. *"When you call tools, do not describe their outcomes yet — say at most a
   brief acknowledgment like 'On it…'. After tool results arrive, report what
   actually happened, including anything that failed."*
2. *"If the user asks for something your tools here cannot do (for example,
   creating a new board from the quick-add pill), say so plainly and tell them
   where they can do it. Never pretend the action happened."*

### Error handling

- Failed tool → `tool_result` with `is_error: true` and the executor's error
  string; the model retries differently or explains. That is the point of the
  loop.
- Edge function error mid-loop → progress list keeps completed rows; feedback
  line shows the error; single manual retry affordance, no auto-retry.
- Malformed tool params (JSON parse failure) already degrade to `params: {}`;
  executor validation then produces a proper `is_error` result instead of a
  silent no-op.

### Out of scope (explicitly)

- Read tools for chat (`search_cards`, `summarize_board`).
- Conversation persistence to Supabase (T1-#4).
- Replacing the 4s temp-ID polling (T1-#5) — though the loop makes its cost
  more visible; scheduled next.
- Model routing / `classifyModel` resolution (T2), prompt cache split (T2).

## Testing

- **Vitest (client):** loop driver — continuation on `tool_use`, stop at
  round cap, per-round tool cap, `tool_result` shaping (ids, is_error),
  429/error propagation to feedback state; chatStore — sends `mode:'chat'`,
  no tool execution on any event.
- **Edge (deno test or assertion port):** `(mode × tier)` matrix truth table;
  400 on missing mode / pill-without-boardId; continuation detection skips
  usage increment.
- **Manual (deploy + dev server), scripted scenarios:**
  1. Pill: "create 5 cards for a launch plan" → 5 cards, progress rows, honest
     summary.
  2. Pill: "add a card called X then move it to Doing" → chained with real ID.
  3. Pill: "move X to Nonexistent" → ✗ row + model explains, offers fix.
  4. Chat (free): "create a board for my trip" → declines in text, creates
     nothing, suggests where to do it.
  5. Free user at message 21 (pill) → visible limit message + upgrade link.
