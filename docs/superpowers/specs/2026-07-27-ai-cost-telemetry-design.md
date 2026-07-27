# AI Cost & Telemetry Batch — cache split, model constant, usage logging, continuation hardening

**Date:** 2026-07-27
**Status:** Approved (autonomous run; user delegated design decisions)
**Origin:** Backlog T2-7/8/9/10 plus the filed continuation-billing hardening.
Scout facts: the single system block carries `cache_control` over the WHOLE
prompt (index.ts:259-265), so any card edit invalidates the entire cache;
model ID is hardcoded at tier.ts:61/117/118; `classifyModel` is dead (both
branches identical AND its only call site passes `""`); no Anthropic usage
field is read anywhere; continuations are "validated" by a type tag only,
with no history caps.

## 1. Model constant (T2-8) + classifyModel deletion (T2-9)

New `supabase/functions/chat/model.ts`: `export const MODEL =
"claude-haiku-4-5-20251001"`. tier.ts imports it; all three literals
replaced; `classifyModel` deleted outright (pro path returns `model: MODEL`).
The AI-specific convention in CLAUDE.md ("fix them all in the same change")
is satisfied — after this, exactly one model literal exists in the repo.

## 2. Prompt cache split (T2-7)

`buildContext` returns `{ systemBlocks: { static, dynamic } }` instead of one
string:

- **static** (cacheable, user-agnostic): the persona line + the mode's rules
  block (`chatRulesSection` / `freePillRules` / `proPillRules`, including the
  icon section). Segment text byte-identical to today; only assembly position
  changes.
- **dynamic** (uncached): `User/Today/Team${workspacesLine}${scopeSection}` +
  board snapshot + alerts + activity counts + notes — exactly today's
  segments, same relative order.

This moves the rules ABOVE the volatile data — the ordering CLAUDE.md's
cacheability rule already prescribes ("static prefix first, volatile tail
last"). index.ts sends `system` as two blocks with `cache_control:
{ type: "ephemeral" }` on the static block only, and adds a second cache
breakpoint on the LAST tool (tools precede system in Anthropic's cache
hierarchy, so uncached tools would invalidate the system prefix). The title
branch is untouched (tiny prompt, not worth a breakpoint).

Effect: a card edit now invalidates only the dynamic tail; the tools array +
persona + rules (the bulk of every prompt) stay cached across messages and
across users' actions on their boards.

**Doc verification requirement:** the implementer verifies current caching
semantics against https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
(system-block arrays, breakpoint placement, tools-first hierarchy, minimum
cacheable token counts for the Haiku tier) via WebFetch before writing code,
and records findings in the task report. Memory is not trusted (CLAUDE.md
convention).

## 3. Usage telemetry (T2-10)

index.ts SSE loop gains `message_start` handling (captures
`event.message.usage`) and reads `event.usage` from `message_delta`
(output_tokens). On stream close, one structured log line:

```
console.log("[chat] usage", JSON.stringify({ mode, tier, model,
  continuation, input_tokens, cache_creation_input_tokens,
  cache_read_input_tokens, output_tokens }))
```

The title branch logs its non-streamed `data.usage` the same way with
`mode: "title"`. Read via `supabase functions logs chat` / MCP `get_logs`.
No client-visible change.

## 4. Continuation & history hardening

All modes: `body.history`, when present, must be an array of ≤ 40 items;
each item's `content`, when a string, ≤ 50,000 chars (block-array contents
size-checked at the same cap via JSON length). Violations → 400
`invalid_history`.

Array-form `body.message` (continuations): ≤ 8 blocks; every block must be
`{ type: "tool_result", tool_use_id: string, content: string ≤ 50,000 }`;
AND every `tool_use_id` must appear as a `tool_use` id inside a prior
assistant message in `body.history` (a stateless consistency check — still
forgeable with a fabricated history, but it blocks accidental misuse and
raises abuse effort; true anti-forgery needs server-side turn state, out of
scope). Violations → 400 `invalid_message`. The unbilled flag is unchanged
for payloads that pass. The usage log line (`continuation: true`) makes
whatever remains observable. Client loops clamp each tool_result to 10,000
chars with a truncation marker so aggregated rounds always fit the
history-item cap.

## Out of scope

Model routing by intent (a future decision — the constant makes it easy);
forwarding usage to the client; server-side turn state; `remaining: -1` tier
event cosmetics; title-branch caching.

## Testing

- Deno `tier.test.ts` extended: MODEL constant exported/used; classifyModel
  gone (import fails if referenced). New `validate.test.ts` (or extend):
  history caps, continuation block schema, tool_use_id-in-history check —
  valid and invalid payloads.
- Prompt identity: segment-level byte-identity — each named segment
  (persona, rules blocks, each dynamic segment) byte-identical pre/post
  split, verified programmatically by the implementer (old assembled string
  vs re-concatenation of new blocks in the OLD order must match; report the
  method).
- `deno check` clean. Deploy v53 (controller, after final review); verify
  via function logs that `[chat] usage` lines appear and
  `cache_read_input_tokens > 0` on a second consecutive message (live gate,
  after next real traffic).
