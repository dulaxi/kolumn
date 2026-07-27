# AI Cost & Telemetry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cached-prefix prompt split, single MODEL constant, Anthropic usage logging, and continuation/history validation in the chat edge function.

**Architecture:** Edge-function-only change (no client code). `buildContext` returns `{ systemBlocks: { static, dynamic } }`; index.ts sends two system blocks with a breakpoint on the static one plus a breakpoint on the last tool; a `message_start`/`message_delta` usage capture logs one structured line per request; a new `validateHistoryAndContinuation` helper in tier.ts gates malformed payloads with 400s.

**Tech Stack:** Supabase Edge Functions (Deno), Anthropic Messages API prompt caching.

**Spec:** `docs/superpowers/specs/2026-07-27-ai-cost-telemetry-design.md`

## Global Constraints

- After this branch, exactly ONE model-ID literal exists in the repo: `supabase/functions/chat/model.ts`. `classifyModel` is deleted, not stubbed.
- Segment-level prompt identity: every named segment's TEXT is byte-identical pre/post — only assembly order changes (static block = persona + rules; dynamic block = the seven data segments in today's relative order). The implementer must programmatically verify: re-concatenating the new blocks' segments in the OLD order reproduces the old `systemPrompt` byte-for-byte, for all three mode/tier shapes (chat, free pill, pro pill), and record the method + result in the report.
- Cache breakpoints: `cache_control: { type: "ephemeral" }` on the LAST tool (map-copy, never mutate the shared TOOLS entries) and on the static system block. Dynamic block and title branch get none.
- Before writing the caching code, verify semantics against https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching via WebFetch (block arrays, breakpoint placement, tools→system hierarchy, Haiku minimum cacheable tokens); record findings in the report. Do not go by memory.
- Usage log line format exactly: `console.log("[chat] usage", JSON.stringify({ mode, tier, model, continuation, input_tokens, cache_creation_input_tokens, cache_read_input_tokens, output_tokens }))` — absent fields logged as null, never undefined-dropped.
- Validation caps (exact): history ≤ 40 items; per-item string content ≤ 50000 chars (non-string content: `JSON.stringify(content).length ≤ 50000`); continuation array ≤ 8 blocks; every block `type === "tool_result"`, `tool_use_id` a non-empty string, string `content` ≤ 50000 chars (large summarize_board results are legitimate); every `tool_use_id` present as a `tool_use` block id in some assistant history item. History violations → 400 `{ error: "invalid_history", message: "History is too large or malformed." }`; continuation violations → 400 `{ error: "invalid_message", message: "Malformed tool results." }`.
- Title mode: skip continuation validation (its message is a string), but the history cap does not apply there either (title ignores history entirely — leave that behavior alone).
- Deno at `~/.deno/bin/deno`; after any deno run, `git checkout -- deno.lock` before committing. Do NOT deploy — controller deploys v53 after final review.
- Commit scope `feat(ai)` / `fix(ai)` as given per task.

---

### Task 1: MODEL constant + delete classifyModel

**Files:**
- Create: `supabase/functions/chat/model.ts`
- Modify: `supabase/functions/chat/tier.ts`
- Test: `supabase/functions/chat/tier.test.ts` (extend)

**Interfaces:**
- Produces: `export const MODEL = "claude-haiku-4-5-20251001"` — Tasks 2-4 and index.ts continue to consume `tierInfo.model`, which now always equals MODEL.

- [ ] **Step 1: Write the failing test**

Append to `supabase/functions/chat/tier.test.ts` (import `MODEL` from `./model.ts` at the top alongside the existing imports):

```ts
Deno.test("checkTier model always comes from the MODEL constant", async () => {
  // classifyModel is gone; both tiers resolve the same central constant.
  // (checkTier's DB calls are unreachable here — this only checks the constant wiring
  // via the module surface: MODEL exists and tier.ts re-exports no classifyModel.)
  assertEquals(typeof MODEL, "string")
  assertEquals(MODEL.startsWith("claude-"), true)
  const tierModule = await import("./tier.ts")
  assertEquals("classifyModel" in tierModule, false)
})
```

Run: `~/.deno/bin/deno test supabase/functions/chat/tier.test.ts` — FAIL (model.ts missing).

- [ ] **Step 2: Implement**

Create `supabase/functions/chat/model.ts`:

```ts
// The ONE model-ID literal in the repo (CLAUDE.md → AI conventions / T2-#8).
// Change models here and nowhere else.
export const MODEL = "claude-haiku-4-5-20251001"
```

In `tier.ts`: add `import { MODEL } from "./model.ts"`; replace `const model = "claude-haiku-4-5-20251001"` (line ~61) with `const model = MODEL`; replace the pro-path return's `model: classifyModel("")` with `model: MODEL`; DELETE the entire `classifyModel` function. Confirm with `grep -rn "claude-haiku" supabase/functions/chat/` → only model.ts matches.

- [ ] **Step 3: Verify + commit**

`~/.deno/bin/deno test supabase/functions/chat/tier.test.ts` (all pass), `~/.deno/bin/deno check supabase/functions/chat/index.ts`, `git checkout -- deno.lock`.

```bash
git add supabase/functions/chat/model.ts supabase/functions/chat/tier.ts supabase/functions/chat/tier.test.ts
git commit -m "fix(ai): central MODEL constant; delete dead classifyModel"
```

---

### Task 2: Prompt cache split

**Files:**
- Modify: `supabase/functions/chat/context.ts` (return `{ systemBlocks }`), `supabase/functions/chat/index.ts` (consume blocks + tool breakpoint)
- Test: identity verification script (throwaway, method recorded in report) + `deno check`.

**Interfaces:**
- Produces: `buildContext(...) -> Promise<{ systemBlocks: { static: string, dynamic: string } }>`.

- [ ] **Step 1: WebFetch the prompt-caching docs** (see Global Constraints) and record: block-array `system` support, breakpoint placement semantics, tools→system→messages hierarchy, minimum cacheable prompt length for the Haiku tier.

- [ ] **Step 2: Split context.ts**

Capture the CURRENT assembled `systemPrompt` template (git HEAD copy) for the identity check. Then restructure the final assembly (context.ts ~line 308-327) into:

```ts
  const staticBlock = `You are Kolumn, a sharp project management assistant. You manage boards, cards, and workflow. Be direct — act on clear intent, ask only when genuinely ambiguous.

${chatMode ? chatRulesSection : tier === "free" ? freePillRules : proPillRules}`

  const dynamicBlock = `User: ${profile.display_name}
Today: ${today}
Team: ${memberList || "None"}${workspacesLine}${scopeSection}

${boardSectionHeading}
${boardSummary || "No boards yet"}

## Alerts
${alertsSummary}

## Recent activity (7 days)
- Created: ${recentCreated.length} cards
- Completed: ${recentCompleted.length} cards

## Notes
${notesSummary}`

  return { systemBlocks: { static: staticBlock, dynamic: dynamicBlock } }
```

Every `${...}` expression and every literal line must be lifted from the current template UNCHANGED — this is a re-grouping, not a rewrite.

- [ ] **Step 3: Programmatic identity check**

Write a throwaway Deno script (not committed) that imports nothing but reproduces both assemblies from fixed inputs (stub the interpolated values with sentinel strings): old template vs `dynamicBlock`-segments + `staticBlock`-segments re-concatenated in the OLD order (persona, data..., rules). Must match byte-for-byte for chat, free-pill, and pro-pill shapes. Record method + result in the report. (Sentinel-stub approach is acceptable because the check targets the LITERAL text between interpolations.)

- [ ] **Step 4: index.ts consumption**

Replace `const { systemPrompt } = await buildContext(...)` with `const { systemBlocks } = await buildContext(...)`. The Anthropic body becomes:

```ts
        model: tierInfo.model,
        max_tokens: 4096,
        system: [
          { type: "text", text: systemBlocks.static, cache_control: { type: "ephemeral" } },
          { type: "text", text: systemBlocks.dynamic },
        ],
        tools: withToolCacheBreakpoint(filterToolsForMode(TOOLS, tierInfo.tier, mode)),
```

with a small helper above the handler:

```ts
// Second cache breakpoint: tools precede system in Anthropic's cache
// hierarchy, so an uncached tools array would invalidate the system prefix.
// Map-copy — never mutate the shared TOOLS entries.
function withToolCacheBreakpoint(tools: any[]): any[] {
  if (tools.length === 0) return tools
  return tools.map((t, i) =>
    i === tools.length - 1 ? { ...t, cache_control: { type: "ephemeral" } } : t,
  )
}
```

Title branch untouched.

- [ ] **Step 5: Verify + commit**

`~/.deno/bin/deno check supabase/functions/chat/index.ts` clean; `~/.deno/bin/deno test supabase/functions/chat/tier.test.ts` still green; `git checkout -- deno.lock`.

```bash
git add supabase/functions/chat/context.ts supabase/functions/chat/index.ts
git commit -m "feat(ai): split system prompt into cached static prefix + dynamic tail"
```

---

### Task 3: Usage telemetry

**Files:**
- Modify: `supabase/functions/chat/index.ts`

- [ ] **Step 1: Capture + log**

In the SSE loop scope (next to `stopReason`), add `let usage: Record<string, number | null> = { input_tokens: null, cache_creation_input_tokens: null, cache_read_input_tokens: null, output_tokens: null }`. Add branches:

```ts
            } else if (event.type === "message_start") {
              const u = event.message?.usage
              if (u) {
                usage.input_tokens = u.input_tokens ?? null
                usage.cache_creation_input_tokens = u.cache_creation_input_tokens ?? null
                usage.cache_read_input_tokens = u.cache_read_input_tokens ?? null
              }
            }
```

and in the existing `message_delta` branch: `if (event.usage?.output_tokens != null) usage.output_tokens = event.usage.output_tokens`.

Immediately before `sse.close(stopReason)`:

```ts
      console.log("[chat] usage", JSON.stringify({
        mode, tier: tierInfo.tier, model: tierInfo.model,
        continuation: isContinuation, ...usage,
      }))
```

Title branch, after parsing `data`: log the same shape with `mode: "title"`, `continuation: false`, and `data.usage?.*` fields (null-coalesced).

- [ ] **Step 2: Verify + commit**

`~/.deno/bin/deno check supabase/functions/chat/index.ts`; `git checkout -- deno.lock`.

```bash
git add supabase/functions/chat/index.ts
git commit -m "feat(ai): log Anthropic usage fields per request"
```

---

### Task 4: Continuation & history validation

**Files:**
- Modify: `supabase/functions/chat/tier.ts` (new exported helpers), `supabase/functions/chat/index.ts` (wire the 400s)
- Test: `supabase/functions/chat/tier.test.ts` (extend)

**Interfaces:**
- Produces: `validateHistory(history: unknown) -> string | null` and `validateContinuation(message: unknown[], history: unknown[]) -> string | null` (null = valid, string = human message for the 400 body).

- [ ] **Step 1: Failing tests**

Append to `tier.test.ts`:

```ts
Deno.test("validateHistory caps length and content size", () => {
  assertEquals(validateHistory(undefined), null)
  assertEquals(validateHistory([{ role: "user", content: "hi" }]), null)
  assertEquals(validateHistory(Array.from({ length: 41 }, () => ({ role: "user", content: "x" }))) !== null, true)
  assertEquals(validateHistory([{ role: "user", content: "y".repeat(50001) }]) !== null, true)
  assertEquals(validateHistory("nope") !== null, true)
})

Deno.test("validateContinuation enforces shape, caps, and history linkage", () => {
  const history = [
    { role: "user", content: "q" },
    { role: "assistant", content: [{ type: "tool_use", id: "toolu_1", name: "search_cards", input: {} }] },
  ]
  const good = [{ type: "tool_result", tool_use_id: "toolu_1", content: "{}" }]
  assertEquals(validateContinuation(good, history), null)
  assertEquals(validateContinuation([{ type: "text", text: "x" }], history) !== null, true)
  assertEquals(validateContinuation([{ type: "tool_result", tool_use_id: "toolu_UNKNOWN", content: "{}" }], history) !== null, true)
  assertEquals(validateContinuation([{ type: "tool_result", tool_use_id: "toolu_1", content: "z".repeat(50001) }], history) !== null, true)
  assertEquals(validateContinuation(Array.from({ length: 9 }, () => ({ type: "tool_result", tool_use_id: "toolu_1", content: "{}" })), history) !== null, true)
})
```

Run — FAIL (helpers missing).

- [ ] **Step 2: Implement in tier.ts**

```ts
const HISTORY_MAX_ITEMS = 40
const HISTORY_MAX_CONTENT = 50000
const CONTINUATION_MAX_BLOCKS = 8
const TOOL_RESULT_MAX_CONTENT = 50000

// null = valid; otherwise a human-readable reason (the 400 message).
export function validateHistory(history: unknown): string | null {
  if (history === undefined || history === null) return null
  if (!Array.isArray(history)) return "history must be an array"
  if (history.length > HISTORY_MAX_ITEMS) return "history too long"
  for (const item of history) {
    if (!item || typeof item !== "object") return "malformed history item"
    const content = (item as any).content
    const size = typeof content === "string" ? content.length : JSON.stringify(content ?? "").length
    if (size > HISTORY_MAX_CONTENT) return "history item too large"
  }
  return null
}

// Continuations are unbilled — validate hard. Stateless linkage check: every
// tool_result must reference a tool_use id present in the supplied history.
// (Forgeable with a fabricated history; real anti-forgery needs server-side
// turn state. This blocks accidental misuse and raises abuse effort; the
// usage log line keeps the rest observable.)
export function validateContinuation(message: unknown[], history: unknown[]): string | null {
  if (message.length === 0 || message.length > CONTINUATION_MAX_BLOCKS) return "bad block count"
  const knownIds = new Set<string>()
  for (const item of Array.isArray(history) ? history : []) {
    const content = (item as any)?.content
    if (Array.isArray(content)) {
      for (const b of content) {
        if (b?.type === "tool_use" && typeof b.id === "string") knownIds.add(b.id)
      }
    }
  }
  for (const b of message) {
    if (!b || typeof b !== "object") return "malformed block"
    const block = b as any
    if (block.type !== "tool_result") return "only tool_result blocks allowed"
    if (typeof block.tool_use_id !== "string" || !block.tool_use_id) return "missing tool_use_id"
    if (!knownIds.has(block.tool_use_id)) return "tool_use_id not in history"
    if (typeof block.content === "string" && block.content.length > TOOL_RESULT_MAX_CONTENT) return "tool_result too large"
  }
  return null
}
```

- [ ] **Step 3: Wire index.ts**

After the mode validation (and NOT in the title branch — insert after the title branch returns, before `isContinuationMessage` is consumed):

```ts
    const historyErr = validateHistory(body.history)
    if (historyErr) {
      return json(400, { error: "invalid_history", message: "History is too large or malformed." })
    }
    if (Array.isArray(body.message)) {
      const contErr = validateContinuation(body.message, body.history || [])
      if (contErr) {
        return json(400, { error: "invalid_message", message: "Malformed tool results." })
      }
    }
```

(Adapt `json(...)` to the file's actual 400-response helper — read how `invalid_mode` responds and mirror it exactly.) Import the two helpers from `./tier.ts`.

- [ ] **Step 4: Verify + commit**

`~/.deno/bin/deno test supabase/functions/chat/tier.test.ts` all green; `~/.deno/bin/deno check supabase/functions/chat/index.ts`; `git checkout -- deno.lock`. Also `npm run test` once (client untouched — confirm no drift; the client pill/chat loops send tool_results built from real tool_use ids, so the linkage check must not break them: re-read src/lib/pillAgentLoop.js and src/lib/chatAgentLoop.js to confirm history sent on continuation rounds contains the assistant tool_use blocks — record the confirmation in the report; if it does NOT, report NEEDS_CONTEXT instead of loosening validation).

```bash
git add supabase/functions/chat/tier.ts supabase/functions/chat/index.ts supabase/functions/chat/tier.test.ts
git commit -m "fix(ai): validate history and continuation payloads"
```

Post-review (controller): deploy v53 via MCP, verify markers, then live gate — `[chat] usage` lines with `cache_read_input_tokens > 0` on consecutive messages.
