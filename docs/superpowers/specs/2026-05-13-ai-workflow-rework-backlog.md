# AI Workflow Rework — Backlog

**Date:** 2026-05-13 (architecture rev: same day)
**Branch:** `development`
**Status:** Deferred. Not the current focus.
**Current focus instead:** polish each AI tool individually, one by one, until it is solid in isolation. Start with `create_card` (see `2026-05-13-tool-create-card.md`).

## Architectural framing (May 2026 — locked in)

Kolumn has **two** AI surfaces, with different jobs:

| Surface | Where | Job | Tools |
|---------|-------|-----|-------|
| **Pill** (`QuickAddBar.jsx`) | Per-board (takes `boardId` prop) | Action — fires write tools scoped to host board | Free: 3 create_*. Paid: all 18 write tools. |
| **Chat** (`ChatPage.jsx`) | `/chat` route | Conversation — discuss, ask, summarize | Free: none (text Q&A). Paid: `search_cards`, `summarize_board` (read-only). |

**Backend contract:** single `/functions/v1/chat` endpoint. Frontend sends a
`mode` parameter (`'pill' | 'chat'`) as a hint. Backend computes the effective
tool list from `(mode × tier)` server-side. Client identifies itself; server
enforces. This is the OAuth-scopes pattern.

**Pills on other pages** (dashboard, workspace, settings) are out of scope for
now. If they come back, each pill defines its own context-pinning rules.

## Rework backlog (16 items, ranked)

### T1 — architecture & correctness

1. **Implement the `mode` parameter** end-to-end (`aiClient.js` → `index.ts` →
   `tier.ts`). Backend computes effective tool list from `(mode × tier)`.
   Without this, the pill/chat split is policy, not enforcement.

2. **Strip write tools from the chat path.** ChatPage must not be able to
   mutate state via the model. Belt-and-suspenders with T1-#1: even if a
   misconfigured client sets `mode: "pill"` from a chat UI, the server-side
   gating refuses based on the request's actual call site once known. The
   simpler version: chat UI sends `mode: "chat"`, backend filters tools to the
   read-only set or `[]`.

3. **Close the tool-result loop.** Today the model fires a tool, the browser
   executes it, and the model never learns whether it worked. Multi-step
   requests like "create a board then add 5 cards" can silently desync.
   Pattern: after the browser executes a tool, send a follow-up request with
   the `tool_result` content block so the model can react to failures.

4. **Persist conversations to Supabase** (`chat_threads` / `chat_messages`
   tables already exist in the schema). LocalStorage-only history means
   clearing cache wipes everything, and there's no cross-device continuity.
   This is chat-specific; the pill is stateless per call.

5. **Replace the 4-second temp-ID polling loop in `toolExecutor.js`** with
   the realtime subscription that's already wired in `boardStore`.

### T2 — cost, latency, instrumentation

6. **Branch the system prompt by `mode`.** Pill prompt: short, action-focused,
   board context pinned ("you are operating on board X"). Chat prompt: full
   read-only context with Q&A framing. Today one prompt serves both, which
   means the chat is told it can call write tools that it shouldn't, and the
   pill is told about boards it doesn't need.

7. **Split each prompt** into a cached static prefix (persona + rules + icons
   + tool descriptions) and an uncached/short-TTL dynamic tail (board
   snapshot, alerts, activity). Today any card edit invalidates the entire
   cache.

8. **Centralize the model ID** into one `MODEL = "claude-haiku-4-5-20251001"`
   constant; right now it's repeated 4× in `tier.ts`.

9. **Resolve `classifyModel()`** — branch it for real (e.g. Sonnet for
   complex multi-step pill writes, Haiku for chat reads) or delete the dead
   path.

10. **Log Anthropic usage fields** (`input_tokens`,
    `cache_read_input_tokens`, `cache_creation_input_tokens`,
    `output_tokens`) so we can see whether caching actually fires.

### T3 — UX, cleanup, parity

11. **Implement `search_cards` and `summarize_board`** as real read-only
    tools for the chat surface. Currently no-op placeholders in
    `toolExecutor.js:372-374`. Without these, paid-tier chat has nothing to
    upgrade *to*.

12. **Verify pill fast-path parity.** `QuickAddBar` has a fast path that
    splits comma/newline input and calls `executeTool('create_card', { title,
    board })` directly, skipping the LLM. The two paths (fast direct + LLM
    stream) must apply the same defaults — today the fast path produces cards
    with `assignee_name: null` because the assignee default lives in the
    prompt, not the executor.

13. **Trim history smarter than "last 20 messages"** — token-budget it, and
    drop tool-use/result pairs together so you don't orphan a `tool_use`
    without its result.

14. **Resolve cards by ID** for cross-card lookups (`move_card`,
    `update_card`). Pill writes are already board-pinned, but card titles
    within a board can still collide.

15. **Reconcile destructive vs pro-only.** Currently a free user can't call
    `delete_card` (pro-gated), but the destructive-approval UI assumes pro
    users still need confirmation. The two lists must come from one source.

16. **Drop the unwired note tools** (`create_note`, `update_note`) from the
    tools list since the UI is gone — they bloat the prompt and tempt the
    model into dead-end actions.

## Why this is deferred

Per-tool polish makes each tool's *intended behavior* explicit and tested.
Once that's done, the cross-cutting changes above (especially T1-#3 closing
the result loop) become safer to land — we'll know exactly what each tool
should report and when. Doing the protocol change first risks rebuilding it
when a polished tool reveals it needs a different result shape.

Some T1 items (`mode` parameter, strip-tools-from-chat) are *also* prerequisites
for safely running both surfaces in production. They may need to land
mid-stream if per-tool polish exposes a sharp edge before all 18 tools are
done. Re-evaluate after the first 3–4 tools.
