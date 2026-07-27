# Chat Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conversations persist to Supabase (`chat_threads` / `chat_messages`) with the existing localStorage as a bounded boot cache; server is truth.

**Architecture:** A thin mapping/sync layer (`src/lib/chatSync.js`) owns snake_case↔store field mapping and bounded keyset reads. `chatStore` hydrates threads post-auth, lazy-loads messages per conversation, and write-throughs on every mutation (never per streamed chunk). Legacy cached conversations absent from the server become `localOnly` and never sync. `partialize` trims the cache to 30 threads / 100 messages each.

**Tech Stack:** Supabase (Postgres + RLS), Zustand persist, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-27-chat-persistence-design.md`

## Global Constraints

- Server is truth; localStorage is a boot cache. NOTHING is written to Supabase per streamed chunk — assistant messages upsert once on settle, success and stopped only, NEVER on error.
- All chatSync functions return `{ ok, data?, error? }` and never throw into UI paths; failures `logError` with a `[chatSync]` prefix.
- Bounded reads: `fetchThreads({ limit = 200 })` newest-first by `updated_at`; `fetchMessages(threadId, { limit = 200, before })` newest-first by `created_at` with keyset `lt('created_at', before)`, result REVERSED to chronological before returning.
- `localOnly: true` conversations (legacy, pre-persistence) never sync in any direction and are exempt from cache trimming. A conversation synced this session must never be flagged `localOnly` by hydrate (module-level `syncedIds` Set guards the race).
- Thread upserts send the conversation's current stored fields; `updated_at` is bumped only where local logic already bumps it (message adds).
- `ensureMessagesLoaded` merges: server list first, then local messages whose ids the server doesn't have (unsynced/errored/in-flight tail), preserving both.
- Cache caps: `CACHE_THREAD_CAP = 30` (by `updated_at` desc, localOnly exempt), `CACHE_MESSAGES_PER_THREAD = 100` (keep the LAST 100). Trimming happens in `partialize` only — in-memory state is never trimmed.
- DB: client-generated UUID PKs; `chat_messages.user_id` denormalized; RLS `user_id = auth.uid()` (using + with check) on both tables; `check (char_length(title) <= 200)`, `check (char_length(text) <= 50000)`, `check (role in ('user','assistant'))`; indexes `chat_threads (user_id, updated_at desc)` and `chat_messages (thread_id, created_at desc)`.
- Do NOT apply the migration during tasks — the controller applies it via the Supabase MCP after the final review, then runs the live checks.
- Tests that touch the module-level `loadedThreads` / `syncedIds` Sets must use unique conversation ids per test (the Sets persist across tests in a file).
- Commits use the `feat(chat)` scope.

---

### Task 1: Schema — migration + schema.sql

**Files:**
- Create: `supabase/migrations/2026-07-27-chat-persistence.sql`
- Modify: `supabase/schema.sql` (append the same tables/policies/indexes, mirroring the file's existing section organization)

**Interfaces:**
- Produces: the `chat_threads` / `chat_messages` DDL that Task 2's row mapping targets.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/2026-07-27-chat-persistence.sql`:

```sql
-- Chat persistence (backlog T1-#4): conversations move from localStorage to
-- Supabase. Client-generated UUIDs are the primary keys (the store already
-- mints them). chat_messages.user_id is denormalized so RLS never joins.
-- The two recency indexes match the client's exact keyset read shapes.

create table if not exists chat_threads (
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

create table if not exists chat_messages (
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

create index if not exists chat_threads_user_recency
  on chat_threads (user_id, updated_at desc);
create index if not exists chat_messages_thread_recency
  on chat_messages (thread_id, created_at desc);

alter table chat_threads enable row level security;
alter table chat_messages enable row level security;

create policy "chat_threads_owner" on chat_threads
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "chat_messages_owner" on chat_messages
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

- [ ] **Step 2: Mirror into schema.sql**

Read `supabase/schema.sql` to find its organization (tables section, indexes, RLS/policies). Append the same DDL following the file's existing formatting conventions — content identical to the migration (the `if not exists` guards may be dropped if the file's other tables don't use them; match the file's style). Also update the file's header/table-list comment if one enumerates tables.

- [ ] **Step 3: Sanity check**

Run: `grep -c "chat_threads\|chat_messages" supabase/schema.sql` — expect ≥ 8 (two tables, two indexes, two RLS enables, two policies). Do NOT apply the migration (controller's step, after final review).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/2026-07-27-chat-persistence.sql supabase/schema.sql
git commit -m "feat(chat): chat_threads/chat_messages schema with RLS"
```

---

### Task 2: Sync layer — `chatSync.js`

**Files:**
- Create: `src/lib/chatSync.js`
- Test: `src/__tests__/chatSync.test.js`

**Interfaces:**
- Consumes: `supabase` client singleton (`src/lib/supabase.js`), `logError`.
- Produces (Task 3/4 consume): `threadToRow(userId, conv)`, `rowToThread(row)`, `messageToRow(userId, threadId, msg)`, `rowToMessage(row)`, `fetchThreads({ limit } = {})`, `fetchMessages(threadId, { limit, before } = {})`, `upsertThread(userId, conv)`, `upsertMessage(userId, threadId, msg)`, `deleteThread(id)` — reads resolve `{ ok, data }`, writes `{ ok }`, failures `{ ok: false, error }`.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/chatSync.test.js`:

```js
import { describe, test, expect, vi, beforeEach } from 'vitest'

// Thenable chainable query builder: every method returns the builder; awaiting
// it resolves `result`. Captures calls for assertions.
let result
let builder
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table) => {
      builder.table = table
      return builder
    }),
  },
}))

import {
  threadToRow, rowToThread, messageToRow, rowToMessage,
  fetchThreads, fetchMessages, upsertThread, upsertMessage, deleteThread,
} from '../lib/chatSync'

const makeBuilder = () => {
  const b = {
    table: null,
    select: vi.fn(() => b),
    eq: vi.fn(() => b),
    lt: vi.fn(() => b),
    order: vi.fn(() => b),
    limit: vi.fn(() => b),
    upsert: vi.fn(() => b),
    delete: vi.fn(() => b),
    then: (resolve) => resolve(result),
  }
  return b
}

beforeEach(() => {
  result = { data: [], error: null }
  builder = makeBuilder()
})

describe('row mapping', () => {
  const conv = {
    id: 't1', title: 'Sprint chat', starred: true, titleEdited: true,
    aiTitled: true, railGroupBy: 'board',
    created_at: '2026-07-27T10:00:00.000Z', updated_at: '2026-07-27T11:00:00.000Z',
  }

  test('thread mapping round-trips including flags', () => {
    const row = threadToRow('u1', conv)
    expect(row).toEqual({
      id: 't1', user_id: 'u1', title: 'Sprint chat', starred: true,
      title_edited: true, ai_titled: true, rail_group_by: 'board',
      created_at: conv.created_at, updated_at: conv.updated_at,
    })
    expect(rowToThread(row)).toEqual({ ...conv })
  })

  test('absent flags map to false/null and back to absent', () => {
    const bare = { id: 't2', title: 'Bare', created_at: 'a', updated_at: 'b' }
    const row = threadToRow('u1', bare)
    expect(row.starred).toBe(false)
    expect(row.rail_group_by).toBeNull()
    const back = rowToThread(row)
    expect(back.starred).toBeUndefined()
    expect(back.railGroupBy).toBeUndefined()
  })

  test('message mapping round-trips', () => {
    const msg = {
      id: 'm1', role: 'assistant', text: 'hi', cardIds: ['c9'],
      mentionedCardIds: ['c1'], activities: [{ atChar: 0, icon: 'search', label: 'x' }],
      stopped: true, created_at: '2026-07-27T10:00:00.000Z',
    }
    const row = messageToRow('u1', 't1', msg)
    expect(row).toEqual({
      id: 'm1', thread_id: 't1', user_id: 'u1', role: 'assistant', text: 'hi',
      card_ids: ['c9'], mentioned_card_ids: ['c1'],
      activities: msg.activities, stopped: true, created_at: msg.created_at,
    })
    expect(rowToMessage(row)).toEqual({ ...msg })
  })
})

describe('reads', () => {
  test('fetchThreads is bounded and newest-first', async () => {
    result = { data: [{ id: 't1', title: 'A', created_at: 'a', updated_at: 'b', starred: false, title_edited: false, ai_titled: false, rail_group_by: null }], error: null }
    const res = await fetchThreads()
    expect(res.ok).toBe(true)
    expect(res.data[0].id).toBe('t1')
    expect(builder.table).toBe('chat_threads')
    expect(builder.order).toHaveBeenCalledWith('updated_at', { ascending: false })
    expect(builder.limit).toHaveBeenCalledWith(200)
  })

  test('fetchMessages reverses to chronological and supports the keyset cursor', async () => {
    result = {
      data: [
        { id: 'm2', role: 'assistant', text: 'newer', card_ids: [], mentioned_card_ids: [], activities: [], stopped: false, created_at: '2' },
        { id: 'm1', role: 'user', text: 'older', card_ids: [], mentioned_card_ids: [], activities: [], stopped: false, created_at: '1' },
      ],
      error: null,
    }
    const res = await fetchMessages('t1', { before: '3' })
    expect(res.data.map((m) => m.id)).toEqual(['m1', 'm2'])
    expect(builder.eq).toHaveBeenCalledWith('thread_id', 't1')
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(builder.lt).toHaveBeenCalledWith('created_at', '3')
    expect(builder.limit).toHaveBeenCalledWith(200)
  })

  test('read errors return ok:false without throwing', async () => {
    result = { data: null, error: { message: 'boom' } }
    const res = await fetchThreads()
    expect(res.ok).toBe(false)
  })
})

describe('writes', () => {
  test('upsertThread sends the mapped row', async () => {
    result = { error: null }
    const res = await upsertThread('u1', { id: 't1', title: 'X', created_at: 'a', updated_at: 'b' })
    expect(res.ok).toBe(true)
    expect(builder.table).toBe('chat_threads')
    expect(builder.upsert).toHaveBeenCalledWith(expect.objectContaining({ id: 't1', user_id: 'u1' }))
  })

  test('upsertMessage sends the mapped row', async () => {
    result = { error: null }
    await upsertMessage('u1', 't1', { id: 'm1', role: 'user', text: 'q', created_at: 'a' })
    expect(builder.table).toBe('chat_messages')
    expect(builder.upsert).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1', thread_id: 't1', user_id: 'u1' }))
  })

  test('deleteThread deletes by id and write errors return ok:false', async () => {
    result = { error: null }
    expect((await deleteThread('t1')).ok).toBe(true)
    expect(builder.delete).toHaveBeenCalled()
    expect(builder.eq).toHaveBeenCalledWith('id', 't1')
    result = { error: { message: 'nope' } }
    expect((await upsertThread('u1', { id: 't1', title: 'X', created_at: 'a', updated_at: 'b' })).ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- chatSync`
Expected: FAIL (module doesn't exist).

- [ ] **Step 3: Implement `src/lib/chatSync.js`**

```js
import { supabase } from './supabase'
import { logError } from '../utils/logger'

// Sync layer for chat persistence: owns the snake_case (DB) ↔ store field
// mapping and the bounded keyset read shapes. Server is truth; every
// function resolves { ok, ... } and never throws into UI paths.

export function threadToRow(userId, conv) {
  return {
    id: conv.id,
    user_id: userId,
    title: conv.title,
    starred: !!conv.starred,
    title_edited: !!conv.titleEdited,
    ai_titled: !!conv.aiTitled,
    rail_group_by: conv.railGroupBy || null,
    created_at: conv.created_at,
    updated_at: conv.updated_at,
  }
}

export function rowToThread(row) {
  const conv = {
    id: row.id,
    title: row.title,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
  if (row.starred) conv.starred = true
  if (row.title_edited) conv.titleEdited = true
  if (row.ai_titled) conv.aiTitled = true
  if (row.rail_group_by) conv.railGroupBy = row.rail_group_by
  return conv
}

export function messageToRow(userId, threadId, msg) {
  return {
    id: msg.id,
    thread_id: threadId,
    user_id: userId,
    role: msg.role,
    text: msg.text || '',
    card_ids: msg.cardIds || [],
    mentioned_card_ids: msg.mentionedCardIds || [],
    activities: msg.activities || [],
    stopped: !!msg.stopped,
    created_at: msg.created_at,
  }
}

export function rowToMessage(row) {
  const msg = {
    id: row.id,
    role: row.role,
    text: row.text,
    cardIds: row.card_ids || [],
    mentionedCardIds: row.mentioned_card_ids || [],
    activities: row.activities || [],
    created_at: row.created_at,
  }
  if (row.stopped) msg.stopped = true
  return msg
}

export async function fetchThreads({ limit = 200 } = {}) {
  const { data, error } = await supabase
    .from('chat_threads')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (error) {
    logError('[chatSync] fetchThreads failed:', error)
    return { ok: false, error }
  }
  return { ok: true, data: (data || []).map(rowToThread) }
}

export async function fetchMessages(threadId, { limit = 200, before } = {}) {
  let query = supabase
    .from('chat_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (before) query = query.lt('created_at', before)
  const { data, error } = await query
  if (error) {
    logError('[chatSync] fetchMessages failed:', error)
    return { ok: false, error }
  }
  // Fetched newest-first for keyset paging; the store keeps chronological.
  return { ok: true, data: (data || []).map(rowToMessage).reverse() }
}

export async function upsertThread(userId, conv) {
  const { error } = await supabase.from('chat_threads').upsert(threadToRow(userId, conv))
  if (error) {
    logError('[chatSync] upsertThread failed:', error)
    return { ok: false, error }
  }
  return { ok: true }
}

export async function upsertMessage(userId, threadId, msg) {
  const { error } = await supabase.from('chat_messages').upsert(messageToRow(userId, threadId, msg))
  if (error) {
    logError('[chatSync] upsertMessage failed:', error)
    return { ok: false, error }
  }
  return { ok: true }
}

export async function deleteThread(id) {
  const { error } = await supabase.from('chat_threads').delete().eq('id', id)
  if (error) {
    logError('[chatSync] deleteThread failed:', error)
    return { ok: false, error }
  }
  return { ok: true }
}
```

Note on the `.lt` chain: `fetchMessages` reassigns `query` — with the test's builder every method returns the same object, so ordering of `.lt` after `.limit` is fine; the real supabase builder is also order-insensitive for these.

- [ ] **Step 4: Run tests**

Run: `npm run test -- chatSync`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/chatSync.js src/__tests__/chatSync.test.js
git commit -m "feat(chat): chatSync layer — bounded reads, mapped writes"
```

---

### Task 3: Hydrate + lazy message loading + wiring

**Files:**
- Modify: `src/store/chatStore.js`, `src/hooks/useAppData.js`, `src/pages/ChatPage.jsx`
- Test: `src/__tests__/chatStoreHydrate.test.js` (new)

**Interfaces:**
- Consumes: `chatSync.fetchThreads/fetchMessages` (Task 2); `useAuthStore` (verify `src/store/authStore.js` does NOT import chatStore before adding the import — if a cycle exists, report NEEDS_CONTEXT instead of working around it).
- Produces: `hydrateFromServer()`, `ensureMessagesLoaded(conversationId)`; module-level `syncedIds` Set (Task 4 adds to it on write-through).

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/chatStoreHydrate.test.js`:

```js
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { useChatStore, _syncedIds } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import * as chatSync from '../lib/chatSync'

vi.mock('../lib/chatSync', () => ({
  fetchThreads: vi.fn(),
  fetchMessages: vi.fn(),
  upsertThread: vi.fn().mockResolvedValue({ ok: true }),
  upsertMessage: vi.fn().mockResolvedValue({ ok: true }),
  deleteThread: vi.fn().mockResolvedValue({ ok: true }),
}))
vi.mock('../lib/chatAgentLoop', () => ({ runChatLoop: vi.fn() }))
vi.mock('../lib/aiClient', () => ({ streamChat: vi.fn().mockResolvedValue(undefined) }))

beforeEach(() => {
  useAuthStore.setState({ user: { id: 'u1' } })
  useChatStore.setState({ conversations: {}, messages: {}, streaming: {} })
  chatSync.fetchThreads.mockReset()
  chatSync.fetchMessages.mockReset()
})

describe('hydrateFromServer', () => {
  test('server rows replace cached ones; absent cached ones become localOnly', async () => {
    useChatStore.setState({
      conversations: {
        a: { id: 'a', title: 'Cached A', created_at: '1', updated_at: '1' },
        b: { id: 'b', title: 'Legacy B', created_at: '1', updated_at: '1' },
      },
      messages: { a: [], b: [] },
    })
    chatSync.fetchThreads.mockResolvedValue({
      ok: true,
      data: [{ id: 'a', title: 'Server A', created_at: '1', updated_at: '2' }],
    })
    await useChatStore.getState().hydrateFromServer()
    const convs = useChatStore.getState().conversations
    expect(convs.a.title).toBe('Server A')
    expect(convs.a.localOnly).toBeUndefined()
    expect(convs.b.localOnly).toBe(true)
    expect(convs.b.title).toBe('Legacy B')
  })

  test('conversations synced this session are never flagged localOnly', async () => {
    _syncedIds.add('fresh1')
    useChatStore.setState({
      conversations: { fresh1: { id: 'fresh1', title: 'Just made', created_at: '9', updated_at: '9' } },
      messages: { fresh1: [] },
    })
    chatSync.fetchThreads.mockResolvedValue({ ok: true, data: [] })
    await useChatStore.getState().hydrateFromServer()
    expect(useChatStore.getState().conversations.fresh1.localOnly).toBeUndefined()
  })

  test('fetch failure leaves state untouched', async () => {
    useChatStore.setState({
      conversations: { a: { id: 'a', title: 'A', created_at: '1', updated_at: '1' } },
      messages: { a: [] },
    })
    chatSync.fetchThreads.mockResolvedValue({ ok: false, error: {} })
    await useChatStore.getState().hydrateFromServer()
    expect(useChatStore.getState().conversations.a.localOnly).toBeUndefined()
  })

  test('signed out is a no-op', async () => {
    useAuthStore.setState({ user: null })
    await useChatStore.getState().hydrateFromServer()
    expect(chatSync.fetchThreads).not.toHaveBeenCalled()
  })
})

describe('ensureMessagesLoaded', () => {
  test('fetches once, merges server list with unsynced local tail', async () => {
    const id = crypto.randomUUID()
    useChatStore.setState({
      conversations: { [id]: { id, title: 'T', created_at: '1', updated_at: '1' } },
      messages: {
        [id]: [
          { id: 'shared', role: 'user', text: 'cached copy', created_at: '1' },
          { id: 'local-only', role: 'assistant', text: '', error: { message: 'x' }, created_at: '2' },
        ],
      },
    })
    chatSync.fetchMessages.mockResolvedValue({
      ok: true,
      data: [{ id: 'shared', role: 'user', text: 'server copy', cardIds: [], mentionedCardIds: [], activities: [], created_at: '1' }],
    })
    await useChatStore.getState().ensureMessagesLoaded(id)
    const msgs = useChatStore.getState().messages[id]
    expect(msgs.map((m) => m.id)).toEqual(['shared', 'local-only'])
    expect(msgs[0].text).toBe('server copy')

    await useChatStore.getState().ensureMessagesLoaded(id)
    expect(chatSync.fetchMessages).toHaveBeenCalledTimes(1)
  })

  test('localOnly conversations never fetch', async () => {
    const id = crypto.randomUUID()
    useChatStore.setState({
      conversations: { [id]: { id, title: 'L', localOnly: true, created_at: '1', updated_at: '1' } },
      messages: { [id]: [] },
    })
    await useChatStore.getState().ensureMessagesLoaded(id)
    expect(chatSync.fetchMessages).not.toHaveBeenCalled()
  })

  test('a failed fetch clears the loaded flag so the next mount retries', async () => {
    const id = crypto.randomUUID()
    useChatStore.setState({
      conversations: { [id]: { id, title: 'T', created_at: '1', updated_at: '1' } },
      messages: { [id]: [] },
    })
    chatSync.fetchMessages.mockResolvedValueOnce({ ok: false, error: {} })
    await useChatStore.getState().ensureMessagesLoaded(id)
    chatSync.fetchMessages.mockResolvedValueOnce({ ok: true, data: [] })
    await useChatStore.getState().ensureMessagesLoaded(id)
    expect(chatSync.fetchMessages).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- chatStoreHydrate`
Expected: FAIL (`_syncedIds` / actions missing).

- [ ] **Step 3: Implement in `chatStore.js`**

Imports gain `import { useAuthStore } from './authStore'` and `import * as chatSync from '../lib/chatSync'` (first verify `src/store/authStore.js` has no import of chatStore). Add module-level state after `abortControllers`:

```js
// Per-session sync bookkeeping. syncedIds: conversations known to exist on
// the server (created or upserted this session, or hydrated) — hydrate must
// never flag these localOnly even if a fetch races a fresh upsert.
// loadedThreads: conversations whose messages were fetched this session.
export const _syncedIds = new Set()
const loadedThreads = new Set()
```

Add the two actions (after `setRailGroupBy`):

```js
  // Reconcile the thread list from the server (once, post-auth). Server rows
  // replace same-id cached conversations; cached conversations the server
  // doesn't know become localOnly (legacy, pre-persistence) and never sync.
  hydrateFromServer: async () => {
    const userId = useAuthStore.getState().user?.id
    if (!userId) return
    const res = await chatSync.fetchThreads()
    if (!res.ok) return
    for (const t of res.data) _syncedIds.add(t.id)
    set((s) => {
      const merged = {}
      for (const [id, conv] of Object.entries(s.conversations)) {
        merged[id] = conv.localOnly || _syncedIds.has(id)
          ? conv
          : { ...conv, localOnly: true }
      }
      for (const t of res.data) {
        merged[t.id] = t
      }
      return { conversations: merged }
    })
  },

  // Lazy per-conversation message load: cache paints first, server
  // reconciles once per session. Local messages the server doesn't have
  // (errored replies, in-flight sends) are preserved as a tail.
  ensureMessagesLoaded: async (conversationId) => {
    const conv = get().conversations[conversationId]
    const userId = useAuthStore.getState().user?.id
    if (!conv || conv.localOnly || !userId) return
    if (loadedThreads.has(conversationId)) return
    loadedThreads.add(conversationId)
    const res = await chatSync.fetchMessages(conversationId)
    if (!res.ok) {
      loadedThreads.delete(conversationId)
      return
    }
    set((s) => {
      if (!s.conversations[conversationId]) return s
      const local = s.messages[conversationId] || []
      const serverIds = new Set(res.data.map((m) => m.id))
      const merged = [...res.data, ...local.filter((m) => !serverIds.has(m.id))]
      return { messages: { ...s.messages, [conversationId]: merged } }
    })
  },
```

- [ ] **Step 4: Wire the callers**

`src/hooks/useAppData.js`: add `import { useChatStore } from '../store/chatStore'` and add `useChatStore.getState().hydrateFromServer(),` to the `Promise.allSettled([...])` array in `loadAllData`.

`src/pages/ChatPage.jsx`: in the existing `useEffect` that calls `setActiveConversation(id)` (keyed on `[id]`), add as its first line's sibling:

```js
    useChatStore.getState().ensureMessagesLoaded(id)
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- chatStoreHydrate`, then `npm run test -- chatStore` (all suites green — hydrate/ensure are additive).
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/store/chatStore.js src/hooks/useAppData.js src/pages/ChatPage.jsx src/__tests__/chatStoreHydrate.test.js
git commit -m "feat(chat): hydrate threads post-auth, lazy message loading"
```

---

### Task 4: Write-through on every mutation

**Files:**
- Modify: `src/store/chatStore.js`
- Test: `src/__tests__/chatStoreWriteThrough.test.js` (new)

**Interfaces:**
- Consumes: `chatSync.upsertThread/upsertMessage/deleteThread`, `_syncedIds` (Task 3).

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/chatStoreWriteThrough.test.js`:

```js
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import * as chatSync from '../lib/chatSync'
import { runChatLoop } from '../lib/chatAgentLoop'

vi.mock('../lib/chatSync', () => ({
  fetchThreads: vi.fn(),
  fetchMessages: vi.fn(),
  upsertThread: vi.fn().mockResolvedValue({ ok: true }),
  upsertMessage: vi.fn().mockResolvedValue({ ok: true }),
  deleteThread: vi.fn().mockResolvedValue({ ok: true }),
}))
vi.mock('../lib/chatAgentLoop', () => ({ runChatLoop: vi.fn() }))
vi.mock('../lib/aiClient', () => ({ streamChat: vi.fn().mockResolvedValue(undefined) }))

beforeEach(() => {
  useAuthStore.setState({ user: { id: 'u1' } })
  useChatStore.setState({ conversations: {}, messages: {}, streaming: {} })
  chatSync.upsertThread.mockClear()
  chatSync.upsertMessage.mockClear()
  chatSync.deleteThread.mockClear()
  runChatLoop.mockReset()
})

describe('write-through', () => {
  test('createConversation upserts the thread', () => {
    const id = useChatStore.getState().createConversation()
    expect(chatSync.upsertThread).toHaveBeenCalledWith('u1', expect.objectContaining({ id }))
  })

  test('user messages upsert; assistant placeholders do not', () => {
    const id = useChatStore.getState().createConversation()
    chatSync.upsertMessage.mockClear()
    useChatStore.getState().addMessage(id, { role: 'user', text: 'question' })
    expect(chatSync.upsertMessage).toHaveBeenCalledTimes(1)
    useChatStore.getState().addMessage(id, { role: 'assistant', text: '' })
    expect(chatSync.upsertMessage).toHaveBeenCalledTimes(1)
  })

  test('rename, star, and railGroupBy upsert the thread', () => {
    const id = useChatStore.getState().createConversation()
    chatSync.upsertThread.mockClear()
    useChatStore.getState().renameConversation(id, 'New name')
    useChatStore.getState().toggleStarred(id)
    useChatStore.getState().setRailGroupBy(id, 'board')
    expect(chatSync.upsertThread).toHaveBeenCalledTimes(3)
    expect(chatSync.upsertThread).toHaveBeenLastCalledWith('u1', expect.objectContaining({ railGroupBy: 'board' }))
  })

  test('deleteConversation deletes the thread server-side', () => {
    const id = useChatStore.getState().createConversation()
    useChatStore.getState().deleteConversation(id)
    expect(chatSync.deleteThread).toHaveBeenCalledWith(id)
  })

  test('localOnly conversations never sync anything', () => {
    const id = crypto.randomUUID()
    useChatStore.setState({
      conversations: { [id]: { id, title: 'Legacy', localOnly: true, created_at: '1', updated_at: '1' } },
      messages: { [id]: [] },
    })
    useChatStore.getState().addMessage(id, { role: 'user', text: 'q' })
    useChatStore.getState().renameConversation(id, 'still legacy')
    useChatStore.getState().deleteConversation(id)
    expect(chatSync.upsertThread).not.toHaveBeenCalled()
    expect(chatSync.upsertMessage).not.toHaveBeenCalled()
    expect(chatSync.deleteThread).not.toHaveBeenCalled()
  })

  test('successful replies upsert the final assistant message', async () => {
    runChatLoop.mockImplementation(async (_i, cbs) => {
      cbs.onText('the answer')
      return { toolCardIds: [], error: null, errorCode: null, aborted: false }
    })
    const id = useChatStore.getState().createConversation()
    useChatStore.getState().addMessage(id, { role: 'user', text: 'q' })
    chatSync.upsertMessage.mockClear()
    await useChatStore.getState().sendMessage(id, 'q')
    const assistantCalls = chatSync.upsertMessage.mock.calls.filter(([, , m]) => m.role === 'assistant')
    expect(assistantCalls).toHaveLength(1)
    expect(assistantCalls[0][2].text).toBe('the answer')
  })

  test('stopped replies persist with the stopped flag; errored replies do not persist', async () => {
    const id = useChatStore.getState().createConversation()
    useChatStore.getState().addMessage(id, { role: 'user', text: 'q' })
    chatSync.upsertMessage.mockClear()
    runChatLoop.mockResolvedValueOnce({ toolCardIds: [], error: null, errorCode: null, aborted: true })
    await useChatStore.getState().sendMessage(id, 'q')
    let assistantCalls = chatSync.upsertMessage.mock.calls.filter(([, , m]) => m.role === 'assistant')
    expect(assistantCalls).toHaveLength(1)
    expect(assistantCalls[0][2].stopped).toBe(true)

    chatSync.upsertMessage.mockClear()
    runChatLoop.mockResolvedValueOnce({ toolCardIds: [], error: 'boom', errorCode: null, aborted: false })
    await useChatStore.getState().sendMessage(id, 'q')
    assistantCalls = chatSync.upsertMessage.mock.calls.filter(([, , m]) => m.role === 'assistant')
    expect(assistantCalls).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- chatStoreWriteThrough`
Expected: FAIL (no sync calls fire).

- [ ] **Step 3: Implement in `chatStore.js`**

Add a module-level helper after the `loadedThreads` declaration:

```js
// Fire-and-forget write-through. Local state is authoritative this session;
// chatSync resolves { ok:false } on failure (already logged) — nothing to
// handle here. localOnly (legacy) conversations never sync.
function pushThread(get, conversationId) {
  const conv = get().conversations[conversationId]
  const userId = useAuthStore.getState().user?.id
  if (!conv || conv.localOnly || !userId) return
  _syncedIds.add(conversationId)
  chatSync.upsertThread(userId, conv)
}

function pushMessage(get, conversationId, msg) {
  const conv = get().conversations[conversationId]
  const userId = useAuthStore.getState().user?.id
  if (!conv || conv.localOnly || !userId || !msg) return
  chatSync.upsertMessage(userId, conversationId, msg)
}
```

Then wire the call sites:
1. `createConversation`: after the `set(...)`, before `return id`, add `pushThread(get, id)`.
2. `addMessage`: after its `set(...)`, before `return msg.id`, add `if (role === 'user') pushMessage(get, conversationId, msg)` and `if (role === 'user') pushThread(get, conversationId)` (thread's `updated_at` moved). (Combine under one `if`.)
3. `renameConversation`, `toggleStarred`, `setRailGroupBy`: after each action's `set(...)`, add `pushThread(get, id)` (rename/star use `id`; setRailGroupBy uses its `id` param). For `toggleStarred` and `setRailGroupBy` (currently single-expression `set` arrows), convert to a block body `{ set(...); pushThread(get, id) }` without altering the set logic.
4. `generateTitle`: after the truncation-fallback `set(...)`, add `pushThread(get, conversationId)`; after the AI-title success `set(...)`, add `pushThread(get, conversationId)`.
5. `deleteConversation`: capture `const conv = get().conversations[id]` and `const userId = useAuthStore.getState().user?.id` BEFORE the abort+set, and after the `set(...)` add `if (conv && !conv.localOnly && userId) chatSync.deleteThread(id)`.
6. `sendMessage`: in the `aborted` branch, after `patchMsg({ stopped: true, mentionedCardIds })`, add:

```js
      pushMessage(get, conversationId, get().messages[conversationId]?.find((m) => m.id === msgId))
      pushThread(get, conversationId)
```

and in the success path, after `patchMsg({ mentionedCardIds })`, add the same two lines. The error branch gets NO message push (errored replies stay local) but keeps state as-is.

- [ ] **Step 4: Run tests**

Run: `npm run test -- chatStoreWriteThrough`, then `npm run test -- chatStore` (all suites; the previously-written suites mock nothing for chatSync — add the same `vi.mock('../lib/chatSync', ...)` block to any existing chatStore test file that fails because real chatSync hits the unmocked supabase client; mock additively, never weaken assertions).
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/chatStore.js src/__tests__/
git commit -m "feat(chat): write-through sync on every conversation mutation"
```

---

### Task 5: Bounded cache trim + full verification

**Files:**
- Modify: `src/store/chatStore.js` (partialize only)
- Test: `src/__tests__/chatStoreCacheTrim.test.js` (new)

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/chatStoreCacheTrim.test.js`:

```js
import { describe, test, expect } from 'vitest'
import { useChatStore } from '../store/chatStore'

const partialize = () => useChatStore.persist.getOptions().partialize(useChatStore.getState())

describe('cache trimming', () => {
  test('caps cached threads at the 30 most recent, localOnly exempt', () => {
    const conversations = {}
    const messages = {}
    for (let i = 1; i <= 31; i++) {
      const id = `t${i}`
      conversations[id] = { id, title: `T${i}`, created_at: '1', updated_at: String(i).padStart(3, '0') }
      messages[id] = []
    }
    conversations.legacy = { id: 'legacy', title: 'Old', localOnly: true, created_at: '1', updated_at: '000' }
    messages.legacy = []
    useChatStore.setState({ conversations, messages })
    const cached = partialize()
    // t1 (oldest updated_at) is dropped; the 30 newest + the localOnly stay.
    expect(cached.conversations.t1).toBeUndefined()
    expect(cached.conversations.t31).toBeDefined()
    expect(cached.conversations.legacy).toBeDefined()
    expect(Object.keys(cached.conversations)).toHaveLength(31)
    // In-memory state is untouched.
    expect(useChatStore.getState().conversations.t1).toBeDefined()
  })

  test('caps cached messages at the last 100 per thread', () => {
    const msgs = []
    for (let i = 1; i <= 101; i++) {
      msgs.push({ id: `m${i}`, role: 'user', text: `msg ${i}`, created_at: String(i) })
    }
    useChatStore.setState({
      conversations: { t1: { id: 't1', title: 'T', created_at: '1', updated_at: '1' } },
      messages: { t1: msgs },
    })
    const cached = partialize()
    expect(cached.messages.t1).toHaveLength(100)
    expect(cached.messages.t1[0].id).toBe('m2')
    expect(cached.messages.t1.at(-1).id).toBe('m101')
    expect(useChatStore.getState().messages.t1).toHaveLength(101)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- chatStoreCacheTrim`
Expected: FAIL (partialize returns everything untrimmed).

- [ ] **Step 3: Implement**

In `chatStore.js`, add above the store creation:

```js
// The cache is a boot accelerant, not an archive — the server holds full
// history. Trim before writing: 30 most-recent threads (localOnly exempt —
// the server cannot restore those) and the last 100 messages per thread.
const CACHE_THREAD_CAP = 30
const CACHE_MESSAGES_PER_THREAD = 100

function trimForCache(s) {
  const all = Object.values(s.conversations)
  const keep = new Set(
    all
      .filter((c) => !c.localOnly)
      .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
      .slice(0, CACHE_THREAD_CAP)
      .map((c) => c.id),
  )
  for (const c of all) if (c.localOnly) keep.add(c.id)
  const conversations = {}
  const messages = {}
  for (const id of keep) {
    conversations[id] = s.conversations[id]
    const msgs = s.messages[id] || []
    messages[id] = msgs.length > CACHE_MESSAGES_PER_THREAD
      ? msgs.slice(-CACHE_MESSAGES_PER_THREAD)
      : msgs
  }
  return { conversations, messages }
}
```

and change the persist option to `partialize: (s) => trimForCache(s),`.

- [ ] **Step 4: Full verification**

Run: `npm run test -- chatStoreCacheTrim` (PASS), then `npm run test` (full suite green — the existing `chatStoreRailGroupBy` partialize test still passes because its thread count is under the cap), `npm run lint`, `npm run build`.

- [ ] **Step 5: Commit**

```bash
git add src/store/chatStore.js src/__tests__/chatStoreCacheTrim.test.js
git commit -m "feat(chat): bound the localStorage cache to 30 threads / 100 messages"
```

Post-review (controller): apply the migration via Supabase MCP `apply_migration`, verify tables/policies/indexes + `get_advisors` security clean, then the spec's live end-to-end checks.
