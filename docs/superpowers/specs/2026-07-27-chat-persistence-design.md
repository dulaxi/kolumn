# Chat Persistence — Supabase-backed conversations

**Date:** 2026-07-27
**Status:** Approved
**Origin:** Backlog T1-#4, the last structural gap in the chat surface:
conversations live only in localStorage, dying with cleared cookies and never
crossing devices. User directives: server truth + local cache, no realtime
yet, no migration of legacy local chats, thorough testing, and **designed for
scale — bounded reads, bounded cache, defensive constraints, and reserved
landing zones so later growth is parameter changes, not redesigns.**

## Sync model

Supabase is authoritative. The existing localStorage persist stays as a boot
cache: the chat list paints instantly from cache, then reconciles from the
server. Writes go through to Supabase fire-and-forget; failures log via
`logError` and never block or corrupt local state. Nothing is ever written
per streamed chunk.

Legacy conversations already in localStorage are NOT migrated: on hydrate,
any cached conversation missing from the server is flagged `localOnly: true`,
stays fully usable, and never syncs. Deleting one removes it locally only.

## Schema

`supabase/migrations/2026-07-27-chat-persistence.sql`, mirrored into
`supabase/schema.sql` (the authoritative full schema).

```sql
create table chat_threads (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat' check (char_length(title) <= 200),
  starred boolean not null default false,
  title_edited boolean not null default false,
  ai_titled boolean not null default false,
  rail_group_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table chat_messages (
  id uuid primary key,
  thread_id uuid not null references chat_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  text text not null default '' check (char_length(text) <= 50000),
  card_ids jsonb not null default '[]',
  mentioned_card_ids jsonb not null default '[]',
  activities jsonb not null default '[]',
  stopped boolean not null default false,
  created_at timestamptz not null default now()
);

create index chat_threads_user_recency on chat_threads (user_id, updated_at desc);
create index chat_messages_thread_recency on chat_messages (thread_id, created_at desc);
```

- Client-generated UUIDs (`crypto.randomUUID()`) are the primary keys — the
  store already mints them.
- `chat_messages.user_id` is denormalized so RLS never joins.
- RLS on both tables, all four operations: `user_id = auth.uid()` (using +
  with-check). No cross-user path exists.
- The recency indexes match the exact keyset query shapes below — no table
  scans at any data size.

## Sync layer — `src/lib/chatSync.js`

Thin, pure functions over the supabase client. Every function returns
`{ ok, data?, error? }`; none throws into UI paths.

- `fetchThreads({ limit = 200 } = {})` — newest-first by `updated_at`.
- `fetchMessages(threadId, { limit = 200, before } = {})` — latest N by
  `created_at desc` (result reversed to chronological for the store);
  `before` is a keyset cursor (`created_at < before`) reserved for a future
  "load earlier messages" UI.
- `upsertThread(row)` / `upsertMessage(row)` — idempotent, last-write-wins
  (deliberately compatible with a future realtime layer).
- `deleteThread(id)` — messages cascade server-side.

Row mapping is snake_case in SQL ↔ the store's existing camel/flag fields
(`titleEdited` ↔ `title_edited`, etc.); the mapping lives in chatSync, not
in the store.

## Store integration — `chatStore`

- `hydrateFromServer()` — called once after auth from the app's existing
  boot path. Fetches threads; server rows replace same-id cached
  conversations; cached conversations absent from the server become
  `localOnly: true`. Never deletes anything local.
- `ensureMessagesLoaded(conversationId)` — called on ChatPage mount. For
  non-`localOnly` threads not yet loaded this session (module-level Set),
  fetches messages and replaces the cached list. Cache paints first;
  reconcile is silent.
- **Write-through points** (all skipped for `localOnly` conversations):
  - `createConversation` → `upsertThread`
  - `renameConversation`, `toggleStarred`, `setRailGroupBy`, and both title
    writes in `generateTitle` (truncation fallback + AI title) →
    `upsertThread` with current state and a fresh `updated_at`
  - `addMessage` (user role) → `upsertMessage`
  - `sendMessage` settle → `upsertMessage` for the assistant message on
    **success and stopped only**. Errored replies stay local: they're
    transient, and `retryMessage` already removes them locally, so nothing
    ever needs server deletion. Also `upsertThread` (updated_at moved).
  - `deleteConversation` → `deleteThread` (skip for localOnly)
- Accepted, documented gap: a write that fails while fully offline is not
  queued; the thread's next mutation re-upserts current truth, but a lost
  message upsert stays lost until the conversation is next active. No
  offline queue (YAGNI).

## Bounded cache

`partialize` no longer archives everything: before writing, it trims to the
**30 most recently updated threads** and the **last 100 messages per
thread**. `localOnly` threads are always exempt from thread trimming (the
server cannot restore them). This permanently removes the unbounded
localStorage-quota risk; the server holds full history.

## Deferred with landing zones reserved

- Chat-list pagination past 200 threads → `fetchThreads` cursor/limit params.
- "Load earlier messages" UI → `fetchMessages` `before` cursor.
- Realtime cross-device sync → last-write-wins upserts already compatible.
- Offline write queue → accepted gap above.

## Testing

- **Unit — chatSync:** payload/row-mapping shapes for every function against
  a mocked supabase client; error propagation returns `{ ok: false }`
  without throwing; limit/order/cursor parameters present on every read.
- **Unit — chatStore:** hydrate merge (server wins by id; legacy flagged
  `localOnly`, never deleted), messages-replace-once semantics,
  write-through firing per mutation with chatSync mocked, `localOnly` never
  syncing, assistant persisted on success/stopped but never on error,
  stop/retry flows unchanged, partialize trimming (31st thread dropped,
  101st message dropped, localOnly exempt).
- **Migration:** applied to the live project via Supabase MCP
  (`apply_migration`); verify tables/policies/indexes exist, run
  `get_advisors` (security) clean, and probe RLS live (anon/other-user
  select returns zero rows).
- **Live end-to-end:** chat → hard refresh → history restored from server;
  delete → gone after refresh; second session (incognito, same account)
  sees the thread; legacy local-only chat still listed and usable; a
  stopped reply survives refresh with its marker.
