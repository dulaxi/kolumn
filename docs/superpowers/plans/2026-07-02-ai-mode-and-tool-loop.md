# AI Mode Parameter + Closed Tool-Result Loop — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce the pill/chat split server-side via an explicit `mode` parameter, and close the tool-result loop so the model reacts to real execution outcomes (spec: `docs/superpowers/specs/2026-07-02-ai-mode-and-tool-loop-design.md`).

**Architecture:** Client sends `mode: 'pill' | 'chat'`; the edge function computes tools from `(mode × tier)` — chat gets `[]`. For the pill, a client-driven continuation loop executes tools in the browser and re-invokes the edge function with `tool_result` blocks until `stop_reason !== "tool_use"` (max 4 rounds). The loop driver is a new pure module `src/lib/pillAgentLoop.js`; `QuickAddBar` renders its progress.

**Tech Stack:** Supabase Edge Functions (Deno/TypeScript), Anthropic Messages API (streaming SSE), React 19, Zustand, Vitest.

## Global Constraints

- One Claude entry point: only `supabase/functions/chat/index.ts` talks to Anthropic.
- Model ID stays `claude-haiku-4-5-20251001` everywhere it already appears — model consolidation is T2, out of scope.
- Anthropic wire shapes (verified against current docs): `stop_reason` arrives in the `message_delta` stream event; `tool_use` block `id` arrives in `content_block_start`; a `tool_result` block is `{type: "tool_result", tool_use_id, content, is_error?}`; **all tool_results for one assistant turn go in ONE user message**.
- Colors via `var(--token)` only, no new hex; toasts via `showToast.*`; icons Phosphor only.
- Loop caps: **4 rounds**, **10 tool executions per round**.
- Conventional commits with `ai`/`chat` scope.
- Verify gates: `npx eslint .` (0 problems), `npm run test` (all pass), `npm run build`, `deno check supabase/functions/chat/index.ts` for edge changes.

---

### Task 1: `(mode × tier)` tool matrix + continuation detection in `tier.ts`

**Files:**
- Modify: `supabase/functions/chat/tier.ts`
- Test: `supabase/functions/chat/tier.test.ts` (create)

**Interfaces:**
- Consumes: nothing new.
- Produces (used by Task 2):
  - `export type Mode = "pill" | "chat"`
  - `export function filterToolsForMode(tools: readonly any[], tier: "free" | "pro", mode: Mode): any[]`
  - `export function isContinuationMessage(message: unknown): boolean`
  - `checkTier(supabase, userId, opts?: { isContinuation?: boolean })` — **signature change**: the old `userMessage` param is dropped; continuation requests skip the `increment_chat_usage` RPC.
  - Old `filterToolsForTier` is deleted.

- [ ] **Step 1: Write the failing test**

Create `supabase/functions/chat/tier.test.ts`:

```typescript
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts"
import { filterToolsForMode, isContinuationMessage } from "./tier.ts"

const FAKE_TOOLS = [
  { name: "create_card" }, { name: "create_board" },
  { name: "move_card" }, { name: "update_card" }, { name: "delete_card" },
  { name: "move_cards" }, { name: "update_cards" }, { name: "complete_cards" },
  { name: "duplicate_card" }, { name: "toggle_checklist" },
  { name: "update_board" }, { name: "delete_board" },
  { name: "add_column" }, { name: "delete_column" },
  { name: "invite_member" }, { name: "remove_member" },
]

Deno.test("chat mode gets zero tools regardless of tier", () => {
  assertEquals(filterToolsForMode(FAKE_TOOLS, "free", "chat"), [])
  assertEquals(filterToolsForMode(FAKE_TOOLS, "pro", "chat"), [])
})

Deno.test("free pill gets create_card only", () => {
  const names = filterToolsForMode(FAKE_TOOLS, "free", "pill").map((t) => t.name)
  assertEquals(names, ["create_card"])
})

Deno.test("pro pill gets all write tools except create_board", () => {
  const names = filterToolsForMode(FAKE_TOOLS, "pro", "pill").map((t) => t.name)
  assertEquals(names.length, FAKE_TOOLS.length - 1)
  assertEquals(names.includes("create_board"), false)
  assertEquals(names.includes("delete_card"), true)
})

Deno.test("isContinuationMessage detects tool_result blocks", () => {
  assertEquals(isContinuationMessage("create 5 cards"), false)
  assertEquals(isContinuationMessage([{ type: "text", text: "hi" }]), false)
  assertEquals(
    isContinuationMessage([{ type: "tool_result", tool_use_id: "toolu_1", content: "{}" }]),
    true,
  )
  assertEquals(isContinuationMessage(undefined), false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `deno test supabase/functions/chat/tier.test.ts`
Expected: FAIL — `filterToolsForMode` / `isContinuationMessage` not exported.

- [ ] **Step 3: Implement in `tier.ts`**

Replace the `TierInfo` interface, `checkTier`, and `filterToolsForTier` (keep `FREE_DAILY_LIMIT`, `PRO_ONLY_TOOLS`, `PILL_DISALLOWED_TOOLS`, and `classifyModel` as they are):

```typescript
export type Mode = "pill" | "chat"

export interface TierInfo {
  tier: "free" | "pro"
  allowed: boolean
  remaining: number
  model: string
}

// True when the incoming `message` is a continuation round of the pill loop:
// an array of content blocks containing at least one tool_result. Continuations
// don't count against the daily limit — only user-initiated messages do.
export function isContinuationMessage(message: unknown): boolean {
  return Array.isArray(message) &&
    message.some((b) => b && typeof b === "object" && (b as any).type === "tool_result")
}

export async function checkTier(
  supabase: SupabaseClient,
  userId: string,
  opts: { isContinuation?: boolean } = {},
): Promise<TierInfo> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", userId)
    .single()

  const tier = (profile?.tier || "free") as "free" | "pro"
  const model = "claude-haiku-4-5-20251001"

  // Continuation rounds ride on the user-initiated message that started the
  // loop — skip the usage increment entirely.
  if (opts.isContinuation) {
    return { tier, allowed: true, remaining: -1, model }
  }

  if (tier === "free") {
    const { data: usage } = await supabase.rpc("increment_chat_usage", {
      target_user_id: userId,
      daily_limit: FREE_DAILY_LIMIT,
    })

    if (usage && !usage.allowed) {
      return { tier, allowed: false, remaining: 0, model }
    }
    return { tier, allowed: true, remaining: Math.max(0, FREE_DAILY_LIMIT - (usage?.count || 0)), model }
  }

  return { tier, allowed: true, remaining: -1, model: classifyModel("") }
}

// Effective tool list from (mode × tier). Chat is conversation-only this
// phase — read tools (search_cards, summarize_board) are a later phase.
export function filterToolsForMode(
  tools: readonly any[],
  tier: "free" | "pro",
  mode: Mode,
): any[] {
  if (mode === "chat") return []
  const byTier = tier === "pro" ? [...tools] : tools.filter((t: any) => !PRO_ONLY_TOOLS.includes(t.name))
  return byTier.filter((t: any) => !PILL_DISALLOWED_TOOLS.includes(t.name))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `deno test supabase/functions/chat/tier.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/chat/tier.ts supabase/functions/chat/tier.test.ts
git commit -m "feat(ai): compute tool list from (mode x tier), skip usage increment on continuations"
```

---

### Task 2: Mode validation, stop_reason, tool_use id, continuation in `index.ts` + `stream.ts`

**Files:**
- Modify: `supabase/functions/chat/index.ts`
- Modify: `supabase/functions/chat/stream.ts`

**Interfaces:**
- Consumes (Task 1): `filterToolsForMode`, `isContinuationMessage`, `checkTier(supabase, userId, { isContinuation })`, `Mode`.
- Produces (SSE protocol consumed by Task 4):
  - `tool_call` events now carry `id`: `{ type: "tool_call", id, action, params }`
  - `done` events carry `stopReason`: `{ type: "done", stopReason: string | null }`
  - Request body: `mode` required (`400` otherwise); `mode:'pill'` requires `boardId` (`400` otherwise); `mode:'chat'` ignores `boardId`. `message` may be a string or a content-block array; `history[].content` may be a string or a content-block array.

- [ ] **Step 1: Update `stream.ts` — `close()` carries stopReason**

```typescript
  close(stopReason: string | null = null) {
    this.write({ type: "done", stopReason })
    this.controller?.close()
  }
```

(Only the `close` method changes; `write`/`error` stay as-is.)

- [ ] **Step 2: Update `index.ts`**

Import changes at the top:

```typescript
import { checkTier, filterToolsForMode, isContinuationMessage, Mode } from "./tier.ts"
```

Replace the `body` type and validation (currently lines ~90–105):

```typescript
  let body: {
    conversation_id?: string
    message: string | Array<Record<string, unknown>>
    history?: Array<{ role: string; content: string | Array<Record<string, unknown>> }>
    mode?: string
    boardId?: string
    today?: string // user's local date as YYYY-MM-DD
  }
  try {
    body = await req.json()
  } catch {
    return new Response("Invalid JSON", { status: 400 })
  }

  const hasMessage = typeof body.message === "string"
    ? body.message.trim().length > 0
    : Array.isArray(body.message) && body.message.length > 0
  if (!hasMessage) {
    return new Response("Message is required", { status: 400 })
  }

  // The client identifies its surface; the server enforces. Never infer
  // mode from the presence of boardId.
  if (body.mode !== "pill" && body.mode !== "chat") {
    return new Response('mode must be "pill" or "chat"', { status: 400 })
  }
  const mode = body.mode as Mode
  if (mode === "pill" && !body.boardId) {
    return new Response("pill mode requires boardId", { status: 400 })
  }
  if (mode === "chat") {
    body.boardId = undefined
  }

  const isContinuation = isContinuationMessage(body.message)
```

Replace the tier-check call:

```typescript
  const tierInfo = await checkTier(supabase, user.id, { isContinuation })
```

Pass mode to context and tools (the `buildContext` call and the Anthropic request body):

```typescript
  const { systemPrompt } = await buildContext(supabase, user.id, {
    boardId: body.boardId,
    today: body.today,
    mode,
  })
```

```typescript
          tools: filterToolsForMode(TOOLS, tierInfo.tier, mode),
```

The `messages` build stays structurally identical — string-or-blocks content passes through to Anthropic unchanged:

```typescript
  const messages: Array<{ role: string; content: unknown }> = [
    ...(body.history || []),
    { role: "user", content: body.message },
  ]
```

In the stream parser: capture the tool_use `id` and the stop_reason. Replace the parser's state and the three event branches:

```typescript
      let currentToolName = ""
      let currentToolId = ""
      let currentToolInput = ""
      let stopReason: string | null = null
```

```typescript
            if (event.type === "content_block_start") {
              if (event.content_block?.type === "tool_use") {
                currentToolName = event.content_block.name
                currentToolId = event.content_block.id
                currentToolInput = ""
              }
            } else if (event.type === "content_block_delta") {
              if (event.delta?.type === "text_delta") {
                sse.write({ type: "text", content: event.delta.text })
              } else if (event.delta?.type === "input_json_delta") {
                currentToolInput += event.delta.partial_json
              }
            } else if (event.type === "content_block_stop") {
              if (currentToolName) {
                try {
                  const params = JSON.parse(currentToolInput)
                  sse.write({ type: "tool_call", id: currentToolId, action: currentToolName, params })
                } catch {
                  sse.write({ type: "tool_call", id: currentToolId, action: currentToolName, params: {} })
                }
                currentToolName = ""
                currentToolId = ""
                currentToolInput = ""
              }
            } else if (event.type === "message_delta") {
              if (event.delta?.stop_reason) stopReason = event.delta.stop_reason
            }
```

And close with the reason:

```typescript
      sse.close(stopReason)
```

- [ ] **Step 3: Type-check**

Run: `deno check supabase/functions/chat/index.ts`
Expected: no errors. (`buildContext` will error on the `mode` option until Task 3 — if so, do Task 3's Step 1 signature change first, then re-run.)

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/chat/index.ts supabase/functions/chat/stream.ts
git commit -m "feat(ai): validate mode server-side, forward tool_use ids and stop_reason"
```

---

### Task 3: Mode-aware prompt rules in `context.ts`

**Files:**
- Modify: `supabase/functions/chat/context.ts`

**Interfaces:**
- Consumes: `Mode` type shape (plain string union; no import needed — accept `mode?: "pill" | "chat"`).
- Produces: `buildContext(supabase, userId, opts: { boardId?: string; today?: string; mode?: "pill" | "chat" })`. Behavior: `pillMode` requires BOTH `mode === "pill"` and a resolvable board.

- [ ] **Step 1: Thread `mode` through**

Change the signature and the `pillMode` derivation:

```typescript
export async function buildContext(
  supabase: SupabaseClient,
  userId: string,
  opts: { boardId?: string; today?: string; mode?: "pill" | "chat" } = {},
): Promise<{ systemPrompt: string }> {
```

```typescript
  const scopedBoard = opts.mode === "pill" && opts.boardId
    ? allBoards.find((b: any) => b.id === opts.boardId)
    : null
  const boards = scopedBoard ? [scopedBoard] : allBoards
  const boardIdSet = new Set(boards.map((b: any) => b.id))
  const columns = allColumns.filter((c: any) => boardIdSet.has(c.board_id))
  const cards = allCards.filter((c: any) => boardIdSet.has(c.board_id))
  const pillMode = !!scopedBoard
  const chatMode = opts.mode === "chat"
```

- [ ] **Step 2: Add the mode-specific conduct rules**

Add this block after the `createBoardRule` definition:

```typescript
  // Honest-narration rules. Pill: tools exist, but outcomes must only be
  // reported after tool results arrive (the loop feeds them back). Chat:
  // no tools at all — never pretend an action happened.
  const toolConductRules = chatMode
    ? `\n- You have NO tools in this chat — you cannot create, move, update, or delete anything. When the user asks for an action, say plainly that actions are done from the board itself (the quick-add pill on a board page), then help by answering from the context above. Never pretend an action happened.`
    : `\n- When you call tools, do not describe their outcomes yet — say at most a brief acknowledgment like "On it…". After tool results arrive, report what actually happened, including anything that failed.
- If the user asks for something your tools here cannot do (for example, creating a new board from the quick-add pill), say so plainly and tell them where they can do it. Never pretend an action happened.`
```

In the `## Always` section of the prompt template, replace the line:

```
- Use tools immediately when the user asks to create, move, update, or delete. Text alone does nothing.
```

with:

```
${chatMode ? "" : "- Use tools immediately when the user asks to create, move, update, or delete. Text alone does nothing."}${toolConductRules}
```

- [ ] **Step 3: Type-check both edge files**

Run: `deno check supabase/functions/chat/index.ts`
Expected: no errors (this also checks context.ts via the import graph).

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/chat/context.ts
git commit -m "feat(prompt): honest-narration rules per mode, no-tools framing for chat"
```

---

### Task 4: `aiClient.js` — forward mode, structured history, stopReason, tool ids

**Files:**
- Modify: `src/lib/aiClient.js`
- Test: `src/__tests__/aiClient.test.js` (create)

**Interfaces:**
- Consumes (Task 2 SSE protocol): `tool_call` events with `id`, `done` events with `stopReason`.
- Produces (used by Tasks 6, 7):
  - `streamChat({ message, history = [], mode, boardId, today }, { onText, onToolCall, onDone, onError, onTier })`
  - `message` may be a string OR an array of content blocks; `history` entries are `{ role, content }` where content is string or blocks — forwarded verbatim.
  - `onToolCall({ id, action, params })` — object arg, awaited.
  - `onDone({ stopReason })` — `stopReason` is `"tool_use" | "end_turn" | null | undefined`.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/aiClient.test.js`:

```javascript
import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }) },
  },
}))
vi.mock('../lib/env', () => ({ env: { supabaseUrl: 'https://x.test', supabaseAnonKey: 'anon' } }))
vi.mock('../utils/logger', () => ({ logError: vi.fn() }))

import { streamChat } from '../lib/aiClient'

// Build a fetch mock whose body streams the given SSE lines then closes.
function mockFetchWithEvents(events) {
  const payload = events.map((e) => `data: ${JSON.stringify(e)}\n`).join('')
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(payload))
      controller.close()
    },
  })
  return vi.fn().mockResolvedValue({ ok: true, body })
}

describe('streamChat', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  test('sends mode, boardId, and structured history in the request body', async () => {
    global.fetch = mockFetchWithEvents([{ type: 'done', stopReason: 'end_turn' }])
    const history = [
      { role: 'user', content: 'make a card' },
      { role: 'assistant', content: [{ type: 'text', text: 'On it' }, { type: 'tool_use', id: 't1', name: 'create_card', input: {} }] },
    ]
    await streamChat(
      { message: [{ type: 'tool_result', tool_use_id: 't1', content: '{"ok":true}' }], history, mode: 'pill', boardId: 'b1' },
      { onText: vi.fn(), onToolCall: vi.fn(), onDone: vi.fn(), onError: vi.fn() },
    )
    const bodySent = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(bodySent.mode).toBe('pill')
    expect(bodySent.boardId).toBe('b1')
    expect(bodySent.history).toEqual(history)
    expect(bodySent.message[0].type).toBe('tool_result')
  })

  test('onToolCall receives {id, action, params}; onDone receives stopReason', async () => {
    global.fetch = mockFetchWithEvents([
      { type: 'text', content: 'On it' },
      { type: 'tool_call', id: 'toolu_9', action: 'create_card', params: { title: 'X' } },
      { type: 'done', stopReason: 'tool_use' },
    ])
    const onToolCall = vi.fn()
    const onDone = vi.fn()
    await streamChat(
      { message: 'add X', mode: 'pill', boardId: 'b1' },
      { onText: vi.fn(), onToolCall, onDone, onError: vi.fn() },
    )
    expect(onToolCall).toHaveBeenCalledWith({ id: 'toolu_9', action: 'create_card', params: { title: 'X' } })
    expect(onDone).toHaveBeenCalledWith({ stopReason: 'tool_use' })
  })

  test('chat mode omits boardId from the body', async () => {
    global.fetch = mockFetchWithEvents([{ type: 'done', stopReason: 'end_turn' }])
    await streamChat(
      { message: 'hello', mode: 'chat' },
      { onText: vi.fn(), onToolCall: vi.fn(), onDone: vi.fn(), onError: vi.fn() },
    )
    const bodySent = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(bodySent.mode).toBe('chat')
    expect('boardId' in bodySent).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/aiClient.test.js`
Expected: FAIL — body has no `mode`; `onToolCall` called with positional args; `onDone` called with no payload.

- [ ] **Step 3: Update `aiClient.js`**

Replace the function signature, body build, and the `tool_call` / `done` dispatch (the SSE parsing scaffolding stays):

```javascript
export async function streamChat({ message, history = [], mode, boardId, today }, { onText, onToolCall, onDone, onError, onTier }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    onError('Not authenticated')
    return
  }

  // mode identifies the surface ('pill' | 'chat'); the server enforces the
  // (mode × tier) tool matrix. boardId scopes the pill's system prompt to
  // its host board. today anchors date math to the user's clock, not UTC.
  const body = { message, history, mode }
  if (boardId) body.boardId = boardId
  if (today) body.today = today
```

In the event dispatch, change the `tool_call` and `done` branches:

```javascript
          if (event.type === 'text') {
            onText(event.content)
          } else if (event.type === 'tier') {
            onTier?.(event)
          } else if (event.type === 'tool_call') {
            await onToolCall({ id: event.id, action: event.action, params: event.params })
          } else if (event.type === 'done') {
            onDone({ stopReason: event.stopReason ?? null })
            return
          } else if (event.type === 'error') {
            onError(event.content)
            return
          }
```

And the fallthrough after the read loop (stream ended without a `done` event):

```javascript
    onDone({ stopReason: null })
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/aiClient.test.js`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/aiClient.js src/__tests__/aiClient.test.js
git commit -m "feat(ai): aiClient forwards mode + structured history, surfaces tool ids and stopReason"
```

---

### Task 5: Uniform results + non-blocking destructives in `toolExecutor.js`

**Files:**
- Modify: `src/lib/toolExecutor.js`
- Test: `src/__tests__/toolExecutorResults.test.js` (create)

**Interfaces:**
- Consumes: nothing new.
- Produces (used by Task 7): `executeTool(action, params)` always resolves to an object with a boolean `ok`; failures carry `error: string`. Destructive ops (`delete_card`, `delete_board`, `delete_column`) resolve **immediately** with `{ ok: true, note: 'deleted — user has a 5-second undo' }` instead of awaiting the 5s undo window.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/toolExecutorResults.test.js`:

```javascript
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }) })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
  },
}))
vi.mock('../utils/logger', () => ({ logWarn: vi.fn(), logError: vi.fn() }))

import { useBoardStore } from '../store/boardStore'
import { executeTool } from '../lib/toolExecutor'

describe('executeTool result contract', () => {
  beforeEach(() => {
    useBoardStore.setState({
      boards: { b1: { id: 'b1', name: 'Alpha' } },
      columns: { col1: { id: 'col1', board_id: 'b1', title: 'To Do', position: 0 } },
      cards: { c1: { id: 'c1', board_id: 'b1', column_id: 'col1', title: 'Ship it' } },
    })
  })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  test('unknown action returns { ok: false, error }', async () => {
    const r = await executeTool('not_a_tool', {})
    expect(r.ok).toBe(false)
    expect(typeof r.error).toBe('string')
  })

  test('create_card with missing title returns { ok: false, error }', async () => {
    const r = await executeTool('create_card', { boardId: 'b1' })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/title/i)
  })

  test('delete_card resolves immediately without awaiting the undo window', async () => {
    vi.useFakeTimers()
    // deleteCard normally awaits the 5s undoableDelete; stub it slow to prove
    // executeTool no longer waits on it.
    const slowDelete = vi.fn(() => new Promise((res) => setTimeout(res, 5000)))
    useBoardStore.setState({ deleteCard: slowDelete })

    const resultPromise = executeTool('delete_card', { card_title: 'Ship it', boardId: 'b1' })
    // Resolve microtasks only — NOT the 5s timer.
    const r = await resultPromise
    expect(r.ok).toBe(true)
    expect(r.note).toMatch(/undo/i)
    expect(slowDelete).toHaveBeenCalledWith('c1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/toolExecutorResults.test.js`
Expected: the `delete_card` test FAILS (times out or hangs on the 5s await). The first two may already pass — that's fine; they pin the contract.

- [ ] **Step 3: Implement**

In `executeTool`'s `delete_card` branch, replace `await store.deleteCard(card.id)` (and the equivalents in `delete_board` / `delete_column`) with fire-and-report:

```javascript
    // Don't await the 5s undo window — the undo toast IS the confirmation
    // mechanism (per design decision 4). Report optimistically; if the user
    // hits undo, the model's confirmation goes stale the same way a manual
    // delete's would.
    store.deleteCard(card.id).catch((err) => logWarn('[toolExecutor] delete_card failed post-report:', err))
    return { ok: true, cardId: card.id, note: 'deleted — user has a 5-second undo' }
```

Apply the same pattern to `delete_board` (`store.deleteBoard(board.id)`) and `delete_column` (`store.deleteColumn(column.id)`), keeping each branch's existing not-found error returns above the call.

Then audit every `return` inside `executeTool` (grep `return {` within the function): each must be `{ ok: true, ... }` or `{ ok: false, error }`. Add `ok: true` to any success return missing it; the final unknown-action fallthrough must be:

```javascript
  return { ok: false, error: `Unknown tool: ${action}` }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/toolExecutorResults.test.js`
Expected: 3 passed. Also run `npx vitest run` — the full suite must stay green (existing toolExecutor consumers only read `.ok`/`.error`/`.cardId`, which are preserved).

- [ ] **Step 5: Commit**

```bash
git add src/lib/toolExecutor.js src/__tests__/toolExecutorResults.test.js
git commit -m "feat(ai): uniform {ok,error} tool results, non-blocking destructive deletes"
```

---

### Task 6: Chat goes tool-free — `chatStore.js` + `ChatMessage.jsx`

**Files:**
- Modify: `src/store/chatStore.js`
- Modify: `src/components/chat/ChatMessage.jsx`
- Test: `src/__tests__/chatStoreMode.test.js` (create)

**Interfaces:**
- Consumes (Task 4): `streamChat({ message, history, mode: 'chat' }, handlers)`.
- Produces: `chatStore` no longer imports `toolExecutor`; `approveToolCall` / `rejectToolCall` deleted; `pendingToolCall` never written. `ChatMessage` no longer renders approval UI.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/chatStoreMode.test.js`:

```javascript
import { describe, test, expect, vi, beforeEach } from 'vitest'

const streamChatMock = vi.fn().mockResolvedValue(undefined)
vi.mock('../lib/aiClient', () => ({ streamChat: (...args) => streamChatMock(...args) }))

import { useChatStore } from '../store/chatStore'

describe('chatStore mode', () => {
  beforeEach(() => {
    streamChatMock.mockClear()
    useChatStore.setState({ conversations: {}, messages: {}, tierInfo: null })
  })

  test("sendMessage requests mode 'chat' and registers no onToolCall", async () => {
    const id = useChatStore.getState().createConversation()
    useChatStore.getState().addMessage(id, { role: 'user', text: 'hello' })
    await useChatStore.getState().sendMessage(id, 'hello')

    const [request, handlers] = streamChatMock.mock.calls[0]
    expect(request.mode).toBe('chat')
    expect(request.boardId).toBeUndefined()
    expect(handlers.onToolCall).toBeUndefined()
  })

  test('tool-approval actions are gone', () => {
    expect(useChatStore.getState().approveToolCall).toBeUndefined()
    expect(useChatStore.getState().rejectToolCall).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/chatStoreMode.test.js`
Expected: FAIL — no `mode` in the request; `onToolCall` registered; approval actions exist.

- [ ] **Step 3: Implement `chatStore.js`**

- Delete the import of `executeTool, isDestructive` from `../lib/toolExecutor`.
- Delete the `approveToolCall` and `rejectToolCall` actions entirely.
- In `sendMessage`, delete the `collectedCardIds` variable and the whole `onToolCall` handler, and pass `mode: 'chat'`:

```javascript
    await streamChat(
      { message: userText, history, mode: 'chat' },
      {
        onText: (chunk) => { /* unchanged */ },
        onDone: () => {
          set({ streamingConversationId: null })
          get().generateTitle(conversationId)
        },
        onTier: (info) => { set({ tierInfo: info }) },
        onError: (error) => {
          // Rate-limit gets a friendlier inline notice with an upgrade path;
          // other errors keep the existing italic rendering.
          const isLimit = /daily limit/i.test(String(error))
          const text = isLimit
            ? `\n\n*${error}* [Upgrade to Pro](/upgrade/pro)`
            : `\n\n*Error: ${error}*`
          fullText += text
          set((s) => ({
            streamingConversationId: null,
            messages: {
              ...s.messages,
              [conversationId]: s.messages[conversationId].map((m) =>
                m.id === msgId ? { ...m, text: fullText } : m
              ),
            },
          }))
        },
      },
    )
```

- [ ] **Step 4: Implement `ChatMessage.jsx`**

- Delete the `ACTION_LABELS` constant, the three `pending && …` JSX blocks, the `approveToolCall` / `rejectToolCall` selectors, the `const pending = message.pendingToolCall` line, and the now-unused imports (`Check, X` from phosphor, `Button`, `useParams`, `useChatStore`).
- Keep the `cardIds` / `embeddedCards` rendering — legacy persisted messages may still carry `cardIds`.

- [ ] **Step 5: Run tests + lint**

Run: `npx vitest run src/__tests__/chatStoreMode.test.js && npx eslint src/store/chatStore.js src/components/chat/ChatMessage.jsx`
Expected: tests pass, 0 lint problems (lint catches any unused import left behind).

- [ ] **Step 6: Commit**

```bash
git add src/store/chatStore.js src/components/chat/ChatMessage.jsx src/__tests__/chatStoreMode.test.js
git commit -m "feat(chat): chat surface goes tool-free, mode='chat', friendlier limit notice"
```

---

### Task 7: The continuation loop — `src/lib/pillAgentLoop.js`

**Files:**
- Create: `src/lib/pillAgentLoop.js`
- Test: `src/__tests__/pillAgentLoop.test.js` (create)

**Interfaces:**
- Consumes (Task 4): `streamChat`; (Task 5): `executeTool`.
- Produces (used by Task 8):

```javascript
runPillLoop({ text, boardId, boardName, today }, { onProgress }) 
// → Promise<{ finalText: string, rows: Array<{ ok: boolean, label: string }>, error: string | null }>
```

`onProgress(rows)` fires after each tool execution with the cumulative rows array (for live rendering). `error` is set on stream/auth errors (including the 429 daily-limit message) — never for individual tool failures (those are rows + model narration).

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/pillAgentLoop.test.js`:

```javascript
import { describe, test, expect, vi, beforeEach } from 'vitest'

const streamChatMock = vi.fn()
const executeToolMock = vi.fn()
vi.mock('../lib/aiClient', () => ({ streamChat: (...a) => streamChatMock(...a) }))
vi.mock('../lib/toolExecutor', () => ({ executeTool: (...a) => executeToolMock(...a) }))
vi.mock('../utils/logger', () => ({ logError: vi.fn(), logWarn: vi.fn() }))

import { runPillLoop } from '../lib/pillAgentLoop'

// Scripted rounds: each entry drives one streamChat call.
// { text, toolCalls: [{id, action, params}], stopReason } or { error }
function scriptRounds(rounds) {
  let i = 0
  streamChatMock.mockImplementation(async (_req, handlers) => {
    const r = rounds[Math.min(i, rounds.length - 1)]
    i++
    if (r.error) { handlers.onError(r.error); return }
    if (r.text) handlers.onText(r.text)
    for (const tc of r.toolCalls || []) await handlers.onToolCall(tc)
    handlers.onDone({ stopReason: r.stopReason })
  })
}

beforeEach(() => { streamChatMock.mockReset(); executeToolMock.mockReset() })

describe('runPillLoop', () => {
  test('single round, no tools: returns model text, no continuation', async () => {
    scriptRounds([{ text: 'Nothing to do here.', stopReason: 'end_turn' }])
    const res = await runPillLoop({ text: 'hi', boardId: 'b1', boardName: 'Alpha' }, { onProgress: vi.fn() })
    expect(res.finalText).toBe('Nothing to do here.')
    expect(res.rows).toEqual([])
    expect(streamChatMock).toHaveBeenCalledTimes(1)
  })

  test('tool round: executes tools, sends tool_results as next message, final text wins', async () => {
    scriptRounds([
      { text: 'On it…', toolCalls: [{ id: 't1', action: 'create_card', params: { title: 'X' } }], stopReason: 'tool_use' },
      { text: 'Created "X" in To Do.', stopReason: 'end_turn' },
    ])
    executeToolMock.mockResolvedValue({ ok: true, cardId: 'c9' })
    const onProgress = vi.fn()
    const res = await runPillLoop({ text: 'add X', boardId: 'b1', boardName: 'Alpha' }, { onProgress })

    // Tool executed with pill context injected
    expect(executeToolMock).toHaveBeenCalledWith('create_card', { title: 'X', board: 'Alpha', boardId: 'b1' })
    // Progress row surfaced
    expect(onProgress).toHaveBeenCalledWith([{ ok: true, label: 'Created "X"' }])
    // Round 2 request: history = [user, assistant(text+tool_use)], message = tool_results
    const round2 = streamChatMock.mock.calls[1][0]
    expect(round2.history[0]).toEqual({ role: 'user', content: 'add X' })
    expect(round2.history[1].role).toBe('assistant')
    expect(round2.history[1].content.some((b) => b.type === 'tool_use' && b.id === 't1')).toBe(true)
    expect(round2.message).toEqual([
      { type: 'tool_result', tool_use_id: 't1', content: JSON.stringify({ ok: true, cardId: 'c9' }) },
    ])
    expect(res.finalText).toBe('Created "X" in To Do.')
  })

  test('failed tool becomes is_error tool_result and a failed row', async () => {
    scriptRounds([
      { toolCalls: [{ id: 't1', action: 'move_card', params: { card_title: 'X', to_column: 'Done' } }], stopReason: 'tool_use' },
      { text: 'That column does not exist.', stopReason: 'end_turn' },
    ])
    executeToolMock.mockResolvedValue({ ok: false, error: 'Column "Done" not found' })
    const res = await runPillLoop({ text: 'move X', boardId: 'b1', boardName: 'Alpha' }, { onProgress: vi.fn() })
    expect(res.rows).toEqual([{ ok: false, label: 'Column "Done" not found' }])
    const round2 = streamChatMock.mock.calls[1][0]
    expect(round2.message[0].is_error).toBe(true)
  })

  test('stops at 4 rounds even if the model keeps calling tools', async () => {
    scriptRounds([
      { toolCalls: [{ id: 't', action: 'create_card', params: { title: 'Y' } }], stopReason: 'tool_use' },
    ])
    executeToolMock.mockResolvedValue({ ok: true })
    await runPillLoop({ text: 'loop', boardId: 'b1', boardName: 'Alpha' }, { onProgress: vi.fn() })
    expect(streamChatMock).toHaveBeenCalledTimes(4)
    // The 4th request's tool_results carry the round-limit note
    const last = streamChatMock.mock.calls[3][0]
    expect(JSON.stringify(last.message)).toMatch(/round limit/i)
  })

  test('caps tool executions at 10 per round', async () => {
    const many = Array.from({ length: 14 }, (_, k) => ({ id: `t${k}`, action: 'create_card', params: { title: `C${k}` } }))
    scriptRounds([
      { toolCalls: many, stopReason: 'tool_use' },
      { text: 'done', stopReason: 'end_turn' },
    ])
    executeToolMock.mockResolvedValue({ ok: true })
    await runPillLoop({ text: 'many', boardId: 'b1', boardName: 'Alpha' }, { onProgress: vi.fn() })
    expect(executeToolMock).toHaveBeenCalledTimes(10)
    // Skipped tools still get is_error tool_results so the model knows
    const round2 = streamChatMock.mock.calls[1][0]
    expect(round2.message).toHaveLength(14)
    expect(round2.message.filter((r) => r.is_error)).toHaveLength(4)
  })

  test('stream error surfaces as error, loop stops', async () => {
    scriptRounds([{ error: "You've reached your daily limit of 20 messages. Upgrade to Pro for unlimited access." }])
    const res = await runPillLoop({ text: 'hi', boardId: 'b1', boardName: 'Alpha' }, { onProgress: vi.fn() })
    expect(res.error).toMatch(/daily limit/i)
    expect(streamChatMock).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/pillAgentLoop.test.js`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `src/lib/pillAgentLoop.js`**

```javascript
import { streamChat } from './aiClient'
import { executeTool } from './toolExecutor'
import { logError, logWarn } from '../utils/logger'

const MAX_ROUNDS = 4
const MAX_TOOLS_PER_ROUND = 10

// Human-readable progress row for one executed tool.
function describeResult(action, params, result) {
  if (!result?.ok) return { ok: false, label: result?.error || `${action} failed` }
  const title = params.title || params.card_title || params.name || ''
  const quoted = title ? `"${title}"` : ''
  const labels = {
    create_card: `Created ${quoted}`,
    move_card: `Moved ${quoted}`,
    update_card: `Updated ${quoted}`,
    delete_card: `Deleted ${quoted}`,
    duplicate_card: `Duplicated ${quoted}`,
    move_cards: 'Moved cards',
    update_cards: 'Updated cards',
    complete_cards: 'Completed cards',
    toggle_checklist: `Updated checklist on ${quoted}`,
    update_board: 'Updated board',
    delete_board: 'Deleted board',
    add_column: `Added column ${quoted}`,
    delete_column: `Deleted column ${quoted}`,
    invite_member: 'Sent invite',
    remove_member: 'Removed member',
  }
  return { ok: true, label: (labels[action] || `${action} done`).trim() }
}

// Client-driven continuation loop for the pill (the write surface).
// Rounds: model → tool_use blocks → browser executes → tool_results →
// model reacts. The model's FINAL round text is the only narration the
// caller should show as confirmation — earlier rounds are acknowledgments.
export async function runPillLoop({ text, boardId, boardName, today }, { onProgress } = {}) {
  const transcript = [] // { role, content } — content is string or blocks
  const rows = []
  let message = text // string on round 1; tool_result blocks on continuations
  let finalText = ''
  let error = null

  for (let round = 0; round < MAX_ROUNDS; round++) {
    let roundText = ''
    const toolCalls = []
    let stopReason = null
    let streamErr = null

    await new Promise((resolve) => {
      streamChat(
        { message, history: transcript, mode: 'pill', boardId, today },
        {
          onText: (chunk) => { roundText += chunk },
          onToolCall: (tc) => { toolCalls.push(tc) },
          onTier: () => {},
          onDone: ({ stopReason: sr } = {}) => { stopReason = sr; resolve() },
          onError: (err) => { streamErr = String(err); resolve() },
        },
      )
    })

    if (streamErr) {
      logError('[pillLoop] stream error:', streamErr)
      error = streamErr
      break
    }

    // Track the turn so continuations carry proper tool_use/tool_result pairing.
    const assistantBlocks = []
    if (roundText) assistantBlocks.push({ type: 'text', text: roundText })
    for (const tc of toolCalls) {
      assistantBlocks.push({ type: 'tool_use', id: tc.id, name: tc.action, input: tc.params })
    }
    transcript.push({ role: 'user', content: message })
    transcript.push({ role: 'assistant', content: assistantBlocks.length ? assistantBlocks : roundText })

    if (stopReason !== 'tool_use' || toolCalls.length === 0) {
      finalText = roundText
      break
    }

    // Execute sequentially; ALL results go back in ONE user message.
    const results = []
    for (let i = 0; i < toolCalls.length; i++) {
      const tc = toolCalls[i]
      if (i >= MAX_TOOLS_PER_ROUND) {
        results.push({ type: 'tool_result', tool_use_id: tc.id, content: 'skipped: per-round tool limit reached', is_error: true })
        continue
      }
      let result
      try {
        result = await executeTool(tc.action, { ...tc.params, board: boardName, boardId })
      } catch (err) {
        logWarn('[pillLoop] executeTool threw:', err)
        result = { ok: false, error: err?.message || 'execution failed' }
      }
      rows.push(describeResult(tc.action, tc.params, result))
      onProgress?.([...rows])
      const block = { type: 'tool_result', tool_use_id: tc.id, content: JSON.stringify(result) }
      if (!result?.ok) block.is_error = true
      results.push(block)
    }

    // Final-round guard: when the NEXT request will be the last allowed
    // round, tell the model to wrap up instead of chaining again.
    if (round === MAX_ROUNDS - 2) {
      const last = results[results.length - 1]
      last.content += ' [round limit approaching — summarize what was and was not done; do not call more tools]'
    }

    message = results
    if (roundText) finalText = roundText // keep best-effort text if the cap cuts us off
  }

  return { finalText, rows, error }
}
```

Note for the implementer: the test "stops at 4 rounds" asserts the round-limit note appears in the 4th request's message — the guard above appends to round 3's results (which become request 4's message). Match the test, not prose: the note must be present in `streamChatMock.mock.calls[3][0].message`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/pillAgentLoop.test.js`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pillAgentLoop.js src/__tests__/pillAgentLoop.test.js
git commit -m "feat(ai): client-driven tool-result continuation loop for the pill"
```

---

### Task 8: Wire `QuickAddBar` to the loop + progress UI + visible errors

**Files:**
- Modify: `src/components/board/QuickAddBar.jsx`

**Interfaces:**
- Consumes (Task 7): `runPillLoop`.
- Produces: pill UI renders per-tool progress rows and never swallows errors (429 included). The comma/newline fast path is untouched.

- [ ] **Step 1: Replace the LLM path in `handleSubmit`**

Replace the import of `streamChat` and `executeTool` with:

```javascript
import { runPillLoop } from '../../lib/pillAgentLoop'
```

Add progress state next to `feedback`:

```javascript
  const [progress, setProgress] = useState([]) // [{ ok, label }]
```

Clear it on submit (`setProgress([])` alongside `setFeedback(null)`) and in `collapseWithAnim`.

Replace the entire `else` branch of `handleSubmit` (the `streamChat` + `onToolCall` + circuit-breaker block — keep the `parts` fast path above it exactly as-is) with:

```javascript
      } else {
        const today = new Intl.DateTimeFormat('en-CA', {
          year: 'numeric', month: '2-digit', day: '2-digit',
        }).format(new Date())

        const { finalText, rows, error } = await runPillLoop(
          { text, boardId, boardName, today },
          { onProgress: (r) => setProgress(r) },
        )

        if (error) {
          const isLimit = /daily limit/i.test(error)
          setFeedback({
            type: 'error',
            text: isLimit ? `${error} Upgrade from Settings → Plan.` : error,
          })
        } else if (finalText.trim()) {
          // The model's final-round text is written AFTER seeing tool
          // results — it is the honest confirmation (or explanation).
          setFeedback({ type: rows.some((r) => !r.ok) ? 'error' : 'info', text: finalText.trim() })
        } else if (rows.length && rows.every((r) => r.ok)) {
          setFeedback(null) // progress rows already tell the story
        }
      }
```

Delete the now-dead locals `modelText`, `toolFired`, `toolErrorMsg`, `MAX_TOOL_CALLS_PER_SUBMIT`, `toolCallCount`, `circuitTripped`, and the old feedback-derivation block after the try/catch (the fast path still needs its own feedback: keep `toolErrorMsg` handling scoped inside the fast-path branch — simplest is a local `let fastPathError = ''` set in that loop, then after the try/catch: `if (fastPathError) setFeedback({ type: 'error', text: fastPathError })`).

- [ ] **Step 2: Render the progress rows**

Directly above the `{feedback && (` block in the expanded-pill JSX:

```jsx
      {progress.length > 0 && (
        <div className="mb-2 px-3.5 py-2 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-card)] font-mono text-[12px] leading-relaxed flex flex-col gap-1">
          {progress.map((row, i) => (
            <div key={i} className={`flex items-start gap-2 ${row.ok ? 'text-[var(--text-secondary)]' : 'text-[var(--color-copper)]'}`}>
              <span className="shrink-0">{row.ok ? '✓' : '✗'}</span>
              <span className="flex-1 break-words">{row.label}</span>
            </div>
          ))}
        </div>
      )}
```

- [ ] **Step 3: Verify build, lint, and full suite**

Run: `npx eslint src/components/board/QuickAddBar.jsx && npm run build && npm run test`
Expected: 0 lint problems, build succeeds, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/board/QuickAddBar.jsx
git commit -m "feat(ai): pill renders live tool progress, surfaces stream and limit errors"
```

---

### Task 9: Deploy + end-to-end verification

**Files:** none (verification only).

- [ ] **Step 1: Full local gate**

Run: `npx eslint . && npm run test && npm run build && deno check supabase/functions/chat/index.ts && deno test supabase/functions/chat/tier.test.ts`
Expected: all green.

- [ ] **Step 2: Deploy the edge function**

Run: `supabase functions deploy chat`
(The CLI is authenticated; project ref `fiqyuppcqwtvlykxxsni` is linked. If deploy fails on auth, re-run `supabase login --token <token>`.)

- [ ] **Step 3: Manual scenarios (dev server + browser)**

Run `npm run dev`, sign in, open a board, and exercise — tail logs in a second terminal with `supabase functions logs chat`:

1. **Pill, multi-create:** "create 5 cards for a launch plan" → 5 progress rows appear one by one, 5 cards land on the board, final feedback text matches reality.
2. **Pill, chained:** "add a card called Deploy then move it to Doing" → both steps complete; the move uses the real card (check it moved).
3. **Pill, deliberate failure:** "move Deploy to Nonexistent" → ✗ row with the column error; feedback text explains and offers a fix (does NOT claim success).
4. **Pill, out-of-scope:** "create a board called Trip" → model declines in text (no board created), suggests where to do it.
5. **Chat (free), action request:** in /chat: "create a board for my trip" → plain-text decline, zero mutations, no navigation away from chat.
6. **Chat, Q&A:** "what's due this week?" → sensible answer from context.
7. **Rate limit (free account only, optional):** after message 20, the pill shows the limit message with upgrade pointer instead of silently clearing.

- [ ] **Step 4: Commit any manual-verification fixes, then finish**

Use superpowers:verification-before-completion before claiming done; then superpowers:finishing-a-development-branch (work is on `development`; push when the user confirms).
