# AI Chat Titles — Haiku-named conversations

**Date:** 2026-07-25
**Status:** Approved
**Scope:** Replace the 39-char truncation "titles" with a one-shot Haiku
naming call after the first exchange, claude.ai-style. Approach A from
brainstorming: a lightweight `title` mode on the existing chat edge function
(the "one Claude entry point" rule). No new UI.

## Server (`supabase/functions/chat/`)

### index.ts — `mode: "title"`
- Mode validation widens to `"pill" | "chat" | "title"`.
- The title branch: authenticated like the others, then **short-circuits
  the heavy path** — no `buildContext` (no boards/notes queries), no tools,
  no usage increment (**unbilled**: housekeeping, not a user message; abuse
  ceiling is the 32-token cap), no continuation logic. `boardId` forced
  undefined.
- Anthropic call: model from the existing `classifyModel("")` path (no new
  hardcoded model string — T2-#5/#8 still owns centralizing), fixed system
  prompt (below), `max_tokens: 32`, no tools, no cache_control (the prompt
  is tiny), `messages: [{ role: "user", content: body.message }]` — history
  is ignored in title mode.
- Response streams through the existing `SSEWriter` (`tier` event may be
  skipped or emitted with the checked tier; `text` + `done` as usual) so
  `aiClient.streamChat` works unchanged with `mode: 'title'`.

System prompt (verbatim):

```
You name chat conversations. Given the first exchange of a conversation, reply with ONLY a short title for it: 2-5 words, no quotes, no trailing punctuation, no emojis. Capture the topic, not the greeting.
```

### tier.ts
- `Mode` type widens to `"pill" | "chat" | "title"`.
- `filterToolsForMode` returns `[]` for `"title"`.
- `checkTier` is still called for auth/tier info, but the title branch in
  index.ts passes the flag that skips the usage increment (reuse the
  existing `isContinuation`-style skip or an explicit option — implementer
  detail; the observable contract is: title calls never decrement
  `remaining` and never 429 a user who still has normal messages; a user at
  the daily limit MAY still get titles — acceptable).

## Client

### chatStore.js — `generateTitle` becomes AI-powered
- Signature stays `generateTitle(conversationId)`; still called from
  `sendMessage` on success.
- Guards, in order: conversation exists; `titleEdited` absent (manual
  renames always win); `aiTitled` absent (name once); first user message
  AND first assistant reply with non-empty text both exist.
- Immediate fallback first: keep the current truncation behavior
  synchronously (so a title always exists even if the call fails or is
  slow), then fire the AI call to refine it.
- AI call: `streamChat({ mode: 'title', message: <input>, history: [] }, …)`
  where `<input>` is:
  `` `User: ${firstUser.text.slice(0, 500)}\nAssistant: ${firstAssistant.text.slice(0, 500)}` ``
- Cleanup on the collected text: trim; strip wrapping single/double quotes;
  strip trailing `.`/`…`; collapse internal whitespace; clamp to 60 chars.
  Empty/whitespace result → keep the truncation fallback, do NOT set
  `aiTitled` (retries after the next exchange).
- Success: set `title` and `aiTitled: true`. If the user manually renamed
  while the call was in flight (`titleEdited` now true), discard the AI
  result.
- Errors: swallow with `logError`; truncation fallback already applied;
  `aiTitled` stays unset so the next exchange retries.

### No UI changes
ChatListPage rows and ChatPage's heading already render `conversation.title`
reactively; the name refines itself when the call returns. The rename flow
(`renameConversation` → `titleEdited`) is unchanged and always wins.

## Out of scope

- Renaming existing/old conversations retroactively.
- Title regeneration on demand ("rename with AI" menu item) — possible
  follow-up, not now.
- Model routing / central MODEL constant (backlog T2 items unchanged).

## Testing

- Vitest (mock `aiClient.streamChat`): AI title set + `aiTitled` stamped;
  `titleEdited` blocks the call entirely; mid-flight manual rename discards
  the AI result; error path keeps truncation and leaves `aiTitled` unset;
  cleanup rules (quotes/punctuation/clamp); second exchange does not re-call
  once `aiTitled`.
- Deno (`tier.test.ts`): `filterToolsForMode(…, "title")` returns `[]`.
- Live: deploy (expect v47), tail logs; new conversation gets a real name a
  beat after the first reply; daily `remaining` unaffected by the title
  call; manual rename sticks.
