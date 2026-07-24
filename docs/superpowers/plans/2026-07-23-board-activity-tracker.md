# Board Activity Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Board-level activity feed — a clock button in the board tool cluster opens a Kolumn-style modal listing all activity grouped by date, filterable by type, with card refs that carry icons and survive card deletion.

**Architecture:** One migration makes `card_activity` board-scoped and deletion-proof; `logActivity` snapshots card identity into `meta`; missing loggers are added to the existing slices; a new `activitySlice` fetches board activity paginated; `BoardActivityModal` renders groups/filters; a `ClockCounterClockwise` trigger joins the collapsible tool cluster in `BoardSelector`.

**Tech Stack:** React 19, Zustand slices, Supabase (Postgres/RLS), Tailwind v4 tokens, Phosphor icons, date-fns, Vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-07-23-board-activity-tracker-design.md`

## Global Constraints

- Colors via `var(--token)` only; icons `@phosphor-icons/react` only; selection wash = `--color-mauve-cream`.
- Modal anatomy copies `WorkspaceCreateModal`: `text-xl font-semibold` header + X close.
- `logActivity` stays fire-and-forget — never `await`ed by callers, never throws.
- The shared supabase test mock is `src/__tests__/mocks/supabase.js` (see `boardStoreErrors.test.js` for the vi.mock pattern).
- Verify builds with `npm run build > /dev/null 2>&1 && echo OK` (unpiped exit code — piping to tail/grep masks failures).
- Known-clean baseline: full suite currently 706/706.
- Commits: conventional with scope; no `$` characters in commit messages (zsh).

---

### Task 1: Migration — board-scoped, deletion-proof card_activity

**Files:**
- Create: `supabase/migrations/2026-07-23-board-activity.sql`
- Modify: `supabase/schema.sql` (the `card_activity` block at ~line 992 and its policies at ~line 1005)

**Interfaces:**
- Produces: `card_activity.board_id uuid not null` (indexed with created_at desc), nullable `card_id` with `on delete set null`, RLS via `get_my_board_ids()`. Tasks 2–4 depend on `board_id` existing and on rows surviving card deletion.

- [ ] **Step 1: Write the migration file**

```sql
-- Board activity tracker (2026-07-23): make card_activity queryable per
-- board and let history survive card deletion.

-- 1) board_id, backfilled from cards
alter table public.card_activity
  add column if not exists board_id uuid references public.boards(id) on delete cascade;

update public.card_activity ca
set board_id = c.board_id
from public.cards c
where ca.card_id = c.id and ca.board_id is null;

-- Rows whose card is already gone can't be scoped — drop them (pre-feature
-- data; the new on-delete-set-null keeps future rows).
delete from public.card_activity where board_id is null;

alter table public.card_activity alter column board_id set not null;

create index if not exists idx_card_activity_board_created
  on public.card_activity(board_id, created_at desc);

-- 2) card_id: cascade -> set null (history outlives the card)
alter table public.card_activity drop constraint card_activity_card_id_fkey;
alter table public.card_activity alter column card_id drop not null;
alter table public.card_activity
  add constraint card_activity_card_id_fkey
  foreign key (card_id) references public.cards(id) on delete set null;

-- 3) RLS via board membership (same helper the cards policies use)
drop policy "Members can view card activity" on public.card_activity;
drop policy "Members can create card activity" on public.card_activity;

create policy "Members can view card activity"
  on public.card_activity for select
  to authenticated
  using (board_id in (select get_my_board_ids()));

create policy "Members can create card activity"
  on public.card_activity for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and board_id in (select get_my_board_ids())
  );
```

- [ ] **Step 2: Mirror in `supabase/schema.sql`**

In the `create table public.card_activity` block: change `card_id uuid not null references public.cards(id) on delete cascade` to `card_id uuid references public.cards(id) on delete set null`, and add after it:

```sql
  board_id uuid not null references public.boards(id) on delete cascade,
```

Below the existing `idx_card_activity_card_id` index add:

```sql
create index idx_card_activity_board_created on public.card_activity(board_id, created_at desc);
```

Replace both policies with the versions from Step 1 (the `get_my_board_ids()` forms).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/2026-07-23-board-activity.sql supabase/schema.sql
git commit -m "feat(activity): board-scoped, deletion-proof card_activity schema"
```

(The session controller applies the migration via MCP — do NOT attempt to apply it.)

---

### Task 2: logActivity v2 + complete the logger coverage

**Files:**
- Modify: `src/store/boardStore/helpers.js` (logActivity, ~line 89)
- Modify: `src/store/boardStore/slices/cardsSlice.js` (updateCard diff block ~lines 285–330; deleteCard ~line 376; duplicateCard ~line 162)
- Modify: `src/store/boardStore/slices/labelsSlice.js` (addLabelToCard ~line 11; removeLabelFromCard ~line 63)
- Test: `src/__tests__/activityLogging.test.js`

**Interfaces:**
- Consumes: Task 1's `board_id` column (writes it on every insert).
- Produces: `logActivity(cardId, action, detail, meta = null, boardIdOverride = null)` — resolves `board_id` from the store card (or the override), merges `{card_title, card_icon}` snapshot into `meta`, skips insert when no board id can be resolved. New actions logged: `deleted, duplicated, icon_changed, description_edited, checklist_added, checklist_completed, label_added, label_removed`.

- [ ] **Step 1: Write the failing tests**

```js
// src/__tests__/activityLogging.test.js
import { describe, test, expect, vi, beforeEach } from 'vitest'

const inserts = []
vi.mock('../lib/supabase', () => {
  const { createMockSupabase } = require('./mocks/supabase')
  const mock = createMockSupabase()
  const origFrom = mock.from
  mock.from = (table) => {
    const builder = origFrom(table)
    if (table === 'card_activity') {
      const origInsert = builder.insert
      builder.insert = (row) => { inserts.push(row); return origInsert(row) }
    }
    return builder
  }
  mock.auth = { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'u@x.y' } } }) }
  return { supabase: mock }
})
vi.mock('../utils/logger', () => ({ logError: vi.fn() }))

import { logActivity } from '../store/boardStore/helpers'
import { useBoardStore } from '../store/boardStore'
import { useAuthStore } from '../store/authStore'

describe('logActivity v2', () => {
  beforeEach(() => {
    inserts.length = 0
    useAuthStore.setState({ profile: { display_name: 'Dulaxi' } })
    useBoardStore.setState({
      cards: { c1: { id: 'c1', board_id: 'b1', title: 'Redo hero', icon: 'rocket' } },
    })
  })

  test('writes board_id and snapshots card title/icon into meta', async () => {
    await logActivity('c1', 'renamed', 'a → b')
    expect(inserts).toHaveLength(1)
    expect(inserts[0].board_id).toBe('b1')
    expect(inserts[0].meta).toMatchObject({ card_title: 'Redo hero', card_icon: 'rocket' })
  })

  test('boardIdOverride + explicit meta serve the deleted flow (card gone from store)', async () => {
    useBoardStore.setState({ cards: {} })
    await logActivity('c1', 'deleted', null, { card_title: 'Redo hero', card_icon: 'rocket' }, 'b1')
    expect(inserts).toHaveLength(1)
    expect(inserts[0].board_id).toBe('b1')
    expect(inserts[0].meta.card_title).toBe('Redo hero')
  })

  test('skips the insert when no board id is resolvable', async () => {
    useBoardStore.setState({ cards: {} })
    await logActivity('ghost-card', 'renamed', 'x')
    expect(inserts).toHaveLength(0)
  })

  test('caller meta wins over snapshot on key collision', async () => {
    await logActivity('c1', 'moved', 'A → B', { card_title: 'Custom' })
    expect(inserts[0].meta.card_title).toBe('Custom')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/__tests__/activityLogging.test.js`
Expected: FAIL — `board_id` undefined / meta missing snapshot.

- [ ] **Step 3: Upgrade logActivity in `helpers.js`**

Replace the existing function with:

```js
// Fire-and-forget activity logger — never blocks the calling action.
// v2: resolves board_id (required by RLS + the board feed) and snapshots
// the card's identity into meta so rows can render their card chip after
// the card is deleted (card_id nulls out on delete).
export async function logActivity(cardId, action, detail, meta = null, boardIdOverride = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const profile = useAuthStore.getState().profile
    const actorName = profile?.display_name || user.email || 'Unknown'
    // Dynamic import: helpers.js is imported by the slices that compose the
    // store, so a static import of '../index' here would be circular.
    const { useBoardStore } = await import('./index')
    const card = cardId ? useBoardStore.getState().cards[cardId] : null
    const boardId = boardIdOverride || card?.board_id
    if (!boardId) return
    const snapshot = card ? { card_title: card.title, card_icon: card.icon || null } : {}
    const mergedMeta = { ...snapshot, ...(meta || {}) }
    await supabase.from('card_activity').insert({
      card_id: cardId,
      board_id: boardId,
      user_id: user.id,
      actor_name: actorName,
      action,
      detail,
      ...(Object.keys(mergedMeta).length ? { meta: mergedMeta } : {}),
    })
  } catch (err) {
    // Activity logging should never break the main flow
    logError('logActivity failed:', err)
  }
}
```

(Check the store's index filename first — `src/store/boardStore/index.js` — and that it exports `useBoardStore`; adjust the dynamic import path if the export lives elsewhere.)

- [ ] **Step 4: Add the missing loggers**

In `cardsSlice.js` `updateCard`, alongside the existing diff loggers (renamed/priority/assignee/due, ~lines 285–330), add:

```js
      if ('icon' in dbUpdates && dbUpdates.icon !== prevCard.icon) {
        logActivity(cardId, 'icon_changed', dbUpdates.icon || 'removed')
      }
      if ('description' in dbUpdates && (dbUpdates.description || '') !== (prevCard.description || '')) {
        logActivity(cardId, 'description_edited', null)
      }
      if ('checklist' in dbUpdates) {
        const prevItems = prevCard.checklist || []
        const nextItems = dbUpdates.checklist || []
        const prevTexts = new Set(prevItems.map((i) => i.text))
        nextItems
          .filter((i) => i.text && !prevTexts.has(i.text))
          .forEach((i) => logActivity(cardId, 'checklist_added', i.text))
        const prevDone = new Set(prevItems.filter((i) => i.done).map((i) => i.text))
        nextItems
          .filter((i) => i.done && !prevDone.has(i.text))
          .forEach((i) => logActivity(cardId, 'checklist_completed', i.text))
      }
```

In `deleteCard`, inside the `if (shouldDelete)` branch, immediately BEFORE the `supabase.from('cards').delete()` call (undo keeps the log honest — an undone delete never reaches this point):

```js
      logActivity(cardId, 'deleted', null,
        { card_title: prevCard.title, card_icon: prevCard.icon || null },
        prevCard.board_id)
```

In `duplicateCard`, before the `return get().addCard(...)`:

```js
    logActivity(cardId, 'duplicated', card.title)
```

In `labelsSlice.js` `addLabelToCard`, after the store `set(...)` at the end of the success path:

```js
    logActivity(cardId, 'label_added', text)
```

In `removeLabelFromCard`, capture the text before removal (`const labelText = get().labels[labelId]?.text`) and after the successful removal:

```js
    logActivity(cardId, 'label_removed', labelText || 'label')
```

Add `logActivity` to `labelsSlice.js`'s import from `'../helpers'` if missing.

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/__tests__/activityLogging.test.js src/__tests__/duplicateCardLabels.test.js src/__tests__/boardStoreErrors.test.js`
Expected: all PASS.

- [ ] **Step 6: Build check + commit**

Run: `npm run build > /dev/null 2>&1 && echo OK` → OK

```bash
git add src/store/boardStore/helpers.js src/store/boardStore/slices/cardsSlice.js src/store/boardStore/slices/labelsSlice.js src/__tests__/activityLogging.test.js
git commit -m "feat(activity): logActivity writes board_id + card snapshot; full logger coverage"
```

---

### Task 3: activitySlice + activity constants

**Files:**
- Create: `src/store/boardStore/slices/activitySlice.js`
- Create: `src/constants/activity.js`
- Modify: `src/store/boardStore/index.js` (register slice; add `boardActivity: {}` to the `clearBoards` reset object)
- Test: `src/__tests__/boardActivity.test.js`

**Interfaces:**
- Produces:
  - Store: `boardActivity: { [boardId]: rows[] }`; `fetchBoardActivity(boardId, { before } = {}) => Promise<number>` (rows fetched; replaces the board's list when no `before`, appends when paging; page size 200).
  - `src/constants/activity.js`: `ACTIVITY_GROUPS` = `[{ key, label, actions: string[] }]` exactly per the spec's seven groups; `VERB_PHRASES` = `{ [action]: string }` per the spec's verb list; `PAGE_SIZE = 200`.

- [ ] **Step 1: Write the failing tests**

```js
// src/__tests__/boardActivity.test.js
import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase', () => {
  const { createMockSupabase } = require('./mocks/supabase')
  return { supabase: createMockSupabase() }
})
vi.mock('../utils/logger', () => ({ logError: vi.fn() }))

import { useBoardStore } from '../store/boardStore'
import { ACTIVITY_GROUPS, VERB_PHRASES } from '../constants/activity'

describe('activity constants', () => {
  test('seven groups cover every logged action exactly once', () => {
    expect(ACTIVITY_GROUPS.map((g) => g.key)).toEqual([
      'created', 'moved', 'edited', 'completed', 'deleted', 'labels', 'files',
    ])
    const all = ACTIVITY_GROUPS.flatMap((g) => g.actions)
    expect(new Set(all).size).toBe(all.length) // no action in two groups
    // every action has a verb phrase
    all.forEach((a) => expect(VERB_PHRASES[a], a).toBeTruthy())
  })
})

describe('fetchBoardActivity', () => {
  beforeEach(() => useBoardStore.setState({ boardActivity: {} }))

  test('replaces the board list on a fresh fetch', async () => {
    await useBoardStore.getState().fetchBoardActivity('b1')
    expect(useBoardStore.getState().boardActivity.b1).toEqual([])
  })

  test('ignores the __all__ pseudo-board', async () => {
    await useBoardStore.getState().fetchBoardActivity('__all__')
    expect(useBoardStore.getState().boardActivity.__all__).toBeUndefined()
  })

  test('appends when paging with before', async () => {
    useBoardStore.setState({ boardActivity: { b1: [{ id: 'x' }] } })
    await useBoardStore.getState().fetchBoardActivity('b1', { before: '2026-01-01' })
    expect(useBoardStore.getState().boardActivity.b1[0]).toEqual({ id: 'x' })
  })
})
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/__tests__/boardActivity.test.js` → FAIL (module not found).

- [ ] **Step 3: Write `src/constants/activity.js`**

```js
// Activity feed vocabulary. Groups drive the modal's filter chips; every
// action logActivity can write MUST appear in exactly one group (the
// constants test enforces this).
export const PAGE_SIZE = 200

export const ACTIVITY_GROUPS = [
  { key: 'created', label: 'Created', actions: ['created', 'duplicated'] },
  { key: 'moved', label: 'Moved', actions: ['moved'] },
  { key: 'edited', label: 'Edited', actions: ['renamed', 'updated_priority', 'updated_assignee', 'updated_due_date', 'icon_changed', 'description_edited', 'checklist_added'] },
  { key: 'completed', label: 'Completed', actions: ['completed', 'reopened', 'checklist_completed'] },
  { key: 'deleted', label: 'Deleted', actions: ['deleted', 'archived', 'unarchived'] },
  { key: 'labels', label: 'Labels', actions: ['label_added', 'label_removed'] },
  { key: 'files', label: 'Files', actions: ['attached'] },
]

export const VERB_PHRASES = {
  created: 'created',
  duplicated: 'duplicated',
  moved: 'moved',
  renamed: 'renamed',
  updated_priority: 'set priority on',
  updated_assignee: 'assigned',
  updated_due_date: 'set deadline on',
  icon_changed: 'changed icon of',
  description_edited: 'edited description of',
  checklist_added: 'added checklist item to',
  completed: 'completed',
  reopened: 'reopened',
  checklist_completed: 'checked off item on',
  deleted: 'deleted',
  archived: 'archived',
  unarchived: 'restored',
  label_added: 'labeled',
  label_removed: 'unlabeled',
  attached: 'attached file to',
}
```

- [ ] **Step 4: Write `activitySlice.js`**

```js
import { supabase } from '../../../lib/supabase'
import { logError } from '../../../utils/logger'
import { PAGE_SIZE } from '../../../constants/activity'

// Board-level activity feed. Fetched on modal open (no realtime in v1).
export const createActivitySlice = (set, get) => ({
  boardActivity: {},

  // Fresh fetch replaces the board's list; { before } pages older rows and
  // appends. Returns the number of rows fetched so the caller can decide
  // whether a "Show more" is worth offering (< PAGE_SIZE = end of history).
  fetchBoardActivity: async (boardId, { before } = {}) => {
    if (!boardId || boardId === '__all__') return 0
    try {
      let q = supabase
        .from('card_activity')
        .select('*')
        .eq('board_id', boardId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)
      if (before) q = q.lt('created_at', before)
      const { data, error } = await q
      if (error) { logError('fetchBoardActivity failed:', error); return 0 }
      const rows = data || []
      set((s) => ({
        boardActivity: {
          ...s.boardActivity,
          [boardId]: before ? [...(s.boardActivity[boardId] || []), ...rows] : rows,
        },
      }))
      return rows.length
    } catch (err) {
      logError('fetchBoardActivity failed:', err)
      return 0
    }
  },
})
```

Adjust relative import depths to match the sibling slices (open one and copy its import style).

- [ ] **Step 5: Register the slice**

In `src/store/boardStore/index.js`: import `createActivitySlice`, spread it where the other slices are composed, and add `boardActivity: {}` to the `clearBoards` reset object (line ~28).

- [ ] **Step 6: Run tests** — `npx vitest run src/__tests__/boardActivity.test.js` → PASS (4 tests).

- [ ] **Step 7: Build + commit**

Run: `npm run build > /dev/null 2>&1 && echo OK` → OK

```bash
git add src/store/boardStore/slices/activitySlice.js src/constants/activity.js src/store/boardStore/index.js src/__tests__/boardActivity.test.js
git commit -m "feat(activity): activitySlice with paginated board fetch + activity vocabulary"
```

---

### Task 4: BoardActivityModal + toolbar trigger

**Files:**
- Create: `src/components/board/BoardActivityModal.jsx`
- Modify: `src/components/board/BoardSelector.jsx` (trigger button in the tool cluster after `<GhostToggle …/>` (~line 159); modal render next to the other modals at the bottom)
- Test: `src/__tests__/BoardActivityModal.test.jsx`

**Interfaces:**
- Consumes: `fetchBoardActivity`, `boardActivity` (Task 3); `ACTIVITY_GROUPS`, `VERB_PHRASES`, `PAGE_SIZE` (Task 3); `Modal`, `Avatar`, `Tooltip` primitives; `DynamicIcon`; `TOOLBAR_ICON_BTN`, `TOOLBAR_BTN_FILL`.
- Produces: `<BoardActivityModal boardId onClose />`.

- [ ] **Step 1: Write the failing tests**

```jsx
// src/__tests__/BoardActivityModal.test.jsx
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('../lib/supabase', () => {
  const { createMockSupabase } = require('./mocks/supabase')
  return { supabase: createMockSupabase() }
})
vi.mock('../utils/logger', () => ({ logError: vi.fn() }))

import BoardActivityModal from '../components/board/BoardActivityModal'
import { useBoardStore } from '../store/boardStore'

const TODAY = new Date().toISOString()
const OLD = '2026-01-05T10:00:00Z'

const ROWS = [
  { id: 'a1', card_id: 'c1', board_id: 'b1', actor_name: 'Sarah', action: 'moved', detail: 'Backlog → Done', meta: { card_title: 'Redo hero', card_icon: 'rocket' }, created_at: TODAY },
  { id: 'a2', card_id: null, board_id: 'b1', actor_name: 'Dulaxi', action: 'deleted', detail: null, meta: { card_title: 'Old card', card_icon: null }, created_at: OLD },
  { id: 'a3', card_id: 'c2', board_id: 'b1', actor_name: 'Sarah', action: 'label_added', detail: 'bug', meta: { card_title: 'Fix login', card_icon: null }, created_at: OLD },
]

describe('BoardActivityModal', () => {
  beforeEach(() => {
    useBoardStore.setState({
      boardActivity: { b1: ROWS },
      fetchBoardActivity: vi.fn().mockResolvedValue(ROWS.length),
    })
  })

  const renderModal = () => render(<BoardActivityModal boardId="b1" onClose={() => {}} />)

  test('groups rows by day with Today and dated headers', () => {
    renderModal()
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('Jan 5')).toBeInTheDocument()
  })

  test('renders actor, verb, card title and detail', () => {
    renderModal()
    expect(screen.getByText('Sarah', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('Redo hero')).toBeInTheDocument()
    expect(screen.getByText('Backlog → Done')).toBeInTheDocument()
  })

  test('deleted-card rows are not clickable; live rows dispatch open-card', () => {
    const spy = vi.fn()
    window.addEventListener('kolumn:open-card', spy)
    renderModal()
    fireEvent.click(screen.getByText('Redo hero'))
    expect(spy).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText('Old card'))
    expect(spy).toHaveBeenCalledTimes(1) // unchanged — dead chip
    window.removeEventListener('kolumn:open-card', spy)
  })

  test('type chips filter the list', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Labels' }))
    expect(screen.getByText('Fix login')).toBeInTheDocument()
    expect(screen.queryByText('Redo hero')).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure** — module not found.

- [ ] **Step 3: Implement `BoardActivityModal.jsx`**

```jsx
import { useEffect, useMemo, useState } from 'react'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { FileText, X } from '@phosphor-icons/react'
import Modal from '../ui/Modal'
import Avatar from '../ui/Avatar'
import DynamicIcon from './DynamicIcon'
import { useBoardStore } from '../../store/boardStore'
import { ACTIVITY_GROUPS, VERB_PHRASES, PAGE_SIZE } from '../../constants/activity'

function dayLabel(iso) {
  const d = parseISO(iso)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMM d')
}

// Board-wide activity feed. Anatomy matches WorkspaceCreateModal (header +
// X); rows are grouped by day; chips multi-select filter by action group.
export default function BoardActivityModal({ boardId, onClose }) {
  const rows = useBoardStore((s) => s.boardActivity[boardId]) || []
  const fetchBoardActivity = useBoardStore((s) => s.fetchBoardActivity)
  const [activeGroups, setActiveGroups] = useState(() => new Set())
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    fetchBoardActivity(boardId).then((n) => setHasMore(n === PAGE_SIZE))
  }, [boardId, fetchBoardActivity])

  const toggleGroup = (key) => {
    setActiveGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const actionToGroup = useMemo(() => {
    const m = {}
    ACTIVITY_GROUPS.forEach((g) => g.actions.forEach((a) => { m[a] = g.key }))
    return m
  }, [])

  const visible = useMemo(() => {
    if (activeGroups.size === 0) return rows
    return rows.filter((r) => activeGroups.has(actionToGroup[r.action]))
  }, [rows, activeGroups, actionToGroup])

  // Group by day label, preserving desc order
  const groups = useMemo(() => {
    const out = []
    let current = null
    visible.forEach((r) => {
      const label = dayLabel(r.created_at)
      if (!current || current.label !== label) {
        current = { label, rows: [] }
        out.push(current)
      }
      current.rows.push(r)
    })
    return out
  }, [visible])

  const openCard = (row) => {
    if (!row.card_id) return
    window.dispatchEvent(new CustomEvent('kolumn:open-card', { detail: { cardId: row.card_id } }))
    onClose()
  }

  const loadMore = async () => {
    if (!rows.length) return
    setLoadingMore(true)
    const oldest = rows[rows.length - 1].created_at
    const n = await fetchBoardActivity(boardId, { before: oldest })
    setHasMore(n === PAGE_SIZE)
    setLoadingMore(false)
  }

  return (
    <Modal open onClose={onClose} contentClassName="w-full max-w-lg">
      <div className="flex items-start justify-between">
        <h2 className="text-xl font-semibold text-[var(--text-primary)] flex w-full min-w-0 items-center leading-6 break-words">
          Activity
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="h-8 w-8 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors -mx-2"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Type filter chips — multi-select, empty = all */}
      <div className="flex items-center gap-1.5 flex-wrap mt-3 mb-2">
        {ACTIVITY_GROUPS.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => toggleGroup(g.key)}
            aria-pressed={activeGroups.has(g.key)}
            className={`h-6 px-2 rounded-full border text-xs transition-colors cursor-pointer ${
              activeGroups.has(g.key)
                ? 'bg-[var(--color-mauve-cream)] border-[var(--color-mauve)] text-[var(--text-primary)]'
                : 'border-[var(--color-sand)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="max-h-[65vh] overflow-y-auto -mx-1 px-1">
        {groups.length === 0 && (
          <p className="py-10 text-center text-sm text-[var(--text-muted)]">
            {rows.length === 0
              ? 'Nothing yet — activity shows up as your team works.'
              : 'No matching activity.'}
          </p>
        )}
        {groups.map((g) => (
          <div key={g.label}>
            <div className="pt-3 pb-1 font-mono text-[11px] uppercase tracking-wide text-[var(--text-faint)]">
              {g.label}
            </div>
            {g.rows.map((row) => {
              const dead = !row.card_id
              const title = row.meta?.card_title || 'a card'
              return (
                <div key={row.id} className="py-1.5 flex items-start gap-2.5">
                  <Avatar name={row.actor_name} size="sm" className="mt-0.5" />
                  <div className="flex-1 min-w-0 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                    <span className="font-medium text-[var(--text-primary)]">{row.actor_name}</span>{' '}
                    {VERB_PHRASES[row.action] || row.action}{' '}
                    <button
                      type="button"
                      onClick={() => openCard(row)}
                      disabled={dead}
                      className={`inline-flex items-center gap-1 align-middle max-w-[220px] ${
                        dead
                          ? 'text-[var(--text-muted)] cursor-default'
                          : 'text-[var(--text-primary)] hover:underline cursor-pointer'
                      }`}
                    >
                      <span className="shrink-0 inline-flex">
                        {row.meta?.card_icon
                          ? <DynamicIcon name={row.meta.card_icon} className="w-3.5 h-3.5" />
                          : <FileText size={14} weight="regular" />}
                      </span>
                      <span className="truncate">{title}</span>
                    </button>
                    {row.detail && (
                      <span className="text-[var(--text-muted)]"> {row.detail}</span>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-[var(--text-faint)] mt-0.5">
                    {format(parseISO(row.created_at), 'HH:mm')}
                  </span>
                </div>
              )
            })}
          </div>
        ))}
        {hasMore && (
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full py-2 my-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]/50 rounded-lg transition-colors"
          >
            {loadingMore ? 'Loading…' : 'Show more'}
          </button>
        )}
      </div>
    </Modal>
  )
}
```

Check `Modal`'s actual props (`open`, `onClose`, `contentClassName`) against `WorkspaceCreateModal`'s usage and mirror exactly.

- [ ] **Step 4: Add the trigger in `BoardSelector.jsx`**

Import `ClockCounterClockwise` (add to the Phosphor import) and `BoardActivityModal`; add state `const [showActivity, setShowActivity] = useState(false)`. Inside the tool cluster, directly after `<GhostToggle boardId={activeBoardId} />`:

```jsx
          <Tooltip content="Activity">
            <button
              type="button"
              aria-label="Board activity"
              onClick={() => setShowActivity(true)}
              className={`${TOOLBAR_ICON_BTN} ${TOOLBAR_BTN_FILL}`}
            >
              <ClockCounterClockwise className="w-4 h-4" />
            </button>
          </Tooltip>
```

Next to the other modal renders at the bottom of the component:

```jsx
      {showActivity && isRealBoard && (
        <BoardActivityModal boardId={activeBoardId} onClose={() => setShowActivity(false)} />
      )}
```

- [ ] **Step 5: Run tests** — `npx vitest run src/__tests__/BoardActivityModal.test.jsx` → PASS (4 tests).

- [ ] **Step 6: Full suite + build + lint**

Run: `npx vitest run` (expect 706 + new all green), `npm run build > /dev/null 2>&1 && echo OK`, `npm run lint` (only the 2 pre-existing OnboardingPage warnings).

- [ ] **Step 7: Commit**

```bash
git add src/components/board/BoardActivityModal.jsx src/components/board/BoardSelector.jsx src/__tests__/BoardActivityModal.test.jsx
git commit -m "feat(activity): board activity modal with day groups, type filters, card chips"
```

---

### Task 5: Apply migration + live verification (controller-driven)

**Files:** none (MCP + browser)

- [ ] **Step 1:** Controller applies `2026-07-23-board-activity.sql` via MCP `apply_migration`, then verifies: `board_id` column exists + not null; `card_id` nullable; index present; `select count(*) from card_activity where board_id is null` → 0.
- [ ] **Step 2:** Manual pass: open a board → expand tools → Activity; perform a move/rename/label/complete/delete; reopen modal; verify rows, filters, deleted row inert, card chip opens the card.
