# Error Correctness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every open correctness finding from the 2026-07-15 error-handling audit: fail-closed rate limiting, one JSON error envelope with CORS on the chat function, no raw wire detail to clients, honest tool-executor results, checked commit-phase writes, a uniform store error contract (rollback + toast), Postgrest-aware Sentry logging, working realtime failure recovery, and the destructive-red hover sweep.

**Architecture:** Backend first (envelope + fail-closed + sanitized SSE, deployed), then the client transport that consumes it (aiClient/chatStore), then per-store sweeps applying one contract: **mutations = rollback + fixed-copy `showToast.error`; fetches = `logError` + error state; raw `error.message` never reaches the UI** (Postgres code `23505` keeps its two fixed-copy `warn` special cases). The `docs/superpowers/specs` source of truth for finding details is the audit artifact + `.superpowers/sdd/visual-pass-report.md`.

**Tech Stack:** Supabase Edge Functions (Deno), React 19 + Zustand + Vitest, Sentry via `src/utils/logger.js`, `showToast` from `src/utils/toast.js`.

## Global Constraints

- **Store error contract (applies to every store task):** mutations that fail → roll back optimistic state (where optimistic) AND `showToast.error('<fixed friendly copy>')`; fetch failures → `logError` + `error` state field where the store has one, no toast unless the store already toasts that fetch; NEVER interpolate `error.message` into user-facing copy.
- **Toast copy is fixed strings** listed per site in the tasks — use them verbatim.
- **Backend error envelope:** every pre-stream chat error is `json(status, { error: <snake_code>, message: <friendly sentence> })` with CORS headers (mirror `check-email`'s `CORS_HEADERS` + `json()` helper). SSE errors keep `{type:'error', content}` but `content` must NEVER contain an upstream response body — status code only; full detail goes to `console.error` (server logs).
- **The existing 429 body shape** (`{error:'rate_limit', message:…, remaining:0}`) must not change — the client special-cases it.
- **Do not touch:** `context.ts`/`tools.ts` prompt logic, model IDs, `classifyModel` (T2 backlog, out of scope), the removed pages (`NotesPage.jsx`, `CalendarPage.jsx`), toast visual styling (solid fills, border — pending a separate design pick).
- **Edge function verification:** `deno check supabase/functions/chat/index.ts` before deploy; deploy with `supabase functions deploy chat`; verify with the curl checks in Task 2.
- Commits: conventional — `fix(chat):`, `fix(store):`, `fix(ai):`, `fix(ui):`. Gate: `npm run lint && npm run test && npm run build`.

---

### Task 1: Postgrest-aware `logError`

**Files:**
- Modify: `src/utils/logger.js`
- Test: `src/__tests__/logger.test.js` (new)

**Interfaces:**
- Produces: named export `formatLogArgs(args) → string` (pure, testable) used by the prod path; `logError`/`logWarn` signatures unchanged.

- [ ] **Step 1: Write failing test** (`src/__tests__/logger.test.js`):

```js
import { describe, test, expect } from 'vitest'
import { formatLogArgs } from '../utils/logger'

describe('formatLogArgs', () => {
  test('stringifies error-like objects by message + code, not [object Object]', () => {
    const pg = { message: 'duplicate key value', code: '23505', details: 'Key exists' }
    const out = formatLogArgs(['Failed to rename label:', pg])
    expect(out).toBe('Failed to rename label: duplicate key value (23505)')
    expect(out).not.toContain('[object Object]')
  })

  test('plain strings pass through joined', () => {
    expect(formatLogArgs(['a', 'b'])).toBe('a b')
  })
})
```

- [ ] **Step 2: Run** `npx vitest run src/__tests__/logger.test.js` — FAIL (no export).

- [ ] **Step 3: Implement.** In `src/utils/logger.js`, add above the existing `findError`:

```js
// Supabase's PostgrestError is a plain object, not an Error instance —
// String(err) yields "[object Object]" and the DB message is lost.
const isErrorLike = (a) =>
  a && typeof a === 'object' && !(a instanceof Error) && typeof a.message === 'string'

export const formatLogArgs = (args) =>
  args
    .map((a) =>
      isErrorLike(a) ? `${a.message}${a.code ? ` (${a.code})` : ''}` : String(a),
    )
    .join(' ')
```

Then change the prod `logError` fallback and `logWarn` to use it:

```js
export const logError = import.meta.env.DEV
  ? (...args) => console.error(...args)
  : (...args) => {
      const err = findError(args)
      if (err) {
        Sentry.captureException(err, { extra: { args } })
      } else {
        Sentry.captureMessage(formatLogArgs(args), { level: 'error', extra: { args } })
      }
    }

export const logWarn = import.meta.env.DEV
  ? (...args) => console.warn(...args)
  : (...args) => {
      Sentry.captureMessage(formatLogArgs(args), { level: 'warning' })
    }
```

- [ ] **Step 4: Run the test file (PASS), then the full suite once.**
- [ ] **Step 5: Commit** `fix(ui): logError stringifies PostgrestError by message+code, not [object Object]`

---

### Task 2: Chat function — fail-closed limiter, JSON envelope, CORS, sanitized SSE

**Files:**
- Modify: `supabase/functions/chat/tier.ts:37-70` (checkTier)
- Modify: `supabase/functions/chat/index.ts` (all error sites)

**Interfaces:**
- Produces: every pre-stream error is `{ error: <code>, message: <friendly> }` JSON with CORS. Codes (Task 3's client consumes these): `method_not_allowed` 405, `misconfigured` 500, `missing_auth` 401, `unauthorized` 401, `invalid_json` 400, `message_required` 400, `invalid_mode` 400, `board_required` 400, `rate_limit` 429 (unchanged shape incl. `remaining`), `board_not_found` 404, `usage_check_failed` 503.
- SSE errors: `content` is `"Claude API error: <status>"` or `"Stream error"` — no bodies.

- [ ] **Step 1: tier.ts — check the RPC error and fail closed.** Replace lines 57-67 (the free-tier block):

```ts
  if (tier === "free") {
    const { data: usage, error: usageError } = await supabase.rpc("increment_chat_usage", {
      target_user_id: userId,
      daily_limit: FREE_DAILY_LIMIT,
    })

    // Fail CLOSED: if the usage counter is unreachable we cannot verify the
    // limit, so we refuse rather than grant unlimited free usage.
    if (usageError || !usage) {
      console.error("[tier] increment_chat_usage failed:", usageError)
      throw new UsageCheckError()
    }

    if (!usage.allowed) {
      return { tier, allowed: false, remaining: 0, model }
    }
    return { tier, allowed: true, remaining: Math.max(0, FREE_DAILY_LIMIT - (usage.count || 0)), model }
  }
```

Add at the top of tier.ts (after imports) and export it:

```ts
export class UsageCheckError extends Error {
  constructor() { super("usage check failed") }
}
```

Also in `checkTier`, capture the profile query error and log it (degrade to free is acceptable — the limiter still applies):

```ts
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", userId)
    .single()
  if (profileError) console.error("[tier] profile fetch failed, degrading to free:", profileError)
```

- [ ] **Step 2: index.ts — CORS + json helper.** Add near the top (mirroring check-email):

```ts
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  })
}
```

Import `UsageCheckError` from `./tier.ts`. Replace the OPTIONS branch's inline headers with `CORS_HEADERS`, then convert every plain-text error:

| Old (line) | New |
|---|---|
| `new Response("Method not allowed", { status: 405 })` (66) | `json(405, { error: "method_not_allowed", message: "Method not allowed" })` |
| `"ANTHROPIC_API_KEY not configured"` 500 (71) | `json(500, { error: "misconfigured", message: "Chat is not configured on the server." })` |
| `"Missing authorization header"` 401 (76) | `json(401, { error: "missing_auth", message: "Sign in to use chat." })` |
| `"Unauthorized"` 401 (87) | `json(401, { error: "unauthorized", message: "Sign in to use chat." })` |
| `"Invalid JSON"` 400 (101) | `json(400, { error: "invalid_json", message: "Invalid request." })` |
| `"Message is required"` 400 (108) | `json(400, { error: "message_required", message: "Type a message first." })` |
| `'mode must be "pill" or "chat"'` 400 (114) | `json(400, { error: "invalid_mode", message: "Invalid request." })` |
| `"pill mode requires boardId"` 400 (118) | `json(400, { error: "board_required", message: "Invalid request." })` |
| 429 block (130-140) | `json(429, { error: "rate_limit", message: "You've reached your daily limit of 20 messages. Upgrade to Pro for unlimited access.", remaining: 0 })` — same body, now via the helper |
| `"board not found"` 404 (153) | `json(404, { error: "board_not_found", message: "Board not found — it may have been deleted." })` |

- [ ] **Step 3: index.ts — wrap the tier check** (line 127):

```ts
  let tierInfo
  try {
    tierInfo = await checkTier(supabase, user.id, { isContinuation })
  } catch (err) {
    if (err instanceof UsageCheckError) {
      return json(503, { error: "usage_check_failed", message: "Could not verify your usage — try again in a moment." })
    }
    console.error("[chat] tier check threw:", err)
    return json(500, { error: "tier_check_failed", message: "Something went wrong — try again." })
  }
```

- [ ] **Step 4: index.ts — stop leaking upstream bodies.** Replace lines 198-202:

```ts
      if (!response.ok) {
        const errorText = await response.text()
        console.error("[chat] anthropic error:", response.status, errorText)
        sse.error(`Claude API error: ${response.status}`)
        return
      }
```

And the outer catch (267-269):

```ts
    } catch (err) {
      console.error("[chat] stream error:", err)
      sse.error("Stream error")
    }
```

(The status-only `content` strings still hit `friendlyChatError`'s existing busy/5xx buckets — `Claude API error: 5` and `529` regexes match — verified in Task 3's tests.)

- [ ] **Step 5: stream.ts — guard against double-close.** `error()` and `close()` both call `controller?.close()`; an error thrown after a close (or vice versa) throws synchronously inside the un-awaited `streamToClient`, becoming an unhandled rejection. Add a closed flag to `SSEWriter`:

```ts
export class SSEWriter {
  private encoder = new TextEncoder()
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null
  private closed = false
  public stream: ReadableStream<Uint8Array>

  constructor() {
    this.stream = new ReadableStream({
      start: (controller) => {
        this.controller = controller
      },
    })
  }

  write(data: Record<string, unknown>) {
    if (this.closed) return
    this.controller?.enqueue(this.encoder.encode(sseEvent(data)))
  }

  close(stopReason: string | null = null) {
    if (this.closed) return
    this.write({ type: "done", stopReason })
    this.closed = true
    this.controller?.close()
  }

  error(message: string) {
    if (this.closed) return
    this.write({ type: "error", content: message })
    this.closed = true
    this.controller?.close()
  }
}
```

- [ ] **Step 6: Verify + deploy.**

```bash
deno check supabase/functions/chat/index.ts
supabase functions deploy chat
```

Then curl the deployed function (read `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` from `.env.local`; do NOT print secrets into the report):

```bash
# 405 envelope + CORS header present
curl -si -X GET "$SUPABASE_URL/functions/v1/chat" -H "apikey: $ANON" | grep -iE "HTTP/|access-control-allow-origin|error"
# 401 envelope
curl -si -X POST "$SUPABASE_URL/functions/v1/chat" -H "apikey: $ANON" -H "Content-Type: application/json" -d '{}' | grep -iE "HTTP/|access-control-allow-origin|missing_auth"
```

Expected: 405 and 401 with `access-control-allow-origin: *` and JSON `{"error":"method_not_allowed"…}` / `{"error":"missing_auth"…}` bodies.

- [ ] **Step 7: Commit** `fix(chat): fail-closed usage check + one JSON error envelope with CORS, no upstream bodies in SSE`

---

### Task 3: Client transport — aiClient hardening + chatStore code passthrough

**Files:**
- Modify: `src/lib/aiClient.js`
- Modify: `src/store/chatStore.js` (friendlyChatError + onError)
- Test: `src/__tests__/aiClient.test.js`, `src/__tests__/chatStore.test.js` (extend both)

**Interfaces:**
- `onError(message, code?)` — second arg is the envelope code when the server sent one (`'rate_limit'`, `'unauthorized'`, …); undefined for network/SSE errors. Existing consumers that ignore the second arg (pillAgentLoop) keep working.
- `onTier` now also fires on the 429 path with `{ remaining }`.

- [ ] **Step 1: Failing tests.** Append to `src/__tests__/aiClient.test.js` (match its existing mock setup for `supabase.auth.getSession` and global fetch):

```js
test('network failure on the initial POST routes to onError instead of rejecting', async () => {
  global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
  const onError = vi.fn()
  await expect(
    streamChat({ message: 'hi', mode: 'chat' }, { onText: vi.fn(), onDone: vi.fn(), onError }),
  ).resolves.toBeUndefined()
  expect(onError).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch'), undefined)
})

test('JSON envelope errors surface message + code, and 429 remaining reaches onTier', async () => {
  global.fetch = vi.fn().mockResolvedValue(new Response(
    JSON.stringify({ error: 'rate_limit', message: 'You have reached your daily limit of 20 messages.', remaining: 0 }),
    { status: 429 },
  ))
  const onError = vi.fn(); const onTier = vi.fn()
  await streamChat({ message: 'hi', mode: 'chat' }, { onText: vi.fn(), onDone: vi.fn(), onError, onTier })
  expect(onTier).toHaveBeenCalledWith(expect.objectContaining({ remaining: 0 }))
  expect(onError).toHaveBeenCalledWith(expect.stringContaining('daily limit'), 'rate_limit')
})
```

Append to `src/__tests__/chatStore.test.js`:

```js
test('friendlyChatError classifies a 5xx containing "unauthorized" as busy, not auth', () => {
  const res = friendlyChatError('Error 502: upstream said unauthorized gateway')
  expect(res.message).toMatch(/busy|moment/i)
})
```

- [ ] **Step 2: Run both files — new tests FAIL.**

- [ ] **Step 3: aiClient.js.** Wrap the whole body after the session check in try/catch, replace the `!response.ok` block, and pass codes:

```js
  let response
  try {
    response = await fetch(`${env.supabaseUrl}/functions/v1/chat`, { /* unchanged */ })
  } catch (err) {
    logError('[aiClient] request failed', err)
    onError(err.message, undefined)
    return
  }

  if (!response.ok) {
    const text = await response.text()
    logError('[aiClient] error response', { status: response.status, text })
    try {
      const err = JSON.parse(text)
      if (err && typeof err.message === 'string') {
        if (typeof err.remaining === 'number') onTier?.({ remaining: err.remaining })
        onError(err.message, err.error)
        return
      }
    } catch {}
    onError(`Error ${response.status}`, undefined)
    return
  }
```

Note the non-JSON fallback drops the raw `text` from user-facing copy (it's already in `logError`). SSE `error` events keep `onError(event.content)` — add `, undefined` for the explicit no-code.

- [ ] **Step 4: chatStore.js.** Reorder `friendlyChatError` buckets (busy BEFORE auth) and anchor the auth patterns:

```js
export function friendlyChatError(raw) {
  const s = String(raw)
  if (/daily limit/i.test(s)) return { message: s, isLimit: true }
  if (/overloaded|529|error 5\d\d|claude api error: 5/i.test(s)) {
    return { message: 'Claude is busy right now — give it a moment and try again.', isLimit: false }
  }
  if (/not authenticated|error 401\b|^unauthorized/i.test(s)) {
    return { message: "You're signed out — sign in again to keep chatting.", isLimit: false }
  }
  if (/failed to fetch|networkerror|load failed|no response stream/i.test(s)) {
    return { message: "Couldn't reach the server — check your connection and try again.", isLimit: false }
  }
  return { message: 'Claude hit a snag — try sending that again.', isLimit: false }
}
```

And `onError` in `sendMessage` becomes code-aware — envelope messages are already friendly, so pass them through:

```js
onError: (error, code) => {
  logError('[chatStore] stream error:', error, code)
  const friendly = code
    ? { message: String(error), isLimit: code === 'rate_limit' }
    : friendlyChatError(error)
  // …unchanged set() body…
},
```

- [ ] **Step 5: Run** aiClient, chatStore, chatStoreMode, pillAgentLoop test files, then the full suite. All PASS.
- [ ] **Step 6: Commit** `fix(ai): aiClient survives network failure (unblocks pill hang), parses the error envelope, wires 429 remaining`

---

### Task 4: check-email error codes reach the client

**Files:**
- Modify: `src/store/authStore.js:159-172` (checkEmailExists)
- Test: `src/__tests__/checkEmail.test.js` (new)

- [ ] **Step 1: Failing test** (`src/__tests__/checkEmail.test.js`) — mock `supabase.functions.invoke` following the mocking style of existing store tests:

```js
import { describe, test, expect, vi, beforeEach } from 'vitest'
vi.mock('../lib/supabase', () => ({ supabase: { functions: { invoke: vi.fn() }, auth: { onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })), getSession: vi.fn() } } }))
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

describe('checkEmailExists error codes', () => {
  test('rate_limited becomes a friendly wait message with the code attached', async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: null,
      error: { message: 'FunctionsHttpError', context: new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 }) },
    })
    await expect(useAuthStore.getState().checkEmailExists('a@b.co')).rejects.toMatchObject({
      code: 'rate_limited',
      message: expect.stringMatching(/too many attempts/i),
    })
  })
})
```

- [ ] **Step 2: Run — FAIL.**
- [ ] **Step 3: Implement** in authStore:

```js
  checkEmailExists: async (email) => {
    const { data, error } = await supabase.functions.invoke('check-email', {
      body: { email: email.trim().toLowerCase() },
    })
    if (error) {
      // functions.invoke wraps non-2xx in FunctionsHttpError with the raw
      // Response on error.context — read the body so the server's error
      // codes (invalid_email / rate_limited / …) aren't thrown away.
      let code = null
      try {
        const body = await error.context?.json?.()
        code = body?.error ?? null
      } catch { /* non-JSON body — fall through to generic */ }
      const MESSAGES = {
        invalid_email: "That email address doesn't look right.",
        rate_limited: 'Too many attempts — wait a moment and try again.',
      }
      const err = new Error(MESSAGES[code] || error.message || 'check-email failed')
      err.code = code
      throw err
    }
    if (data && typeof data.exists === 'boolean') return data.exists
    throw new Error('check-email returned unexpected shape')
  },
```

Callers keep their degrade behavior (LandingPage falls through to sign-in by design) — no caller changes.

- [ ] **Step 4: Run test file + full suite — PASS.**
- [ ] **Step 5: Commit** `fix(auth): read check-email error codes instead of throwing them away`

---

### Task 5: boardStore critical paths — silent creates, unchecked deletes, drag desync, orphaned uploads

**Files:**
- Modify: `src/store/boardStore.js` (addBoard:234+252, deleteBoard:318, deleteColumn:446, persistCardPositions:900-903, uploadAttachment:1136)
- Test: `src/__tests__/boardStoreErrors.test.js` (new, if store mocking proves practical — see Step 5)

- [ ] **Step 1: addBoard.** Replace `if (error) return null` (line 234) with:

```js
    if (error) {
      logError('Failed to create board:', error)
      showToast.error('Failed to create board')
      return null
    }
```

and `if (!board) return null` (line 252) with:

```js
    if (!board) {
      logError('Board created but could not be loaded back:', boardRes.error, colsRes.error)
      showToast.error('Failed to create board')
      return null
    }
```

- [ ] **Step 2: deleteBoard commit check.** Replace line 318's bare `await supabase.from('boards').delete().eq('id', boardId)` with the deleteCard pattern (prev state is already captured at the top of the function):

```js
      const { error } = await supabase.from('boards').delete().eq('id', boardId)
      if (error) {
        logError('Failed to delete board:', error)
        set((s) => {
          const columns = { ...s.columns }
          const cards = { ...s.cards }
          prevColumns.forEach((c) => { columns[c.id] = c })
          prevCards.forEach((c) => { cards[c.id] = c })
          return { boards: { ...s.boards, [boardId]: prevBoard }, columns, cards }
        })
        showToast.error('Failed to delete board — it was restored')
      }
```

- [ ] **Step 3: deleteColumn commit check.** Same pattern at line 446:

```js
      const { error } = await supabase.from('columns').delete().eq('id', columnId)
      if (error) {
        logError('Failed to delete section:', error)
        set((s) => {
          const cards = { ...s.cards }
          prevCards.forEach((c) => { cards[c.id] = c })
          return { columns: { ...s.columns, [columnId]: prevColumn }, cards }
        })
        showToast.error('Failed to delete section — it was restored')
      }
```

- [ ] **Step 4: persistCardPositions — surface + resync instead of silent desync.** Replace lines 899-903:

```js
    // Parallel writes to minimize race window
    const results = await Promise.all(writes.map(({ id, ...rest }) =>
      supabase.from('cards').update(rest).eq('id', id)
        .then(({ error }) => {
          if (error) logError('Failed to persist card position:', error)
          return !error
        })
    ))
    const anyFailed = results.some((ok) => !ok)
    if (anyFailed) showToast.error('Some card moves failed to save — resyncing')
```

and widen the refetch condition at line 908 from `if (movedCrossColumn && boardId && …)` to `if ((movedCrossColumn || anyFailed) && boardId && …)` so a failed write resyncs local state from the DB.

- [ ] **Step 5: uploadAttachment — clean up the orphan + toast.** Replace lines 1136-1139:

```js
    if (error) {
      logError('Failed to save attachment metadata:', error)
      // The storage object is already uploaded — remove it so a metadata
      // failure doesn't orphan a file the UI will never reference.
      supabase.storage.from('attachments').remove([storagePath]).catch(() => {})
      showToast.error('Failed to attach file')
      return null
    }
```

- [ ] **Step 6: Tests.** Check how existing `src/__tests__/boardRestoration.test.js` mocks the store/supabase. If a chainable supabase mock is available/practical, add `boardStoreErrors.test.js` covering: addBoard insert error → returns null + toast called; persistCardPositions failure → toast + refetch. If the existing test infrastructure would require building a large bespoke supabase mock, note it in the report and rely on the full-suite regression + Task 11's browser verification instead — do NOT write tests that only assert mocks.

- [ ] **Step 7: Run full suite + build. Commit** `fix(store): boardStore — checked deletes, loud create failures, drag resync, no orphaned uploads`

---

### Task 6: Toast the silent rollbacks + fix raw-message copy (boardStore + workspacesStore)

**Files:**
- Modify: `src/store/boardStore.js` (8 mutation tails + 8 label toasts + addComment)
- Modify: `src/store/workspacesStore.js` (leaveWorkspace, renameWorkspace, declineInvitation, cancelInvitation)

All are one-line additions inside existing `if (error)` branches (the logError + rollback already exist — see the audit). Add `showToast.error('<copy>')` with exactly:

| Site (boardStore) | Copy |
|---|---|
| `updateBoardIcon` (~277) | `Failed to update board icon` |
| `updateColumnWipLimit` (~401) | `Failed to update WIP limit` |
| `updateCard` (~661) | `Failed to save changes` |
| `completeCard` (~739) | `Failed to update task` |
| `archiveCard` (~806) | `Failed to archive task` |
| `unarchiveCard` (~826) | `Failed to restore task` |
| `deleteComment` (~1066) | `Failed to delete comment` |
| `deleteAttachment` (~1168) | `Failed to remove file` |
| `addComment` insert-error rollback (~1010s, locate the `logError` + temp-removal branch) | `Failed to add comment` |

- [ ] **Step 1: Add the 9 toasts above.**

- [ ] **Step 2: Label toasts — fixed copy.** Replace the interpolated messages (keep both `23505` `showToast.warn` special cases exactly as they are):

| Line | Old | New |
|---|---|---|
| 1441 | `` `Couldn't add label: ${error.message}` `` | `Couldn't add label — try again` |
| 1470 | `` `Couldn't create label: ${error.message}` `` | `Couldn't create label — try again` |
| 1497 | `` `Couldn't remove label: ${error.message}` `` | `Couldn't remove label — try again` |
| 1508 | `` `Couldn't rename label: ${error.message}` `` | `Couldn't rename label — try again` |
| 1519 | `` `Couldn't update color: ${error.message}` `` | `Couldn't update the label color — try again` |
| 1527 | `` `Couldn't merge: ${error.message}` `` | `Couldn't merge labels — try again` |
| 1545 | `` `Couldn't archive: ${error.message}` `` | `Couldn't archive the label — try again` |
| 1558 | `` `Couldn't unarchive: ${error.message}` `` | `Couldn't restore the label — try again` |

Ensure each of the 8 sites also calls `logError(...)` with the error object so the detail still reaches Sentry (add where missing).

- [ ] **Step 3: workspacesStore.** `leaveWorkspace` (~line 406): replace `showToast.error(error.message || 'Failed to leave workspace')` with `showToast.error('Failed to leave workspace')` (keep/ensure `logError`). Add `showToast.error(...)` to the existing error branches of: `renameWorkspace` → `Failed to rename workspace`; `declineInvitation` → `Failed to decline invitation`; `cancelInvitation` → `Failed to cancel invitation`.

- [ ] **Step 4: Verify no raw interpolation remains:** `grep -n 'error.message' src/store/*.js` — remaining hits must be logError args or error-state fields only, never toast/UI copy. Include the grep output in the report.

- [ ] **Step 5: Full suite + build. Commit** `fix(store): every failed mutation tells the user — fixed copy, no raw error.message in toasts`

---

### Task 7: noteStore + notificationStore stop ignoring errors

**Files:**
- Modify: `src/store/noteStore.js:42-52` (addNote)
- Modify: `src/store/notificationStore.js:33-84` (markAsRead, markAllAsRead, notify)

- [ ] **Step 1: noteStore.addNote** — capture and handle the insert error (notes UI is unwired, so no toast; log + error state):

```js
    const { data: note, error } = await supabase
      .from('notes')
      .insert(validated.data)
      .select()
      .single()

    if (error) {
      logError('Failed to create note:', error)
      set({ error: { message: error.message, action: 'addNote' } })
      return null
    }
    set((state) => ({ notes: { ...state.notes, [note.id]: note } }))
    return note.id
```

- [ ] **Step 2: notificationStore.markAsRead** — optimistic with rollback (no toast: background, low-stakes; the rollback itself is the honest signal):

```js
  markAsRead: async (notificationId) => {
    const prev = get().notifications
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      )
      return { notifications: updated, unreadCount: updated.filter((n) => !n.read).length }
    })
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
    if (error) {
      logError('Failed to mark notification read:', error)
      set({ notifications: prev, unreadCount: prev.filter((n) => !n.read).length })
    }
  },
```

- [ ] **Step 3: markAllAsRead** — same shape: snapshot `prev` before the optimistic set, check `const { error }`, roll back + `logError('Failed to mark all notifications read:', error)` on failure.

- [ ] **Step 4: notify** — check the insert:

```js
    const { error } = await supabase.from('notifications').insert({ /* unchanged */ })
    if (error) logError('Failed to create notification:', error)
```

- [ ] **Step 5: Full suite + build. Commit** `fix(store): noteStore/notificationStore check their writes — rollback on failure, detail to Sentry`

---

### Task 8: Realtime failure recovery for the three deaf stores

**Files:**
- Modify: `src/store/notificationStore.js` (subscribeToNotifications), `src/store/workspacesStore.js` (~207), `src/store/boardSharingStore.js` (~298)

Copy boardStore's pattern (boardStore.js:1311-1316 + scheduleReconnect at 18-25). Per store, add a module-scoped reconnect timer + helper that re-invokes that store's own subscribe function, and replace the bare `.subscribe()` with:

```js
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logError('Realtime <name> subscription error:', err)
          scheduleReconnect()
        }
      })
```

- [ ] **Step 1: notificationStore.** Module scope:

```js
let reconnectTimer = null
let lastUserId = null
function scheduleReconnect() {
  if (reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    if (lastUserId) useNotificationStore.getState().subscribeToNotifications(lastUserId)
  }, 3000)
}
```

In `subscribeToNotifications`: set `lastUserId = userId` at the top; before creating the new channel, remove a previous one if the store tracks it (check the file — if it doesn't track the channel, store it in a module-scoped `let activeChannel` and `supabase.removeChannel(activeChannel)` before resubscribing so reconnects don't stack channels); use the status callback above; the returned teardown must also `clearTimeout(reconnectTimer); reconnectTimer = null; lastUserId = null`.

- [ ] **Step 2: workspacesStore + boardSharingStore.** Same recipe adapted to each store's subscribe function (each already returns a teardown that removes the channel — extend it to clear the timer). Name the logError messages `'Realtime workspaces subscription error:'` / `'Realtime board-sharing subscription error:'`.

- [ ] **Step 3: Full suite + build (subscriptions are exercised by mocked tests if any — fix fallout). Commit** `fix(store): realtime channels recover from CHANNEL_ERROR/TIMED_OUT in all stores, not just boards`

---

### Task 9: toolExecutor honesty

**Files:**
- Modify: `src/lib/toolExecutor.js` (create_board:657-665; label-sync catches at 214-218, 541-545, 780-783, 938-947; create_card poll result ~197-220; destructive notes at 643, 1058, 1108)
- Test: extend the existing toolExecutor test file if one exists (grep `toolExecutor` in `src/__tests__/`); otherwise cover create_board via a focused new test only if the file's mocking pattern makes it practical (same rule as Task 5 Step 6).

- [ ] **Step 1: create_board can fail:**

```js
  if (action === 'create_board') {
    const columns = params.columns || ['To Do', 'In Progress', 'Done']
    const boardId = await store.addBoard(params.name, params.icon || null, columns)
    if (!boardId) {
      return { ok: false, error: 'Board creation failed — nothing was saved' }
    }
    store.setActiveBoard(boardId)
    window.dispatchEvent(new CustomEvent('kolumn:ai-navigate-board'))
    return { ok: true, boardId }
  }
```

- [ ] **Step 2: label-sync failures reach the model.** At each of the four catch sites, capture a warning into the returned result instead of only logWarn. Pattern for create_card (214-218):

```js
    let labelWarning
    if (cardId !== tempId && params.labels !== undefined) {
      try {
        await resolveAndSyncLabels(cardId, board.id, params.labels)
      } catch (err) {
        logWarn('[toolExecutor] create_card label sync failed:', err)
        labelWarning = 'labels could not be applied'
      }
    } else if (params.labels !== undefined && cardId === tempId) {
      labelWarning = 'card still syncing — labels were skipped'
    }
```

and spread `...(labelWarning ? { warning: labelWarning } : {})` into that handler's return object. Apply the same capture-and-return at the update_card / update_cards / duplicate_card sites (update_cards may aggregate: collect per-card failures into one `warning: 'labels failed for N card(s)'`).

- [ ] **Step 3: destructive tools tell the truth.** Keep the fire-and-forget architecture (the DB write is deferred behind the 5s undo window by design — awaiting it would stall the loop), but make the reported note honest at the three sites (643/1058/1108): the returned `note` must say `queued for deletion — the user has a 5-second undo; failures will surface to the user directly`. (Task 5's commit checks now toast the user on failure, closing the loop that made this dishonest.)

- [ ] **Step 4: Run the full suite + build. Commit** `fix(ai): toolExecutor stops reporting success for failed work — create_board can fail, label warnings surface`

---

### Task 10: Migration surfacing, destructive-red hover sweep, CLAUDE.md truth

**Files:**
- Modify: `src/hooks/useAppData.js:138-145`
- Modify: `src/components/workspace/WorkspaceDangerZone.jsx:32`
- Modify: the enumerated components below
- Modify: `CLAUDE.md` (one sentence)

- [ ] **Step 1: handleMigrate reads the result** (`migrateLocalData()` returns `true` only on full success; the banner only renders when local data + user exist, so `false` here means partial failure with source data retained):

```js
  const handleMigrate = async () => {
    setMigrating(true)
    const fullyMigrated = await migrateLocalData()
    await fetchBoards()
    await fetchNotes()
    setMigrating(false)
    setShowMigration(false)
    if (!fullyMigrated) {
      showToast.warn('Some items could not be imported — your local data was kept so you can retry')
    }
  }
```

Add the `showToast` import if missing.

- [ ] **Step 2: WorkspaceDangerZone trigger** (line 32): `text-[var(--color-copper)]` → `text-[var(--label-red-text)]`.

- [ ] **Step 3: Destructive hover sweep.** Change `hover:text-[var(--color-copper)]` → `hover:text-[var(--label-red-text)]` at exactly these sites (they are delete/remove affordances):
  - `src/pages/ChatListPage.jsx:73` (delete chat)
  - `src/components/board/cardDetail/CardChecklist.jsx:35` (delete checklist item)
  - `src/components/board/BoardShareModal.jsx:279, 291, 328` (remove member / leave board / cancel invite)
  - `src/components/layout/SidebarBoardItem.jsx:123` (delete board)
  - `src/components/board/cardDetail/CardFiles.jsx:71` (remove file)
  - `src/components/board/InlineCardEditor.jsx:223` (remove label chip)
  - `src/components/board/IconPicker.jsx:176` (remove icon)
  - `src/components/board/ArchivedCardsPanel.jsx:38` — first READ the element: if it is a delete affordance, convert; if it is restore, leave copper off entirely (restore is positive — check what it does and note the decision)
  - `src/components/board/CardDetailPanel.jsx:383` — READ first: convert only if delete/archive
  Leave untouched (not destructive intent): `SidebarBoardItem.jsx:110` (options), `BoardSelector.jsx:181` (active indicator), `InlineCardEditor.jsx:324` (add-label toggle) and `:359` (cancel edit), `NotificationBell.jsx:48` (mark all read), `NotesPage.jsx:131` (removed page — do not touch).

- [ ] **Step 4: CLAUDE.md.** Update the destructive-color bullet's trailing caveat ("Legacy copper hover tints … pending migration") to: `Destructive hover affordances (delete/remove/leave) use red; copper hovers that remain are non-destructive accents (options, toggles, active indicators).`

- [ ] **Step 5: Full gate (lint/test/build). Commit** `fix(ui): destructive hovers go red, migration failures surface, docs match reality`

---

### Task 11: Final gate + end-to-end verification

**Files:** none new (verification only; the controller updates the audit artifact separately).

- [ ] **Step 1:** `npm run lint && npm run test && npm run build` — all clean.
- [ ] **Step 2:** `deno check supabase/functions/chat/index.ts` (already deployed in Task 2 — confirm no drift since: `git status supabase/` clean).
- [ ] **Step 3: Browser verification** (dev server on :5173, Playwright available):
  - Chat stream error (the surface every prior pass skipped): sign in (account `claude-visual-test@example.com` / `TestPass123!` exists), open `/chat`, block the `/functions/v1/chat` route (Playwright `route.abort()`), send a message → expect the copper wash InlineNotice with the network-bucket copy, not a hang and not raw text. Screenshot.
  - Pill no-hang regression: on a board, with the same route blocked, use the quick-add pill → the pill loop must surface an error and NOT hang (this was the pillAgentLoop hang fixed in Task 3). Screenshot or note the surfaced state.
  - Drag a card with the route to `cards` blocked (`**/rest/v1/cards*` PATCH abort) → expect the "Some card moves failed to save — resyncing" toast and the card snapping back after resync.
- [ ] **Step 4:** Write the verification evidence into the task report; list any finding → back to the relevant task as a fix loop.
- [ ] **Step 5: Commit** anything the verification forced, else no commit.

---

## Out of scope (deliberate)

- **Toast visual decisions** (error/delete/overdue pixel-identical; hardcoded `#1B1B18` border / dark-theme toasts) — needs a design pick via a mockup page, queued separately.
- **AI-workflow backlog items** (model ID consolidation, `classifyModel`, tool-result loop T1-#3, prompt caching split) — separate effort, unchanged by this plan.
- **noteStore update/delete toasts** — notes UI is unwired; rollback + Sentry logging stays, no user-facing copy until the surface returns.
