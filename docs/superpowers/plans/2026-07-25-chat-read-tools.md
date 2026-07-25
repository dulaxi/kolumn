# Chat Read Tools (search_cards + summarize_board) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `search_cards` and `summarize_board` real read-only tools for the chat surface — schemas on the edge function, browser execution against boardStore, a closed tool loop for chat, activity chips in replies, and tool-returned card ids feeding the card rail.

**Architecture:** Server: two schemas in `tools.ts`, chat branch of `filterToolsForMode` returns them (all tiers), continuation billing gate widened to chat, `chatRulesSection` rewritten (it currently says "You have no tools" and would suppress tool calls). Client: real executor implementations; a new `chatAgentLoop.js` mirroring `pillAgentLoop`'s proven round mechanics but streaming text live; `chatStore.sendMessage` swaps to the loop and records `activities` (chip data) + unions tool card ids into `mentionedCardIds`; `ChatMessage` renders chips between markdown segments split at round boundaries.

**Tech Stack:** Supabase Edge Functions (Deno/TS), Anthropic streaming tool use (existing SSE protocol — no new API surface), React 19, Zustand, Vitest, Phosphor icons.

**Spec:** `docs/superpowers/specs/2026-07-25-chat-read-tools-design.md`

## Global Constraints

- **No pill changes.** `src/lib/pillAgentLoop.js`, `src/components/board/QuickAddBar.jsx`, and the pill branches of `tier.ts`/`context.ts` stay byte-identical.
- **No model-ID changes**; never hardcode a model id in anything you touch.
- Colors: CSS-variable tokens only. Icons: Phosphor only (`MagnifyingGlass`, `Kanban` for chips).
- Chip style: `font-mono` (IBM Plex Mono via the theme) 12px (`text-xs`), `--text-muted`, icon 14px, no box/border.
- Activity labels, verbatim: `Searched cards · {n} result{s}` / `Search failed` / `Summarized {board}` / `Couldn't summarize board`.
- **Do NOT deploy the edge function until Task 6.** Tasks 1–5 are local-only.
- Loop limits: `MAX_ROUNDS = 3`, `MAX_TOOLS_PER_ROUND = 4`. Search result cap: 20. Summarize per-column card cap: 15.
- Chat continuations (tool_result rounds) must be unbilled (no daily-limit consumption).
- Precondition (controller handles before Task 5): the working tree's uncommitted font-size edit to `src/components/chat/ChatMessage.jsx` is landed as its own `style(chat)` commit. Task 5 builds on it. No other task may touch that file.
- Commits: `feat(ai): …` for edge-function tasks, `feat(chat): …` for frontend tasks.
- Verification before completion: `npm run test`, `npm run lint`, `npm run build`; known pre-existing failure: `offlineToast.test.js` (honey hex) — flag anything else.

---

### Task 1: Edge function — schemas, tier branch, continuation gate, prompt rules

**Files:**
- Modify: `supabase/functions/chat/tools.ts` (append before the closing `] as const`, plus a new export after it)
- Modify: `supabase/functions/chat/tier.ts` (chat branch of `filterToolsForMode`, one import)
- Modify: `supabase/functions/chat/index.ts:131` (continuation gate)
- Modify: `supabase/functions/chat/context.ts` (replace `chatRulesSection`)
- Test: `supabase/functions/chat/tier.test.ts` (update the chat-mode test)

**Interfaces:**
- Consumes: existing `TOOLS` array shape, `filterToolsForMode(tools, tier, mode)`, `isContinuationMessage(message)`, `chatRulesSection` template string in `buildContext`.
- Produces: `CHAT_READ_TOOLS = ["search_cards", "summarize_board"]` exported from `tools.ts`; chat mode receives exactly those two tools for every tier; chat tool_result continuations are unbilled. Tool input shapes (Tasks 2–3 rely on them): `search_cards {query: string, board?: string, include_completed?: boolean}`, `summarize_board {board: string}`.

- [ ] **Step 1: Update the failing test first**

In `supabase/functions/chat/tier.test.ts`, replace the existing test
`"chat mode gets zero tools regardless of tier"` (which asserts `[]`) with:

```ts
Deno.test("chat mode gets exactly the read tools, all tiers", () => {
  const withRead = [...FAKE_TOOLS, { name: "search_cards" }, { name: "summarize_board" }]
  const freeNames = filterToolsForMode(withRead, "free", "chat").map((t) => t.name)
  const proNames = filterToolsForMode(withRead, "pro", "chat").map((t) => t.name)
  assertEquals(freeNames, ["search_cards", "summarize_board"])
  assertEquals(proNames, ["search_cards", "summarize_board"])
})
```

- [ ] **Step 2: Run the edge tests to verify the new test fails**

Run: `cd supabase/functions/chat && deno test tier.test.ts`
Expected: the new test FAILS (chat branch still returns `[]`); other tests pass. `cd` back to repo root after.

- [ ] **Step 3: tools.ts — append the two schemas + export**

In `supabase/functions/chat/tools.ts`, insert immediately before the closing `] as const` (after the `remove_member` entry):

```ts
  {
    name: "search_cards",
    description: "Read-only: search the user's cards across all their boards by text. Matches card titles, descriptions, and assignee names. Returns matching cards with their ids, board, column, priority, and due date. Never modifies anything.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Text to search for (case-insensitive)" },
        board: { type: "string", description: "Optional: restrict the search to this board (by name)" },
        include_completed: { type: "boolean", description: "Optional: include completed cards (default false)" },
      },
      required: ["query"],
    },
  },
  {
    name: "summarize_board",
    description: "Read-only: get a structured snapshot of one board — its columns in order, the cards in each, and totals (cards, completed, overdue). Never modifies anything.",
    input_schema: {
      type: "object",
      properties: {
        board: { type: "string", description: "Board name to summarize" },
      },
      required: ["board"],
    },
  },
] as const
```

Then after the array's closing statement, add:

```ts
// The chat surface's read-only allowlist — consumed by tier.filterToolsForMode.
export const CHAT_READ_TOOLS = ["search_cards", "summarize_board"]
```

- [ ] **Step 4: tier.ts — chat branch returns the read tools**

Add to the imports at the top of `supabase/functions/chat/tier.ts`:

```ts
import { CHAT_READ_TOOLS } from "./tools.ts"
```

In `filterToolsForMode`, replace the line `if (mode === "chat") return []` (and update the comment above the function, which says read tools are "a later phase") with:

```ts
  // Chat gets the read-only lookup tools — ALL tiers for now; the paid-only
  // gate from the (mode × tier) matrix is deferred to the tier redesign.
  if (mode === "chat") return tools.filter((t: any) => CHAT_READ_TOOLS.includes(t.name))
```

- [ ] **Step 5: index.ts — widen the continuation gate**

At `supabase/functions/chat/index.ts:131`, replace:

```ts
  const isContinuation = mode === "pill" && isContinuationMessage(body.message)
```

with:

```ts
  // Continuations (tool_result rounds) are unbilled on BOTH surfaces — chat
  // read-tool rounds must not consume the daily message limit.
  const isContinuation = isContinuationMessage(body.message)
```

- [ ] **Step 6: context.ts — rewrite chatRulesSection**

In `supabase/functions/chat/context.ts`, replace the entire `chatRulesSection` template string AND the comment block above it (the comment currently reads "Chat is a READ-ONLY surface: zero tools are sent to the model…"). New version:

```ts
  // Chat is a READ-ONLY surface with two lookup tools (search_cards,
  // summarize_board). It grounds answers in fresh reads but can never write.
  // Keep the no-write coaching intact: any hint that it can create/move/edit
  // makes the model roleplay actions it cannot perform (observed in
  // production before this ruleset existed).
  const chatRulesSection = `## What you are
A read-only assistant with two lookup tools. You can see every board, card, label, note, and alert above, and you can call search_cards and summarize_board to look things up. Nothing you do here changes any board — reading is all you can do.

## Tools (read-only)
- search_cards: find cards by text across the user's boards. Optional: restrict to one board by name; include completed cards.
- summarize_board: a structured snapshot of one board — its columns, cards, and totals.
- Use summarize_board for "what's on <board>?" and status questions about one board; use search_cards for "find <thing>" and "where is <card>?" questions.
- Ground answers in tool results when the user asks about specific cards or a board's current state. Broad questions the context above already answers don't need a tool call.
- Refer to cards by their exact titles.
- If a lookup fails or returns nothing, say so plainly — never invent cards.

## Always
- Answer questions about boards, cards, tasks, and notes from the context above and from tool results.
- When the user asks you to create, move, update, complete, delete, or assign anything: you cannot do it, and you must not walk them through it as if you could. Do not ask follow-up questions to "set up" the action (like which column or priority). In one or two sentences, point them to the quick-add pill on that board's page, and optionally suggest exact wording they can type there.
- If asked what you can do: you answer questions, search cards, and summarize boards. Actions (creating, moving, editing cards) happen from the quick-add pill on each board page — never describe those as things you can do here.
- Parse natural language dates relative to Today.
- Use markdown: **bold** for names, lists for multiple items.

## Never
- Say "Done", "I've created", "I've set up", "I've moved", "I've updated", or ANY phrasing that claims a write action happened or will happen. No board change can result from this chat.
- Ask which column, priority, or icon an action should use — that implies you will perform it.
- Use emojis.`
```

- [ ] **Step 7: Type-check and run edge tests**

Run: `deno check supabase/functions/chat/index.ts && (cd supabase/functions/chat && deno test tier.test.ts)`
Expected: check clean; ALL tier tests pass including the updated chat test.

- [ ] **Step 8: Commit (do NOT deploy)**

```bash
git add supabase/functions/chat/tools.ts supabase/functions/chat/tier.ts supabase/functions/chat/index.ts supabase/functions/chat/context.ts supabase/functions/chat/tier.test.ts
git commit -m "feat(ai): chat read tools server-side — schemas, tier branch, unbilled continuations, prompt rules"
```

---

### Task 2: Executor — real search_cards + summarize_board

**Files:**
- Modify: `src/lib/toolExecutor.js` (replace the no-op at ~line 1187; add one import)
- Test: `src/__tests__/chatReadTools.test.js` (new)

**Interfaces:**
- Consumes: `executeTool(action, params)`'s function-scope `const store = useBoardStore.getState()` (line 113); `findBoardByName(name)` (line 77, case-insensitive exact match on board name); `parseDueDate(value)` from `src/utils/dateUtils.js`.
- Produces (Task 3 relies on these result shapes): `search_cards` → `{ ok: true, count, total, cards: [{ id, title, board, column, priority, due_date, completed, task_number }] }` or `{ ok: false, error }`; `summarize_board` → `{ ok: true, board, columns: [{ title, count, truncated?, cards: [{ id, title, priority, due_date, completed }] }], totals: { cards, completed, overdue } }` or `{ ok: false, error }`.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/chatReadTools.test.js`:

```js
import { describe, test, expect, beforeEach } from 'vitest'
import { executeTool } from '../lib/toolExecutor'
import { useBoardStore } from '../store/boardStore'

const card = (id, boardId, colId, over) => ({
  id, board_id: boardId, column_id: colId, position: 0, title: id,
  description: '', assignees: [], completed: false, priority: null,
  due_date: null, updated_at: '2026-07-20T00:00:00Z', task_number: 1, ...over,
})

beforeEach(() => {
  useBoardStore.setState({
    boards: { b1: { id: 'b1', name: 'Launch' }, b2: { id: 'b2', name: 'Backlog' } },
    columns: {
      col1: { id: 'col1', board_id: 'b1', title: 'To do', position: 0 },
      col2: { id: 'col2', board_id: 'b1', title: 'Done', position: 1 },
      col3: { id: 'col3', board_id: 'b2', title: 'Ideas', position: 0 },
    },
    cards: {
      c1: card('c1', 'b1', 'col1', { title: 'Landing page redesign', priority: 'high', due_date: '2020-01-01' }),
      c2: card('c2', 'b1', 'col1', { title: 'Write launch tweet', description: 'mention the landing page', updated_at: '2026-07-24T00:00:00Z' }),
      c3: card('c3', 'b1', 'col2', { title: 'Old landing copy', completed: true }),
      c4: card('c4', 'b2', 'col3', { title: 'Landing A/B test', assignees: ['Sam'], updated_at: '2026-07-23T00:00:00Z' }),
    },
  })
})

describe('search_cards', () => {
  test('matches title/description case-insensitively, title matches ranked first', async () => {
    const r = await executeTool('search_cards', { query: 'LANDING' })
    expect(r.ok).toBe(true)
    expect(r.cards.map((c) => c.id)).toEqual(['c4', 'c1', 'c2'])
    expect(r.cards[0]).toMatchObject({ board: 'Backlog', column: 'Ideas' })
  })

  test('excludes completed unless include_completed', async () => {
    expect((await executeTool('search_cards', { query: 'landing' })).cards.map((c) => c.id)).not.toContain('c3')
    expect((await executeTool('search_cards', { query: 'landing', include_completed: true })).cards.map((c) => c.id)).toContain('c3')
  })

  test('board filter is case-insensitive; unknown board errors', async () => {
    const r = await executeTool('search_cards', { query: 'landing', board: 'launch' })
    expect(r.cards.map((c) => c.id)).toEqual(['c1', 'c2'])
    const bad = await executeTool('search_cards', { query: 'x', board: 'Nope' })
    expect(bad.ok).toBe(false)
    expect(bad.error).toContain('Nope')
  })

  test('matches assignee names', async () => {
    const r = await executeTool('search_cards', { query: 'sam' })
    expect(r.cards.map((c) => c.id)).toEqual(['c4'])
  })

  test('caps at 20 and reports true total', async () => {
    const many = {}
    for (let i = 0; i < 25; i++) many[`x${i}`] = card(`x${i}`, 'b1', 'col1', { title: `Bulk item ${i}` })
    useBoardStore.setState({ cards: { ...useBoardStore.getState().cards, ...many } })
    const r = await executeTool('search_cards', { query: 'bulk item' })
    expect(r.count).toBe(20)
    expect(r.total).toBe(25)
  })

  test('missing query errors', async () => {
    expect((await executeTool('search_cards', {})).ok).toBe(false)
  })
})

describe('summarize_board', () => {
  test('columns in order with counts, totals include overdue', async () => {
    const r = await executeTool('summarize_board', { board: 'Launch' })
    expect(r.ok).toBe(true)
    expect(r.board).toBe('Launch')
    expect(r.columns.map((c) => c.title)).toEqual(['To do', 'Done'])
    expect(r.columns[0].count).toBe(2)
    expect(r.columns[0].cards.map((c) => c.id)).toEqual(['c1', 'c2'])
    expect(r.totals).toEqual({ cards: 3, completed: 1, overdue: 1 })
  })

  test('caps cards per column at 15 with truncated flag', async () => {
    const many = {}
    for (let i = 0; i < 18; i++) many[`y${i}`] = card(`y${i}`, 'b1', 'col1', { title: `Y ${i}`, position: i + 10 })
    useBoardStore.setState({ cards: { ...useBoardStore.getState().cards, ...many } })
    const r = await executeTool('summarize_board', { board: 'Launch' })
    expect(r.columns[0].count).toBe(20)
    expect(r.columns[0].cards).toHaveLength(15)
    expect(r.columns[0].truncated).toBe(true)
    expect(r.columns[1].truncated).toBeUndefined()
  })

  test('missing or unknown board errors', async () => {
    expect((await executeTool('summarize_board', {})).ok).toBe(false)
    expect((await executeTool('summarize_board', { board: 'Nope' })).ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/chatReadTools.test.js`
Expected: FAIL — the placeholder returns `{ ok: true, readOnly: true }` (no `cards`, no `board`), so nearly every assertion fails.

- [ ] **Step 3: Implement**

In `src/lib/toolExecutor.js`, add to the imports at the top:

```js
import { parseDueDate } from '../utils/dateUtils'
```

Replace the placeholder block

```js
  if (action === 'search_cards' || action === 'summarize_board') {
    return { ok: true, readOnly: true }
  }
```

with:

```js
  if (action === 'search_cards') {
    const query = String(params.query || '').trim().toLowerCase()
    if (!query) return { ok: false, error: 'query is required' }
    let boardFilter = null
    if (params.board) {
      boardFilter = findBoardByName(params.board)
      if (!boardFilter) return { ok: false, error: `Board "${params.board}" not found` }
    }
    const matches = []
    for (const card of Object.values(store.cards)) {
      if (boardFilter && card.board_id !== boardFilter.id) continue
      if (card.completed && !params.include_completed) continue
      const inTitle = (card.title || '').toLowerCase().includes(query)
      const inBody = (card.description || '').toLowerCase().includes(query)
        || (card.assignees || []).join(' ').toLowerCase().includes(query)
      if (!inTitle && !inBody) continue
      matches.push({ card, inTitle })
    }
    matches.sort((a, b) =>
      (b.inTitle === true) - (a.inTitle === true)
      || String(b.card.updated_at || '').localeCompare(String(a.card.updated_at || ''))
    )
    const cards = matches.slice(0, 20).map(({ card }) => ({
      id: card.id,
      title: card.title,
      board: store.boards[card.board_id]?.name || null,
      column: store.columns[card.column_id]?.title || null,
      priority: card.priority || null,
      due_date: card.due_date || null,
      completed: !!card.completed,
      task_number: card.task_number ?? null,
    }))
    return { ok: true, count: cards.length, total: matches.length, cards }
  }

  if (action === 'summarize_board') {
    if (!params.board) return { ok: false, error: 'board is required' }
    const board = findBoardByName(params.board)
    if (!board) return { ok: false, error: `Board "${params.board}" not found` }
    const PER_COLUMN_CAP = 15
    const boardCards = Object.values(store.cards).filter((c) => c.board_id === board.id)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    let completed = 0
    let overdue = 0
    for (const c of boardCards) {
      if (c.completed) { completed++; continue }
      const due = c.due_date ? parseDueDate(c.due_date) : null
      if (due && due < todayStart) overdue++
    }
    const columns = Object.values(store.columns)
      .filter((c) => c.board_id === board.id)
      .sort((a, b) => a.position - b.position)
      .map((col) => {
        const colCards = boardCards
          .filter((c) => c.column_id === col.id)
          .sort((a, b) => a.position - b.position)
        return {
          title: col.title,
          count: colCards.length,
          ...(colCards.length > PER_COLUMN_CAP ? { truncated: true } : {}),
          cards: colCards.slice(0, PER_COLUMN_CAP).map((c) => ({
            id: c.id,
            title: c.title,
            priority: c.priority || null,
            due_date: c.due_date || null,
            completed: !!c.completed,
          })),
        }
      })
    return {
      ok: true,
      board: board.name,
      columns,
      totals: { cards: boardCards.length, completed, overdue },
    }
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/chatReadTools.test.js`
Expected: PASS (10 tests). Also run `npx vitest run src/__tests__/CardRail.test.jsx src/__tests__/chatStoreMentions.test.js` — still green (shared store fixtures unaffected).

- [ ] **Step 5: Commit**

```bash
git add src/lib/toolExecutor.js src/__tests__/chatReadTools.test.js
git commit -m "feat(chat): real search_cards and summarize_board executors"
```

---

### Task 3: chatAgentLoop

**Files:**
- Create: `src/lib/chatAgentLoop.js`
- Test: `src/__tests__/chatAgentLoop.test.js` (new)

**Interfaces:**
- Consumes: `streamChat` from `./aiClient` (callback contract: `onText(chunk)`, `onToolCall({id, action, params})` awaited, `onTier(info)`, `onDone({stopReason})`, `onError(err, code)`); `executeTool(action, params)` from `./toolExecutor` (Task 2 result shapes).
- Produces (Task 4 relies on this): `runChatLoop({ text, history = [], today }, { onText, onActivity, onTier } = {}) -> Promise<{ fullText, toolCardIds, error, errorCode }>`. `onActivity` receives `{ icon: 'search'|'board', label }`. `toolCardIds` is a deduped array of card ids from successful tool results.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/chatAgentLoop.test.js`:

```js
import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/aiClient', () => ({ streamChat: vi.fn() }))
vi.mock('../lib/toolExecutor', () => ({ executeTool: vi.fn() }))

import { streamChat } from '../lib/aiClient'
import { executeTool } from '../lib/toolExecutor'
import { runChatLoop } from '../lib/chatAgentLoop'

// One scripted round: emits text chunks, tool calls, then done.
const round = ({ text = '', tools = [], stopReason = 'end_turn' }) =>
  async (_req, h) => {
    if (text) h.onText(text)
    for (const tc of tools) await h.onToolCall(tc)
    h.onDone({ stopReason })
  }

beforeEach(() => {
  streamChat.mockReset()
  executeTool.mockReset()
})

describe('runChatLoop', () => {
  test('no tools: single round, streams text through', async () => {
    streamChat.mockImplementationOnce(round({ text: 'Plain answer.' }))
    const chunks = []
    const r = await runChatLoop({ text: 'hi' }, { onText: (c) => chunks.push(c) })
    expect(r.fullText).toBe('Plain answer.')
    expect(chunks).toEqual(['Plain answer.'])
    expect(r.toolCardIds).toEqual([])
    expect(streamChat).toHaveBeenCalledTimes(1)
  })

  test('tool round: executes, feeds tool_result back, collects ids, emits activity', async () => {
    streamChat
      .mockImplementationOnce(round({ text: 'Looking… ', tools: [{ id: 't1', action: 'search_cards', params: { query: 'x' } }], stopReason: 'tool_use' }))
      .mockImplementationOnce(round({ text: 'Found it.' }))
    executeTool.mockResolvedValueOnce({ ok: true, count: 1, total: 1, cards: [{ id: 'c9', title: 'X' }] })
    const activities = []
    const r = await runChatLoop({ text: 'find x' }, { onActivity: (a) => activities.push(a) })
    expect(r.fullText).toBe('Looking… Found it.')
    expect(r.toolCardIds).toEqual(['c9'])
    expect(activities).toEqual([{ icon: 'search', label: 'Searched cards · 1 result' }])
    // Second request carries the tool_result as the message and the tool_use in history
    const secondCall = streamChat.mock.calls[1][0]
    expect(secondCall.message).toEqual([
      { type: 'tool_result', tool_use_id: 't1', content: JSON.stringify({ ok: true, count: 1, total: 1, cards: [{ id: 'c9', title: 'X' }] }) },
    ])
    const lastHistory = secondCall.history
    const assistantTurn = lastHistory[lastHistory.length - 1]
    expect(assistantTurn.role).toBe('assistant')
    expect(assistantTurn.content).toEqual([
      { type: 'text', text: 'Looking… ' },
      { type: 'tool_use', id: 't1', name: 'search_cards', input: { query: 'x' } },
    ])
    expect(secondCall.mode).toBe('chat')
  })

  test('summarize collects ids from columns and labels the board', async () => {
    streamChat
      .mockImplementationOnce(round({ tools: [{ id: 't1', action: 'summarize_board', params: { board: 'Launch' } }], stopReason: 'tool_use' }))
      .mockImplementationOnce(round({ text: 'Summary.' }))
    executeTool.mockResolvedValueOnce({ ok: true, board: 'Launch', columns: [{ title: 'To do', count: 1, cards: [{ id: 'c1' }] }], totals: { cards: 1, completed: 0, overdue: 0 } })
    const activities = []
    const r = await runChatLoop({ text: 'status?' }, { onActivity: (a) => activities.push(a) })
    expect(r.toolCardIds).toEqual(['c1'])
    expect(activities).toEqual([{ icon: 'board', label: 'Summarized Launch' }])
  })

  test('error result marks is_error and emits failure label', async () => {
    streamChat
      .mockImplementationOnce(round({ tools: [{ id: 't1', action: 'search_cards', params: {} }], stopReason: 'tool_use' }))
      .mockImplementationOnce(round({ text: 'Sorry.' }))
    executeTool.mockResolvedValueOnce({ ok: false, error: 'query is required' })
    const activities = []
    await runChatLoop({ text: 'x' }, { onActivity: (a) => activities.push(a) })
    expect(activities).toEqual([{ icon: 'search', label: 'Search failed' }])
    expect(streamChat.mock.calls[1][0].message[0].is_error).toBe(true)
  })

  test('round cap: stops after MAX_ROUNDS and appends the limit note before the last round', async () => {
    streamChat.mockImplementation(round({ text: 'again ', tools: [{ id: 't', action: 'search_cards', params: { query: 'x' } }], stopReason: 'tool_use' }))
    executeTool.mockResolvedValue({ ok: true, count: 0, total: 0, cards: [] })
    await runChatLoop({ text: 'go' })
    expect(streamChat).toHaveBeenCalledTimes(3)
    // The note is appended after round index 1 (MAX_ROUNDS - 2) executes,
    // so it rides in the FINAL round's request (index 2), not round 2's.
    expect(streamChat.mock.calls[2][0].message[0].content).toContain('round limit approaching')
    expect(streamChat.mock.calls[1][0].message[0].content).not.toContain('round limit approaching')
  })

  test('stream error surfaces error + code', async () => {
    streamChat.mockImplementationOnce(async (_req, h) => { h.onError('boom', 'rate_limit') })
    const r = await runChatLoop({ text: 'x' })
    expect(r.error).toBe('boom')
    expect(r.errorCode).toBe('rate_limit')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/chatAgentLoop.test.js`
Expected: FAIL — unresolved import `../lib/chatAgentLoop`.

- [ ] **Step 3: Implement**

Create `src/lib/chatAgentLoop.js`:

```js
import { streamChat } from './aiClient'
import { executeTool } from './toolExecutor'
import { logError, logWarn } from '../utils/logger'

const MAX_ROUNDS = 3
const MAX_TOOLS_PER_ROUND = 4

// Activity chip data for one executed read tool.
function describeActivity(action, result) {
  if (action === 'search_cards') {
    if (!result?.ok) return { icon: 'search', label: 'Search failed' }
    const n = result.count ?? 0
    return { icon: 'search', label: `Searched cards · ${n} result${n === 1 ? '' : 's'}` }
  }
  if (action === 'summarize_board') {
    if (!result?.ok) return { icon: 'board', label: "Couldn't summarize board" }
    return { icon: 'board', label: `Summarized ${result.board}` }
  }
  return { icon: 'search', label: result?.ok ? `${action} done` : `${action} failed` }
}

// Client-driven continuation loop for the chat surface (read tools only).
// Mirrors pillAgentLoop's round mechanics — model → tool_use → browser
// executes → tool_result → model reacts — but streams text live to the
// caller across rounds and reports tool activity + returned card ids.
// Tool transcripts are ephemeral: the caller persists only the final text.
export async function runChatLoop({ text, history = [], today }, { onText, onActivity, onTier } = {}) {
  const transcript = [...history]
  let message = text // string on round 1; tool_result blocks on continuations
  let fullText = ''
  let error = null
  let errorCode = null
  const toolCardIds = new Set()

  for (let round = 0; round < MAX_ROUNDS; round++) {
    let roundText = ''
    const toolCalls = []
    let stopReason = null
    let streamErr = null

    await new Promise((resolve) => {
      streamChat(
        { message, history: transcript, mode: 'chat', today },
        {
          onText: (chunk) => { roundText += chunk; fullText += chunk; onText?.(chunk) },
          onToolCall: (tc) => { toolCalls.push(tc) },
          onTier: (info) => { onTier?.(info) },
          onDone: ({ stopReason: sr } = {}) => { stopReason = sr; resolve() },
          onError: (err, code) => { streamErr = String(err); errorCode = code; resolve() },
        },
      )
    })

    if (streamErr) {
      logError('[chatLoop] stream error:', streamErr)
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

    if (stopReason !== 'tool_use' || toolCalls.length === 0) break

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
        result = await executeTool(tc.action, tc.params)
      } catch (err) {
        logWarn('[chatLoop] executeTool threw:', err)
        result = { ok: false, error: err?.message || 'lookup failed' }
      }
      onActivity?.(describeActivity(tc.action, result))
      if (result?.ok && Array.isArray(result.cards)) {
        for (const c of result.cards) if (c?.id) toolCardIds.add(c.id)
      }
      if (result?.ok && Array.isArray(result.columns)) {
        for (const col of result.columns) {
          for (const c of col.cards || []) if (c?.id) toolCardIds.add(c.id)
        }
      }
      const block = { type: 'tool_result', tool_use_id: tc.id, content: JSON.stringify(result) }
      if (!result?.ok) block.is_error = true
      results.push(block)
    }

    // Final-round guard: when the NEXT request will be the last allowed
    // round, tell the model to answer instead of chaining again.
    if (round === MAX_ROUNDS - 2) {
      const last = results[results.length - 1]
      last.content += ' [round limit approaching — answer now from what you have; do not call more tools]'
    }

    message = results
  }

  return { fullText, toolCardIds: [...toolCardIds], error, errorCode }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/chatAgentLoop.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/chatAgentLoop.js src/__tests__/chatAgentLoop.test.js
git commit -m "feat(chat): chat agent loop — closed read-tool rounds with live streaming"
```

---

### Task 4: chatStore — loop swap, activities, mention union

**Files:**
- Modify: `src/store/chatStore.js` (`sendMessage` rewrite; `addMessage` gains `activities`; imports)
- Test: `src/__tests__/chatStoreLoop.test.js` (new); `src/__tests__/chatStore.test.js` (one added assertion)

**Interfaces:**
- Consumes: `runChatLoop` (Task 3 signature).
- Produces: assistant messages gain `activities: [{ atChar, icon, label }]` (default `[]` on every message); `mentionedCardIds` on the finished assistant message = deduped union of `toolCardIds` and `findMentionedCardIds(fullText, cards)`. Existing external behavior (streaming text updates, error mapping via `friendlyChatError`, `generateTitle`, `tierInfo`) is preserved.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/chatStoreLoop.test.js`:

```js
import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/chatAgentLoop', () => ({ runChatLoop: vi.fn() }))

import { runChatLoop } from '../lib/chatAgentLoop'
import { useChatStore } from '../store/chatStore'
import { useBoardStore } from '../store/boardStore'

beforeEach(() => {
  useChatStore.setState({ conversations: {}, messages: {}, activeConversationId: null, streamingConversationId: null })
  useBoardStore.setState({ cards: {} })
  runChatLoop.mockReset()
})

describe('sendMessage via runChatLoop', () => {
  test('streams text, records activities at round boundaries, unions mentions', async () => {
    useBoardStore.setState({ cards: { c2: { id: 'c2', title: 'Landing page', board_id: 'b1' } } })
    runChatLoop.mockImplementation(async ({ text }, { onText, onActivity }) => {
      onText('Looking… ')
      onActivity({ icon: 'search', label: 'Searched cards · 1 result' })
      onText('Landing page is in To do.')
      return { fullText: 'Looking… Landing page is in To do.', toolCardIds: ['c7'], error: null, errorCode: null }
    })
    const id = useChatStore.getState().createConversation('Chat')
    useChatStore.getState().addMessage(id, { role: 'user', text: 'where is it?' })
    await useChatStore.getState().sendMessage(id, 'where is it?')
    const msgs = useChatStore.getState().messages[id]
    const assistant = msgs[msgs.length - 1]
    expect(assistant.text).toBe('Looking… Landing page is in To do.')
    expect(assistant.activities).toEqual([{ atChar: 'Looking… '.length, icon: 'search', label: 'Searched cards · 1 result' }])
    expect(assistant.mentionedCardIds.sort()).toEqual(['c2', 'c7'])
    expect(useChatStore.getState().streamingConversationId).toBeNull()
  })

  test('loop error maps through friendlyChatError path and keeps partial mentions', async () => {
    useBoardStore.setState({ cards: { c2: { id: 'c2', title: 'Landing page', board_id: 'b1' } } })
    runChatLoop.mockImplementation(async (_args, { onText }) => {
      onText('Partial about Landing page')
      return { fullText: 'Partial about Landing page', toolCardIds: [], error: 'failed to fetch', errorCode: undefined }
    })
    const id = useChatStore.getState().createConversation('Chat')
    await useChatStore.getState().sendMessage(id, 'x')
    const assistant = useChatStore.getState().messages[id].at(-1)
    expect(assistant.error.message).toMatch(/connection/i)
    expect(assistant.mentionedCardIds).toEqual(['c2'])
  })

  test('rate_limit code sets isLimit', async () => {
    runChatLoop.mockResolvedValue({ fullText: '', toolCardIds: [], error: 'Daily limit reached', errorCode: 'rate_limit' })
    const id = useChatStore.getState().createConversation('Chat')
    await useChatStore.getState().sendMessage(id, 'x')
    expect(useChatStore.getState().messages[id].at(-1).error.isLimit).toBe(true)
  })
})
```

In `src/__tests__/chatStore.test.js`, extend the existing test `'addMessage stores mentionedCardIds, defaulting to []'` with one line asserting the activities default (after the existing expectations):

```js
    expect(msgs[0].activities).toEqual([])
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/chatStoreLoop.test.js src/__tests__/chatStore.test.js`
Expected: chatStoreLoop tests FAIL (sendMessage still calls streamChat; activities undefined); the extended addMessage assertion FAILS.

- [ ] **Step 3: Implement**

In `src/store/chatStore.js`:

Replace the import `import { streamChat } from '../lib/aiClient'` with:

```js
import { runChatLoop } from '../lib/chatAgentLoop'
```

In `addMessage`, add `activities` to the message object (after `mentionedCardIds`):

```js
      activities: [],
```

Replace the entire `sendMessage` action with:

```js
  sendMessage: async (conversationId, userText) => {
    set({ streamingConversationId: conversationId })

    const allMsgs = (get().messages[conversationId] || []).filter((m) => m.id && m.text)
    const history = allMsgs
      .slice(0, -1)
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.text }))

    const msgId = get().addMessage(conversationId, { role: 'assistant', text: '' })
    let fullText = ''
    const patchMsg = (patch) => set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: s.messages[conversationId].map((m) =>
          m.id === msgId ? { ...m, ...(typeof patch === 'function' ? patch(m) : patch) } : m
        ),
      },
    }))

    const { toolCardIds, error, errorCode } = await runChatLoop(
      { text: userText, history },
      {
        onText: (chunk) => {
          fullText += chunk
          patchMsg({ text: fullText })
        },
        onActivity: ({ icon, label }) => {
          patchMsg((m) => ({ activities: [...(m.activities || []), { atChar: fullText.length, icon, label }] }))
        },
        onTier: (info) => set({ tierInfo: info }),
      },
    )

    const scanned = findMentionedCardIds(fullText, useBoardStore.getState().cards)
    const mentionedCardIds = [...new Set([...(toolCardIds || []), ...scanned])]

    if (error) {
      logError('[chatStore] stream error:', error, errorCode)
      const friendly = errorCode
        ? { message: String(error), isLimit: errorCode === 'rate_limit' }
        : friendlyChatError(error)
      patchMsg({ error: friendly, mentionedCardIds })
      set({ streamingConversationId: null })
      return
    }

    patchMsg({ mentionedCardIds })
    set({ streamingConversationId: null })
    get().generateTitle(conversationId)
  },
```

- [ ] **Step 4: Run the chat-store suites**

Run: `npx vitest run src/__tests__/chatStoreLoop.test.js src/__tests__/chatStore.test.js src/__tests__/chatStoreMentions.test.js src/__tests__/chatStoreMode.test.js`
Expected: ALL PASS. Note `chatStoreMentions.test.js` mocks `streamChat` and exercises the REAL `runChatLoop` through `sendMessage` — its scripted `onText`/`onDone` handlers satisfy the loop's round contract (no `stopReason` → loop ends after round 1), so it passes unchanged. If it fails, the loop or store rewrite deviated from the plan — fix the code, not the test.

- [ ] **Step 5: Commit**

```bash
git add src/store/chatStore.js src/__tests__/chatStoreLoop.test.js src/__tests__/chatStore.test.js
git commit -m "feat(chat): sendMessage runs the read-tool loop — activities + tool-id mention union"
```

---

### Task 5: ChatMessage — activity chips

**Precondition (controller, not this task's implementer): the uncommitted font-size edit to ChatMessage.jsx is already landed as its own `style(chat)` commit. Verify `git status` shows ChatMessage.jsx clean before starting; if not, STOP and report BLOCKED.**

**Files:**
- Modify: `src/components/chat/ChatMessage.jsx`
- Test: `src/__tests__/ChatMessageActivities.test.jsx` (new)

**Interfaces:**
- Consumes: `message.activities: [{ atChar, icon: 'search'|'board', label }]` (Task 4); existing `MarkdownRenderer`.
- Produces: assistant messages render chips between markdown segments; messages without activities render exactly as before.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/ChatMessageActivities.test.jsx`:

```jsx
import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ChatMessage from '../components/chat/ChatMessage'
import { useBoardStore } from '../store/boardStore'

const renderMsg = (message) =>
  render(<MemoryRouter><ChatMessage message={message} /></MemoryRouter>)

beforeEach(() => {
  useBoardStore.setState({ cards: {}, _tempIdMap: {} })
})

describe('ChatMessage activity chips', () => {
  test('renders chips between text segments at atChar boundaries', () => {
    renderMsg({
      id: 'm1', role: 'assistant',
      text: 'Looking now. Here is what I found.',
      activities: [{ atChar: 12, icon: 'search', label: 'Searched cards · 2 results' }],
    })
    expect(screen.getByText('Searched cards · 2 results')).toBeInTheDocument()
    expect(screen.getByText(/Looking now/)).toBeInTheDocument()
    expect(screen.getByText(/Here is what I found/)).toBeInTheDocument()
  })

  test('message without activities renders text only, no chips', () => {
    renderMsg({ id: 'm2', role: 'assistant', text: 'Plain reply.' })
    expect(screen.getByText('Plain reply.')).toBeInTheDocument()
    expect(screen.queryByText(/Searched cards/)).toBeNull()
  })

  test('board icon variant renders its label', () => {
    renderMsg({
      id: 'm3', role: 'assistant', text: 'AB',
      activities: [{ atChar: 1, icon: 'board', label: 'Summarized Launch' }],
    })
    expect(screen.getByText('Summarized Launch')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/ChatMessageActivities.test.jsx`
Expected: FAIL — chip labels not rendered (activities ignored today).

- [ ] **Step 3: Implement**

In `src/components/chat/ChatMessage.jsx`:

Add to the imports:

```js
import { Kanban, MagnifyingGlass } from '@phosphor-icons/react'
```

Add above the component (after the imports):

```js
// Split assistant text at each activity's atChar. atChar always lands on a
// round boundary (complete markdown), so segments render safely.
function segmentText(text, activities) {
  const segments = []
  let prev = 0
  for (const activity of activities) {
    const at = Math.min(Math.max(activity.atChar ?? 0, prev), text.length)
    segments.push({ text: text.slice(prev, at), activity })
    prev = at
  }
  segments.push({ text: text.slice(prev), activity: null })
  return segments
}
```

Inside the assistant branch, add `const activities = message.activities || []` just above the `return`, then replace the markdown block

```jsx
      <div
        className="text-[16px] leading-[1.7] text-[var(--text-secondary)]"
        style={{ fontFamily: 'var(--font-logo)', fontWeight: 400 }}
      >
        <MarkdownRenderer content={message.text} />
      </div>
```

with:

```jsx
      <div
        className="text-[16px] leading-[1.7] text-[var(--text-secondary)]"
        style={{ fontFamily: 'var(--font-logo)', fontWeight: 400 }}
      >
        {activities.length === 0 ? (
          <MarkdownRenderer content={message.text} />
        ) : (
          segmentText(message.text, activities).map((seg, i) => (
            <div key={i}>
              {seg.text && <MarkdownRenderer content={seg.text} />}
              {seg.activity && (
                <div className="my-2 flex items-center gap-1.5 font-mono text-xs text-[var(--text-muted)]">
                  {seg.activity.icon === 'board'
                    ? <Kanban size={14} weight="regular" />
                    : <MagnifyingGlass size={14} weight="regular" />}
                  {seg.activity.label}
                </div>
              )}
            </div>
          ))
        )}
      </div>
```

(If the file's font-size values differ slightly after the precondition style commit, keep whatever that commit shipped — only the block structure changes here.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/ChatMessageActivities.test.jsx src/__tests__/a11y.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/ChatMessage.jsx src/__tests__/ChatMessageActivities.test.jsx
git commit -m "feat(chat): activity chips render between reply segments"
```

---

### Task 6: Deploy + full gate + live verification

**Files:** none (deploy + verification only).

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Full local gate**

Run: `npm run test && npm run lint && npm run build`
Expected: suite green except the known pre-existing `offlineToast.test.js` failure; lint 0 errors; build clean.

- [ ] **Step 2: Type-check and deploy the edge function**

Run: `deno check supabase/functions/chat/index.ts`
Then deploy: `supabase functions deploy chat` (or the Supabase MCP `deploy_edge_function` if the CLI isn't authenticated).

- [ ] **Step 3: Live verification (controller/human)**

With `npm run dev` and the deployed function, in a signed-in browser on `/chat/:id`:

- Ask "what's on <a real board name>?" → expect a `Summarized <board>` chip, a grounded answer, and that board's cards appearing in the rail (tool ids, not just title scan).
- Ask "find <a real card title fragment>" → `Searched cards · N results` chip; the found cards render in the rail; clicking one opens it on its board.
- Ask a write request ("create a card called X") → model declines and points to the pill; NO tool chip, no claimed action.
- Watch `supabase functions logs chat` while doing the above — confirm continuation requests (tool_result rounds) log as continuations and the daily counter does not double-count (check `remaining` in the tier SSE stays flat across rounds of one message).
- Confirm a free-tier account gets the tools too (all-tiers decision).

- [ ] **Step 4: Record**

No commit (no file changes). Report verification results; the controller updates the progress ledger.
