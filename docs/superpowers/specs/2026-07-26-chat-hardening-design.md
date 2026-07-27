# Chat Hardening — audit fix wave

**Date:** 2026-07-26
**Status:** Approved (user-delegated: "do chat hardening")
**Origin:** Three-way audit of the chat surface (UX / client correctness /
server-cost). This pass fixes every confirmed bug plus the S-sized quick
wins. Capability gaps (stop-generating, get_card tool, copy affordances,
message-content search, new-chat flow) are deliberately excluded — they need
product decisions and get their own pass.

## Scope (11 items)

### Client correctness

1. **Per-conversation streaming state.** `streamingConversationId` (single
   scalar) becomes a `streaming: { [conversationId]: true }` map with
   `setStreaming(id)` / `clearStreaming(id)`. Two conversations can stream
   independently; finishing one can no longer unblock the other's composer.
   `ChatPage` reads `!!s.streaming[id]`.
2. **Delete-mid-stream guard.** `patchMsg` inside `sendMessage` returns state
   unchanged when `s.messages[conversationId]` is gone (conversation deleted
   while streaming); the post-loop patches inherit the same guard; the
   streaming flag always clears. No uncaught TypeError, no stuck flag.
3. **Debounced, quota-guarded persistence.** chatStore's persist storage
   becomes a custom `createJSONStorage` adapter: writes debounce (trailing,
   400ms) so a streamed reply no longer rewrites the full history per chunk;
   `setItem` wraps in try/catch (`logError` on quota); a `pagehide` listener
   flushes the pending write so nothing is lost on tab close.
4. **`retryMessage(conversationId, messageId)`** store action: only acts on a
   message with `error`; finds the nearest preceding user message, removes
   the errored assistant message, re-runs `sendMessage` with that user text.

### Chat UI

5. **Retry affordance.** The error `InlineNotice` in `ChatMessage` gains an
   `action` Retry button (hidden for `isLimit` errors — retrying a rate
   limit is futile; the Upgrade link stays). `ChatPage` wires it to
   `retryMessage`.
6. **Typing indicator hides after the first token**: rendered only while the
   latest exchange's replies are all still empty.
7. **Enter-while-busy cue.** Submitting while `busy` shows a transient
   (2s) inline hint next to the send button: `Waiting for the current
   reply…` (mono 11px muted, `aria-live="polite"`). The draft is kept.
8. **Dead affordances removed.** ChatInput's "Add files" and "voice mode"
   buttons go away; the send button is now always visible, disabled when
   empty or busy. ChatListPage's decorative "Sort by Activity" button goes
   away (order stays starred-then-recency).
9. **List-page delete gets the same ConfirmModal as the chat page** (title
   "Delete conversation?", message "This permanently removes the
   conversation and its messages.").

### Perf

10. **Mention work off the chunk path.** `CardRail`'s split/group memo keys
    on a cheap mention-fingerprint string instead of the `messages` array
    identity (which changes every streamed chunk). `findMentionedCardIds`
    caches its sorted title list keyed on the `cardsById` object identity.

### Edge function (deploy expected: v51)

11. **Three server fixes:**
    - `index.ts`: handle Anthropic mid-stream `error` SSE events —
      currently swallowed, producing a clean "done" with partial text; now
      logged and surfaced via `sse.error(...)`.
    - `tier.ts`: add `search_cards` + `summarize_board` to
      `PILL_DISALLOWED_TOOLS` — their "across all their boards" schemas
      contradict the pill's locked scope and burn round budget.
    - `context.ts`: gate the pill rulebook by tier. `buildContext` gains
      `opts.tier`; free pill (create_card only) gets a compact ruleset
      instead of the ~1,500-token write-tool rulebook it can't act on. The
      pro pill block stays byte-identical.

## Out of scope

Stop-generating/AbortController, `get_card` + search pagination + due-date
filter, copy buttons, message-content search, new-chat-in-place, mention
autocomplete, per-message timestamps, starred filter, conversation
persistence to Supabase (backlog T1-#4).

## Testing

Vitest per task (streaming map races, delete-mid-stream, debounce/quota,
retry flow, ChatInput cue + disabled states, list delete confirm, existing
suites updated for the `streaming` map). Deno: `tier.test.ts` extended for
the pill exclusions; `deno check` on the function. Deploy v51 and re-verify
chat + pill live.
