# Chat Capability Pass — stop, deeper read tools, copy

**Date:** 2026-07-26
**Status:** Approved
**Origin:** The chat audit's deferred product items. Scope chosen by the
user: stop-generating + read-tool upgrades + copy affordances. Content
search (titles-only today) was considered and excluded from this pass.

## 1. Stop generating

**Client plumbing.**
- `src/lib/aiClient.js` — `streamChat(payload, callbacks, { signal })`
  passes the `AbortSignal` to `fetch`. An abort is a QUIET exit: the reader
  loop stops, `onError` is NOT called, and `streamChat` resolves. Detect via
  `err.name === 'AbortError'` around the fetch/read.
- `src/lib/chatAgentLoop.js` — `runChatLoop(input, callbacks, { signal })`
  forwards the signal to every `streamChat` round and checks
  `signal?.aborted` before starting any continuation round. Returns
  `{ ..., aborted: true }` when stopped; `error` stays null.
- `src/store/chatStore.js` — module-level `Map` of
  conversationId → AbortController, created per `sendMessage`, removed when
  the send settles. New action `stopStreaming(conversationId)`: aborts the
  controller (no-op if absent). When `sendMessage` sees `aborted`, it keeps
  all streamed text, patches the assistant message `{ stopped: true }`
  (plus the usual `mentionedCardIds` union), clears the streaming flag, and
  skips `generateTitle` only if no assistant text arrived at all.
  `deleteConversation` aborts that conversation's controller.
- Navigation does NOT abort — with per-conversation streaming state, a
  reply finishing in the background is intended behavior. Only the Stop
  button and deletion abort.

**UI.**
- `ChatInput` gains `onStop`. While `busy && onStop`, the send button slot
  renders a Stop button instead: same `icon-sm` primary Button, Phosphor
  `Stop` weight="fill", `aria-label="Stop generating"`. The busy-Enter hint
  from the hardening pass stays as-is.
- `ChatPage` passes `onStop={() => stopStreaming(id)}`.
- `ChatMessage`: a message with `stopped: true` renders a trailing muted
  note styled like the activity chips (mono 12px `var(--text-muted)`):
  the word `Stopped`. No error notice, no Retry.

## 2. Read-tool upgrades (edge deploy expected: v52)

**New tool `get_card`** — chat mode only (`CHAT_READ_TOOLS` gains it; it
stays in the pill's excluded set implicitly since pill filtering is
list-based — verify it never reaches pill).
- Schema: `{ card_title: string (required), board?: string }`.
- Executor (`toolExecutor.js`): resolve by the existing fuzzy title
  matching against non-archived cards, scoped to `board` when given.
  - Exactly one match → full detail object: `id, title, board, column,
    priority, due_date, completed, task_number, labels (texts),
    assignees, description (FULL, untruncated), checklist:
    [{ text, done }], created_at, updated_at`. Omit `checklist` when
    empty, `description` when empty (matches search_cards conventions).
  - Multiple matches → `{ ambiguous: true, candidates: [{ title, board,
    column }] }` (cap 10) — never guess.
  - None → `{ found: false }`.

**`search_cards` additions** (both schema and executor):
- `due`: `'overdue' | 'today' | 'week' | 'none'` — optional filter applied
  after text matching (query may be empty when `due` is given: filtering
  without a text query is valid). Bucket math identical to
  `cardRailGroups`' local-midnight rules; completed cards are never
  `overdue` (they only appear at all when `include_completed`).
- `offset`: integer, default 0 — applied after ranking, before the 20 cap.
  Response gains `offset` alongside the existing `total` so the model can
  page ("showing 21–40 of 45").

**Prompt (`context.ts` `chatRulesSection`)** — two added bullets under
Tools: use `get_card` for "what is X about?" / checklist / full-description
questions after identifying the card; `search_cards` supports `due`
filtering and `offset` paging when `total` exceeds the returned count.

**Deno tests** (`tier.test.ts`): chat mode includes `get_card`; pill mode
still excludes all three read tools.

## 3. Copy affordances

- **Assistant messages** (`ChatMessage.jsx`): an action row below the
  message body — visible on group hover (`opacity-0 group-hover:opacity-100`
  needs a `group` class on the message root), always visible on touch via
  focus. One ghost `icon-sm` button, Phosphor `Copy`, `aria-label="Copy
  message"`; on click `navigator.clipboard.writeText(message.text)` (raw
  markdown) and swap to `Check` (lime `--color-lime-dark`) for 1500ms.
  Hidden while the message is empty or currently streaming (empty-text
  guard covers streaming start; also suppressed when `message.error`).
- **Code blocks** (`MarkdownRenderer.jsx`): each fenced `pre` wraps in a
  `relative group/code` container with a top-right hover copy button
  (`Copy` 14px, same swap-to-check behavior), copying the block's text
  content.
- No clipboard fallback shims — `navigator.clipboard` only.

## Out of scope

Message-content search on ChatListPage; comments/attachments exposure via
tools; resolve-by-ID (T3-#14); conversation persistence (T1-#4); any pill
changes.

## Testing

- Vitest: aiClient abort (fetch AbortError → resolve, no onError);
  chatAgentLoop abort between rounds; chatStore stop flow (partial text
  kept, `stopped` stamped, flag cleared, controller removed, delete aborts);
  ChatInput stop-button swap + aria-label; ChatMessage stopped marker +
  copy button (clipboard mocked, check-swap timer); MarkdownRenderer code
  copy; toolExecutor get_card found/ambiguous/not-found + board scoping,
  search_cards due buckets (fake timers) + offset paging + due-only query.
- Deno: tier.test.ts as above; `deno check`.
- Live after v52 deploy: stop a long reply mid-stream; "what is <card>
  about?" resolves via get_card; "what's overdue?" uses the due filter.
