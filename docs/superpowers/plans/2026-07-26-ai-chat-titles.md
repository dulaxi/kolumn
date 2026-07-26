# AI Chat Titles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 39-char truncation chat titles with a one-shot, unbilled Haiku naming call (`mode: "title"`) after a conversation's first exchange.

**Architecture:** The edge function gains a `title` mode that short-circuits the heavy path — no context build, no tools, no usage increment — and makes a tiny non-streaming Anthropic call (max_tokens 32), replaying the result over the existing SSE protocol so `aiClient` works unchanged. Client-side, `chatStore.generateTitle` keeps its synchronous truncation as an instant fallback, then refines it via the title call; `titleEdited` (manual rename) always wins, `aiTitled` makes naming once-per-conversation.

**Tech Stack:** Supabase Edge Function (Deno/TS), Anthropic Messages API (non-streaming), Zustand, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-25-ai-chat-titles-design.md`

## Global Constraints

- Title system prompt, verbatim: `You name chat conversations. Given the first exchange of a conversation, reply with ONLY a short title for it: 2-5 words, no quotes, no trailing punctuation, no emojis. Capture the topic, not the greeting.`
- `max_tokens: 32`. Title calls are **unbilled**: never decrement `remaining`, never 429 a user with quota left.
- No new hardcoded model strings — the title call uses the model `checkTier` already returns.
- No changes to pill behavior or the chat conversation path; `pillAgentLoop.js`/`chatAgentLoop.js` untouched.
- Title cleanup rules: collapse whitespace, strip wrapping quotes (straight + curly), strip trailing `.`/`…`, clamp to 60 chars; empty result → keep truncation fallback and do NOT set `aiTitled`.
- Do NOT deploy until Task 3.
- Commits: `feat(ai):` for the edge function, `feat(chat):` for the store. End commit messages with the Claude co-author line the repo uses.
- Verification: `npm run test`, `npm run lint`, `npm run build`, `~/.deno/bin/deno check supabase/functions/chat/index.ts` (then `git checkout -- deno.lock` if touched).

---

### Task 1: Edge function — `title` mode

**Files:**
- Modify: `supabase/functions/chat/tier.ts` (Mode union, `unbilled` option rename, tool filter)
- Modify: `supabase/functions/chat/index.ts` (mode validation, title branch, call-site rename)
- Test: `supabase/functions/chat/tier.test.ts` (one added test)

**Interfaces:**
- Consumes: existing `SSEWriter` (`write/close/error`, `stream` property), `sseHeaders()`, `checkTier`, `json()` helper, `ANTHROPIC_API_URL`, `anthropicKey`.
- Produces: POST body `{ mode: "title", message: string }` → SSE `text` event with the raw title text, then `done`. `checkTier(supabase, userId, { unbilled?: boolean })` (renamed from `isContinuation` — same semantics, now also used by title mode). `Mode = "pill" | "chat" | "title"`.

- [ ] **Step 1: Add the failing test**

In `supabase/functions/chat/tier.test.ts`, add:

```ts
Deno.test("title mode gets zero tools", () => {
  assertEquals(filterToolsForMode(FAKE_TOOLS, "free", "title"), [])
  assertEquals(filterToolsForMode(FAKE_TOOLS, "pro", "title"), [])
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd supabase/functions/chat && ~/.deno/bin/deno test tier.test.ts; cd -`
Expected: the new test FAILS (TS may also reject `"title"` as a `Mode` — same root cause); existing tests pass.

- [ ] **Step 3: tier.ts changes**

Three edits:

1. `export type Mode = "pill" | "chat"` → `export type Mode = "pill" | "chat" | "title"`

2. Rename the `checkTier` option (semantics unchanged, now shared by continuations and title calls). Replace the signature and the skip block:

```ts
export async function checkTier(
  supabase: SupabaseClient,
  userId: string,
  opts: { unbilled?: boolean } = {},
): Promise<TierInfo> {
```

and replace

```ts
  // Continuation rounds ride on the user-initiated message that started the
  // loop — skip the usage increment entirely.
  if (opts.isContinuation) {
    return { tier, allowed: true, remaining: -1, model }
  }
```

with

```ts
  // Unbilled calls — tool-result continuation rounds and title housekeeping —
  // skip the usage increment entirely.
  if (opts.unbilled) {
    return { tier, allowed: true, remaining: -1, model }
  }
```

3. In `filterToolsForMode`, add as the FIRST line of the body:

```ts
  if (mode === "title") return []
```

- [ ] **Step 4: index.ts changes**

1. Near the top, after the `ANTHROPIC_API_URL` constant, add:

```ts
const TITLE_SYSTEM_PROMPT =
  "You name chat conversations. Given the first exchange of a conversation, reply with ONLY a short title for it: 2-5 words, no quotes, no trailing punctuation, no emojis. Capture the topic, not the greeting."
```

2. Widen the mode validation:

```ts
  if (body.mode !== "pill" && body.mode !== "chat" && body.mode !== "title") {
    return json(400, { error: "invalid_mode", message: "Invalid request." })
  }
```

3. Immediately after `const mode = body.mode as Mode` (BEFORE the pill `boardId` check), insert the title branch:

```ts
  // Title mode: one-shot conversation naming. Authenticated but unbilled
  // (housekeeping, not a user message — the 32-token cap bounds abuse), no
  // context build, no tools; history is ignored.
  if (mode === "title") {
    if (typeof body.message !== "string") {
      return json(400, { error: "invalid_message", message: "Invalid request." })
    }
    let tierInfo
    try {
      tierInfo = await checkTier(supabase, user.id, { unbilled: true })
    } catch (err) {
      console.error("[chat] title tier check threw:", err)
      return json(500, { error: "tier_check_failed", message: "Something went wrong — try again." })
    }

    const sse = new SSEWriter()
    const streamTitle = async () => {
      try {
        const response = await fetch(ANTHROPIC_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: tierInfo.model,
            max_tokens: 32,
            system: TITLE_SYSTEM_PROMPT,
            messages: [{ role: "user", content: body.message }],
          }),
        })
        if (!response.ok) {
          const errorText = await response.text()
          console.error("[chat] title anthropic error:", response.status, errorText)
          sse.error(`Claude API error: ${response.status}`)
          return
        }
        const data = await response.json()
        const text = (data.content || [])
          .filter((b: { type?: string }) => b.type === "text")
          .map((b: { text?: string }) => b.text || "")
          .join("")
        if (text) sse.write({ type: "text", content: text })
        sse.close(data.stop_reason ?? null)
      } catch (err) {
        console.error("[chat] title error:", err)
        sse.error("Title generation failed")
      }
    }
    streamTitle()
    return new Response(sse.stream, { headers: sseHeaders() })
  }
```

4. Update the existing `checkTier` call site for the renamed option:

```ts
    tierInfo = await checkTier(supabase, user.id, { unbilled: isContinuation })
```

- [ ] **Step 5: Verify**

Run: `~/.deno/bin/deno check supabase/functions/chat/index.ts && (cd supabase/functions/chat && ~/.deno/bin/deno test tier.test.ts)`
Expected: check clean; all tier tests pass including the new title test. Then `git checkout -- deno.lock` if modified.

- [ ] **Step 6: Commit (do NOT deploy)**

```bash
git add supabase/functions/chat/tier.ts supabase/functions/chat/index.ts supabase/functions/chat/tier.test.ts
git commit -m "feat(ai): unbilled title mode on the chat edge function"
```

---

### Task 2: chatStore — AI-powered generateTitle

**Files:**
- Modify: `src/store/chatStore.js` (`generateTitle` rewrite, `cleanTitle` export, one import)
- Test: `src/__tests__/chatStoreTitles.test.js` (new)

**Interfaces:**
- Consumes: `streamChat` from `../lib/aiClient` (must be re-imported — it was removed from chatStore when `runChatLoop` took over sendMessage; `runChatLoop` stays for sendMessage, `streamChat` is used directly only for titles). `mode: 'title'` from Task 1.
- Produces: `generateTitle(conversationId)` is now async; its guards and the truncation fallback run **synchronously before the first await** (existing chatStore tests rely on that). New export `cleanTitle(raw) -> string`. Successful naming stamps `aiTitled: true` on the conversation.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/chatStoreTitles.test.js`:

```js
import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/aiClient', () => ({ streamChat: vi.fn() }))

import { streamChat } from '../lib/aiClient'
import { useChatStore, cleanTitle } from '../store/chatStore'

const seedConvo = (withAssistant = true) => {
  const id = useChatStore.getState().createConversation('New chat')
  useChatStore.getState().addMessage(id, { role: 'user', text: 'help me plan the kolumn.app launch marketing push for next month' })
  if (withAssistant) useChatStore.getState().addMessage(id, { role: 'assistant', text: 'Sure — here is a plan.' })
  return id
}

beforeEach(() => {
  useChatStore.setState({ conversations: {}, messages: {}, activeConversationId: null, streamingConversationId: null })
  streamChat.mockReset()
})

describe('AI titles', () => {
  test('sets the AI title once and stamps aiTitled', async () => {
    streamChat.mockImplementation(async (req, h) => {
      expect(req.mode).toBe('title')
      expect(req.message).toContain('User: help me plan')
      expect(req.message).toContain('Assistant: Sure')
      h.onText('Kolumn Launch Marketing')
      h.onDone({ stopReason: 'end_turn' })
    })
    const id = seedConvo()
    await useChatStore.getState().generateTitle(id)
    const conv = useChatStore.getState().conversations[id]
    expect(conv.title).toBe('Kolumn Launch Marketing')
    expect(conv.aiTitled).toBe(true)
    await useChatStore.getState().generateTitle(id)
    expect(streamChat).toHaveBeenCalledTimes(1)
  })

  test('manual rename blocks AI titling entirely', async () => {
    const id = seedConvo()
    useChatStore.getState().renameConversation(id, 'My name')
    await useChatStore.getState().generateTitle(id)
    expect(streamChat).not.toHaveBeenCalled()
    expect(useChatStore.getState().conversations[id].title).toBe('My name')
  })

  test('a rename that lands mid-flight wins over the AI result', async () => {
    let convId
    streamChat.mockImplementation(async (_req, h) => {
      useChatStore.getState().renameConversation(convId, 'Mine')
      h.onText('AI Name')
      h.onDone({})
    })
    convId = seedConvo()
    await useChatStore.getState().generateTitle(convId)
    const conv = useChatStore.getState().conversations[convId]
    expect(conv.title).toBe('Mine')
    expect(conv.aiTitled).toBeFalsy()
  })

  test('stream error keeps the truncation fallback and allows retry', async () => {
    streamChat.mockImplementation(async (_req, h) => { h.onError('boom') })
    const id = seedConvo()
    await useChatStore.getState().generateTitle(id)
    const conv = useChatStore.getState().conversations[id]
    expect(conv.title).toBe('help me plan the kolumn.app launch mark…')
    expect(conv.aiTitled).toBeFalsy()
  })

  test('no assistant reply yet: truncation only, no call', async () => {
    const id = seedConvo(false)
    await useChatStore.getState().generateTitle(id)
    expect(streamChat).not.toHaveBeenCalled()
    expect(useChatStore.getState().conversations[id].title.endsWith('…')).toBe(true)
  })
})

describe('cleanTitle', () => {
  test('strips quotes and trailing punctuation, collapses whitespace, clamps', () => {
    expect(cleanTitle('"Kolumn  Launch Plan."')).toBe('Kolumn Launch Plan')
    expect(cleanTitle('“Launch”')).toBe('Launch')
    expect(cleanTitle('Plan…')).toBe('Plan')
    expect(cleanTitle('  ')).toBe('')
    expect(cleanTitle('x'.repeat(80)).length).toBeLessThanOrEqual(60)
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/__tests__/chatStoreTitles.test.js`
Expected: FAIL — `cleanTitle` not exported; AI-title assertions fail against the truncation-only implementation.

- [ ] **Step 3: Implement in `src/store/chatStore.js`**

Add to the imports:

```js
import { streamChat } from '../lib/aiClient'
```

Add above the store creation (after `friendlyChatError`):

```js
// Normalizes a model-emitted title: collapse whitespace, strip wrapping
// quotes and trailing punctuation, clamp. Empty result = "unusable".
export function cleanTitle(raw) {
  let t = String(raw || '').replace(/\s+/g, ' ').trim()
  t = t.replace(/^["'“‘]+/, '').replace(/["'”’]+$/, '')
  t = t.replace(/[.…]+$/, '').trim()
  if (t.length > 60) t = t.slice(0, 60).trimEnd()
  return t
}
```

Replace the entire `generateTitle` action with:

```js
  generateTitle: async (conversationId) => {
    const conv = get().conversations[conversationId]
    // Manual renames are sticky; AI naming runs once per conversation.
    // Guards + truncation fallback run synchronously (no await above them) —
    // callers and existing tests rely on the fallback landing immediately.
    if (!conv || conv.titleEdited || conv.aiTitled) return
    const msgs = get().messages[conversationId] || []
    const firstUser = msgs.find((m) => m.role === 'user')
    if (!firstUser) return

    const fallback = firstUser.text.length > 39
      ? firstUser.text.slice(0, 39).trimEnd() + '…'
      : firstUser.text
    set((s) => ({
      conversations: {
        ...s.conversations,
        [conversationId]: { ...s.conversations[conversationId], title: fallback },
      },
    }))

    const firstAssistant = msgs.find((m) => m.role === 'assistant' && m.text && m.text.trim())
    if (!firstAssistant) return

    let raw = ''
    await streamChat(
      {
        mode: 'title',
        history: [],
        message: `User: ${firstUser.text.slice(0, 500)}\nAssistant: ${firstAssistant.text.slice(0, 500)}`,
      },
      {
        onText: (chunk) => { raw += chunk },
        onToolCall: () => {},
        onTier: () => {},
        onDone: () => {},
        onError: (err) => {
          logError('[chatStore] title error:', err)
          raw = ''
        },
      },
    )

    const title = cleanTitle(raw)
    if (!title) return
    set((s) => {
      const current = s.conversations[conversationId]
      // Deleted, or manually renamed while the call was in flight → discard.
      if (!current || current.titleEdited) return s
      return {
        conversations: {
          ...s.conversations,
          [conversationId]: { ...current, title, aiTitled: true },
        },
      }
    })
  },
```

(`sendMessage`'s existing fire-and-forget `get().generateTitle(conversationId)` call needs no change.)

- [ ] **Step 4: Run the store suites**

Run: `npx vitest run src/__tests__/chatStoreTitles.test.js src/__tests__/chatStore.test.js src/__tests__/chatStoreLoop.test.js src/__tests__/chatStoreMentions.test.js src/__tests__/chatStoreMode.test.js`
Expected: ALL PASS. The pre-existing `generateTitle` truncation test and the rename-survival regression test pass because guards + fallback run before the first await (no assistant message is present in the truncation test, so no network call happens).

- [ ] **Step 5: Commit**

```bash
git add src/store/chatStore.js src/__tests__/chatStoreTitles.test.js
git commit -m "feat(chat): Haiku-named conversations via title mode"
```

---

### Task 3: Deploy + verify (controller)

**Files:** none.

- [ ] **Step 1: Full local gate**

Run: `npm run test && npm run lint && npm run build`
Expected: suite fully green (768+ tests); lint 0 errors; build clean.

- [ ] **Step 2: Deploy**

`~/.deno/bin/deno check supabase/functions/chat/index.ts`, then deploy the chat function via the Supabase MCP `deploy_edge_function` (same five files as v46; expect **v47**).

- [ ] **Step 3: Live verification**

In the app: start a new conversation from the dashboard or /chat, send a real first message. Expect the truncated title immediately, refined to a 2–5 word AI name a beat after the first reply. Then: rename it manually, send another message — the manual name must stick. Check `remaining` is only decremented by the user message, not the title call; tail `supabase functions logs chat` for the title-mode requests.
