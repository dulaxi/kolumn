# Labels Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-card `labels jsonb` field with a board-scoped label registry, free-text + autocomplete creation, a shared management modal, and server-side normalization shared by the human UI and AI tool path. Visual card rendering is preserved byte-for-byte.

**Architecture:** New `labels` (board-scoped) and `card_labels` (join) tables. Three Postgres functions (`upsert_label`, `attach_label_by_text`, `merge_labels`) carry text-matching and merging logic. Frontend reads labels via new Zustand selectors; UI changes are limited to two new components (`LabelAutocomplete`, `LabelManagerModal`) plus call-site swaps. AI tools change `labels` schema from `Array<{text,color}>` to `Array<string>`; server resolves via `upsert_label`.

**Tech Stack:** PostgreSQL (via Supabase MCP `apply_migration` / `execute_sql`), Supabase Realtime, Zustand, React 19, Vitest, Vite 7, Deno (edge functions), Claude Sonnet/Haiku via Anthropic SDK.

**Spec:** `docs/superpowers/specs/2026-05-20-labels-rework-design.md`

---

## Task 1: Schema migration — tables, indexes, RLS

**Files:**
- Create: `supabase/migrations/20260520000000_labels_registry.sql` (auto-named by `apply_migration`)
- Modify: `supabase/schema.sql` (canonical full schema regenerated at end)

- [ ] **Step 1: Inspect existing `cards` table policies for reference**

Use Supabase MCP:
```
mcp__plugin_supabase_supabase__execute_sql with query:
  select polname, polcmd, pg_get_expr(polqual, polrelid) as using_expr,
         pg_get_expr(polwithcheck, polrelid) as check_expr
  from pg_policy where polrelid = 'cards'::regclass;
```

Expected: 4 policies (select/insert/update/delete) keyed on board membership via `board_members`. Copy the `using_expr` pattern verbatim — labels will use the same membership predicate.

- [ ] **Step 2: Apply migration**

Use Supabase MCP `apply_migration` with `name="labels_registry"` and `query`:

```sql
-- New: per-board label registry
create table labels (
  id           uuid primary key default gen_random_uuid(),
  board_id     uuid not null references boards(id) on delete cascade,
  text         text not null check (length(trim(text)) > 0 and length(text) <= 64),
  color        text not null check (color in ('red','orange','yellow','green','blue','purple','pink','gray')),
  created_at   timestamptz not null default now(),
  archived_at  timestamptz
);

create unique index labels_board_text_lower_uq
  on labels (board_id, lower(text))
  where archived_at is null;

create index labels_board_id_idx on labels (board_id);

alter table labels enable row level security;

create policy labels_select on labels for select
  using (board_id in (select board_id from board_members where user_id = auth.uid()));
create policy labels_insert on labels for insert
  with check (board_id in (select board_id from board_members where user_id = auth.uid()));
create policy labels_update on labels for update
  using (board_id in (select board_id from board_members where user_id = auth.uid()));
create policy labels_delete on labels for delete
  using (board_id in (select board_id from board_members where user_id = auth.uid()));

-- New: card ↔ label join
create table card_labels (
  card_id    uuid not null references cards(id) on delete cascade,
  label_id   uuid not null references labels(id) on delete cascade,
  position   smallint not null default 0,
  created_at timestamptz not null default now(),
  primary key (card_id, label_id)
);

create index card_labels_label_id_idx on card_labels (label_id);

alter table card_labels enable row level security;

create policy card_labels_select on card_labels for select
  using (card_id in (
    select c.id from cards c
    where c.board_id in (select board_id from board_members where user_id = auth.uid())
  ));
create policy card_labels_insert on card_labels for insert
  with check (card_id in (
    select c.id from cards c
    where c.board_id in (select board_id from board_members where user_id = auth.uid())
  ));
create policy card_labels_delete on card_labels for delete
  using (card_id in (
    select c.id from cards c
    where c.board_id in (select board_id from board_members where user_id = auth.uid())
  ));

-- Drop the legacy column
alter table cards drop column labels;
```

Adjust the membership predicate in Step 2 if Step 1 showed a different shape (e.g., a helper function `has_board_access(board_id)` instead of an inline subquery). The shape must mirror existing `cards` policies exactly.

- [ ] **Step 3: Verify with `list_tables`**

Run `mcp__plugin_supabase_supabase__list_tables` (schemas=["public"]). Expect `labels` and `card_labels` to appear; `cards` row should no longer list a `labels` column.

- [ ] **Step 4: Run advisors**

Run `mcp__plugin_supabase_supabase__get_advisors` with `type="security"`, then again with `type="performance"`. Expected: no new errors. If "RLS disabled" or "missing index for foreign key" appears, fix before moving on.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260520000000_labels_registry.sql
git commit -m "feat(labels): add labels and card_labels tables, drop cards.labels"
```

---

## Task 2: RPC `upsert_label`

**Files:**
- Add to: `supabase/migrations/20260520000001_labels_rpcs.sql` (auto-named by `apply_migration`)

- [ ] **Step 1: Write the assertion plan as a comment**

Before applying, decide what we'll assert:
1. Inserting `/Bug` then `/bug` returns the same id (case-insensitive).
2. Inserting `/  bug  ` returns the same id as `/bug` (trim).
3. Inserting `/security` without a color produces a deterministic color (run twice in different sessions, same color).
4. Inserting an empty/whitespace string raises.
5. Inserting `/bug` on a different `board_id` produces a different id.

- [ ] **Step 2: Apply migration**

Use Supabase MCP `apply_migration` with `name="labels_rpcs"` and `query`:

```sql
create or replace function upsert_label(
  p_board_id uuid,
  p_text     text,
  p_color    text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_text  text := trim(p_text);
  v_color text := p_color;
  v_id    uuid;
begin
  if v_text = '' or v_text is null then
    raise exception 'label text required';
  end if;

  select id into v_id
  from labels
  where board_id = p_board_id
    and lower(text) = lower(v_text)
    and archived_at is null
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  if v_color is null then
    v_color := (array['red','orange','yellow','green','blue','purple','pink','gray'])
               [(abs(hashtext(lower(v_text))) % 8) + 1];
  end if;

  if v_color not in ('red','orange','yellow','green','blue','purple','pink','gray') then
    v_color := 'gray';
  end if;

  insert into labels (board_id, text, color)
  values (p_board_id, v_text, v_color)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function upsert_label(uuid, text, text) to authenticated;
```

- [ ] **Step 3: Run advisors**

`mcp__plugin_supabase_supabase__get_advisors` with `type="security"`. Expect no new warnings about function search path (we pinned it).

- [ ] **Step 4: Verify case-insensitive idempotency**

Run via `execute_sql`. Replace `'<BOARD_UUID>'` with a real board id from `select id from boards limit 1;`.

```sql
do $$
declare bid uuid; a uuid; b uuid; c uuid; d uuid;
begin
  select id into bid from boards limit 1;
  a := upsert_label(bid, 'Bug');
  b := upsert_label(bid, 'bug');
  c := upsert_label(bid, '  bug  ');
  if a <> b or a <> c then
    raise exception 'expected same id, got %, %, %', a, b, c;
  end if;
  d := upsert_label(bid, 'BUG');
  if a <> d then
    raise exception 'casing collapse failed';
  end if;
  delete from labels where id = a;
  raise notice 'upsert_label idempotency OK';
end$$;
```

Expected: `NOTICE: upsert_label idempotency OK`. No exception.

- [ ] **Step 5: Verify empty-text rejection**

```sql
do $$
declare bid uuid;
begin
  select id into bid from boards limit 1;
  begin
    perform upsert_label(bid, '   ');
    raise exception 'expected upsert_label to reject empty text';
  exception when others then
    if sqlerrm <> 'label text required' then
      raise exception 'wrong error: %', sqlerrm;
    end if;
  end;
  raise notice 'empty-text rejection OK';
end$$;
```

Expected: `NOTICE: empty-text rejection OK`.

- [ ] **Step 6: Verify deterministic color**

```sql
do $$
declare bid uuid; v_id uuid; v_color text;
begin
  select id into bid from boards limit 1;
  v_id := upsert_label(bid, 'security-determinism-test');
  select color into v_color from labels where id = v_id;
  delete from labels where id = v_id;
  v_id := upsert_label(bid, 'security-determinism-test');
  if (select color from labels where id = v_id) <> v_color then
    raise exception 'deterministic color failed';
  end if;
  delete from labels where id = v_id;
  raise notice 'deterministic color OK';
end$$;
```

Expected: `NOTICE: deterministic color OK`.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260520000001_labels_rpcs.sql
git commit -m "feat(labels): add upsert_label rpc with normalization and hash color"
```

---

## Task 3: RPCs `attach_label_by_text` and `merge_labels`

**Files:**
- Add to: `supabase/migrations/20260520000002_labels_attach_merge.sql`

- [ ] **Step 1: Apply migration**

Use `apply_migration` with `name="labels_attach_merge"`:

```sql
create or replace function attach_label_by_text(
  p_card_id  uuid,
  p_text     text,
  p_color    text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_board_id uuid;
  v_label_id uuid;
begin
  select board_id into v_board_id from cards where id = p_card_id;
  if v_board_id is null then
    raise exception 'card not found';
  end if;

  v_label_id := upsert_label(v_board_id, p_text, p_color);

  insert into card_labels (card_id, label_id)
  values (p_card_id, v_label_id)
  on conflict (card_id, label_id) do nothing;

  return v_label_id;
end;
$$;

grant execute on function attach_label_by_text(uuid, text, text) to authenticated;

create or replace function merge_labels(
  p_from_id uuid,
  p_into_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_board uuid;
  v_into_board uuid;
begin
  if p_from_id = p_into_id then
    raise exception 'cannot merge label into itself';
  end if;
  select board_id into v_from_board from labels where id = p_from_id;
  select board_id into v_into_board from labels where id = p_into_id;
  if v_from_board is null or v_into_board is null then
    raise exception 'label not found';
  end if;
  if v_from_board <> v_into_board then
    raise exception 'cannot merge labels across boards';
  end if;

  insert into card_labels (card_id, label_id)
  select card_id, p_into_id from card_labels where label_id = p_from_id
  on conflict (card_id, label_id) do nothing;

  delete from card_labels where label_id = p_from_id;
  delete from labels       where id       = p_from_id;
end;
$$;

grant execute on function merge_labels(uuid, uuid) to authenticated;
```

- [ ] **Step 2: Verify attach idempotency**

```sql
do $$
declare bid uuid; cid uuid; a uuid; b uuid;
begin
  select id into bid from boards limit 1;
  select id into cid from cards where board_id = bid limit 1;
  a := attach_label_by_text(cid, 'attach-test');
  b := attach_label_by_text(cid, 'attach-test');
  if a <> b then
    raise exception 'attach not idempotent';
  end if;
  if (select count(*) from card_labels where card_id = cid and label_id = a) <> 1 then
    raise exception 'duplicate join row created';
  end if;
  delete from card_labels where label_id = a;
  delete from labels where id = a;
  raise notice 'attach idempotency OK';
end$$;
```

Expected: `NOTICE: attach idempotency OK`.

- [ ] **Step 3: Verify merge with overlapping cards**

```sql
do $$
declare bid uuid; c1 uuid; c2 uuid; l_from uuid; l_into uuid;
begin
  select id into bid from boards limit 1;
  select id into c1 from cards where board_id = bid order by created_at limit 1;
  select id into c2 from cards where board_id = bid order by created_at desc limit 1;
  if c1 = c2 then raise exception 'need at least 2 cards'; end if;
  l_from := upsert_label(bid, 'merge-from');
  l_into := upsert_label(bid, 'merge-into');
  insert into card_labels (card_id, label_id) values (c1, l_from);
  insert into card_labels (card_id, label_id) values (c2, l_from);
  insert into card_labels (card_id, label_id) values (c2, l_into); -- overlap on c2
  perform merge_labels(l_from, l_into);
  if exists (select 1 from labels where id = l_from) then
    raise exception 'from-label not deleted';
  end if;
  if (select count(*) from card_labels where label_id = l_into) <> 2 then
    raise exception 'expected 2 join rows after merge';
  end if;
  delete from card_labels where label_id = l_into;
  delete from labels where id = l_into;
  raise notice 'merge with overlap OK';
end$$;
```

Expected: `NOTICE: merge with overlap OK`.

- [ ] **Step 4: Verify cross-board merge rejected**

```sql
do $$
declare b1 uuid; b2 uuid; l1 uuid; l2 uuid;
begin
  select id into b1 from boards order by created_at limit 1;
  select id into b2 from boards order by created_at desc limit 1;
  if b1 = b2 then raise notice 'skipping cross-board test, need 2 boards'; return; end if;
  l1 := upsert_label(b1, 'cross-merge-1');
  l2 := upsert_label(b2, 'cross-merge-2');
  begin
    perform merge_labels(l1, l2);
    raise exception 'expected cross-board merge to fail';
  exception when others then
    if sqlerrm <> 'cannot merge labels across boards' then
      raise exception 'wrong error: %', sqlerrm;
    end if;
  end;
  delete from labels where id in (l1, l2);
  raise notice 'cross-board merge rejection OK';
end$$;
```

Expected: `NOTICE: cross-board merge rejection OK` (or the skip notice if only one board exists).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260520000002_labels_attach_merge.sql
git commit -m "feat(labels): add attach_label_by_text and merge_labels rpcs"
```

---

## Task 4: Regenerate `supabase/schema.sql`

**Files:**
- Modify: `supabase/schema.sql`

- [ ] **Step 1: Locate the `cards` table definition in schema.sql**

Read `supabase/schema.sql` at line 225 (where `labels jsonb` lives today). Remove that line.

- [ ] **Step 2: Append the new `labels` and `card_labels` table definitions**

Use Edit tool to insert the same DDL applied in Task 1, but without the `alter table cards drop column labels` line (since this file is the canonical schema, not a migration).

- [ ] **Step 3: Append the three function definitions**

Add `upsert_label`, `attach_label_by_text`, `merge_labels` (same DDL as Tasks 2 and 3) to the end of the file or wherever existing functions live (search for existing `create or replace function` blocks for the canonical location).

- [ ] **Step 4: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat(labels): sync canonical schema.sql with labels tables and rpcs"
```

---

## Task 5: Add label selectors to `selectors.js`

**Files:**
- Modify: `src/store/selectors.js`
- Test: `src/__tests__/labels.test.js` (new file)

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/labels.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { selectCardLabels, selectBoardLabels, selectBoardLabelByText } from '../store/selectors'

const state = {
  labels: {
    L1: { id: 'L1', board_id: 'B1', text: 'Bug',      color: 'red',   archived_at: null },
    L2: { id: 'L2', board_id: 'B1', text: 'Frontend', color: 'blue',  archived_at: null },
    L3: { id: 'L3', board_id: 'B1', text: 'Legacy',   color: 'gray',  archived_at: '2026-01-01T00:00:00Z' },
    L4: { id: 'L4', board_id: 'B2', text: 'Other',    color: 'green', archived_at: null },
  },
  cardLabels: {
    C1: new Set(['L1', 'L2']),
    C2: new Set(['L3']),
  },
}

describe('selectCardLabels', () => {
  it('returns active label objects for a card', () => {
    const labels = selectCardLabels('C1')(state)
    expect(labels.map((l) => l.id).sort()).toEqual(['L1', 'L2'])
  })

  it('filters out archived labels', () => {
    const labels = selectCardLabels('C2')(state)
    expect(labels).toEqual([])
  })

  it('returns stable identity for empty result', () => {
    const a = selectCardLabels('NONE')(state)
    const b = selectCardLabels('NONE')(state)
    expect(a).toBe(b)
  })
})

describe('selectBoardLabels', () => {
  it('returns active labels on the board sorted by lower(text)', () => {
    const labels = selectBoardLabels('B1')(state)
    expect(labels.map((l) => l.text)).toEqual(['Bug', 'Frontend'])
  })

  it('excludes labels from other boards', () => {
    const labels = selectBoardLabels('B1')(state)
    expect(labels.find((l) => l.id === 'L4')).toBeUndefined()
  })
})

describe('selectBoardLabelByText', () => {
  it('matches case-insensitively', () => {
    expect(selectBoardLabelByText('B1', 'BUG')(state)?.id).toBe('L1')
    expect(selectBoardLabelByText('B1', 'bug')(state)?.id).toBe('L1')
  })

  it('does not match archived labels', () => {
    expect(selectBoardLabelByText('B1', 'legacy')(state)).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
npm run test -- src/__tests__/labels.test.js
```

Expected: FAIL — `selectCardLabels`, `selectBoardLabels`, `selectBoardLabelByText` are not exported from `selectors.js`.

- [ ] **Step 3: Add selectors to `src/store/selectors.js`**

```js
const EMPTY_LABELS = Object.freeze([])

export const selectCardLabels = (cardId) => (state) => {
  const ids = state.cardLabels?.[cardId]
  if (!ids || ids.size === 0) return EMPTY_LABELS
  const out = []
  for (const id of ids) {
    const l = state.labels?.[id]
    if (l && !l.archived_at) out.push(l)
  }
  return out.length ? out : EMPTY_LABELS
}

export const selectBoardLabels = (boardId) => (state) => {
  const out = []
  for (const id in state.labels) {
    const l = state.labels[id]
    if (l.board_id === boardId && !l.archived_at) out.push(l)
  }
  out.sort((a, b) => a.text.toLowerCase().localeCompare(b.text.toLowerCase()))
  return out
}

export const selectBoardLabelByText = (boardId, text) => (state) => {
  const target = text.trim().toLowerCase()
  for (const id in state.labels) {
    const l = state.labels[id]
    if (l.board_id === boardId && !l.archived_at && l.text.toLowerCase() === target) {
      return l
    }
  }
  return undefined
}
```

- [ ] **Step 4: Run test to verify it passes**

```
npm run test -- src/__tests__/labels.test.js
```

Expected: PASS (all 6 test cases).

- [ ] **Step 5: Commit**

```bash
git add src/store/selectors.js src/__tests__/labels.test.js
git commit -m "feat(labels): add label selectors with stable empty identity"
```

---

## Task 6: Extend `boardStore` state shape and seed loading

**Files:**
- Modify: `src/store/boardStore.js`

- [ ] **Step 1: Add `labels` and `cardLabels` to initial state**

Find the `create((set, get) => ({ ... }))` block in `boardStore.js`. Locate the existing initial-state defaults (`boards: {}, columns: {}, cards: {}, ...`). Add:

```js
labels: {},
cardLabels: {},
```

- [ ] **Step 2: Modify the `cards` fetch path to no longer expect a `labels` field**

Search for `card.labels` or `labels:` in card-projection code. Remove the field from `cards` selects and from any spread/copy logic. (Spec section 6.1 calls out lines 467, 511, 549, 588, 615, 1220 as touch points in `boardStore.js`.)

- [ ] **Step 3: Add the labels fetch path**

After the existing board/columns/cards fetch, add a parallel fetch for labels and card_labels. Inside the `loadBoardData(boardId)` (or equivalent) action:

```js
const [labelsRes, cardLabelsRes] = await Promise.all([
  supabase.from('labels').select('*').eq('board_id', boardId),
  supabase.from('card_labels').select('card_id, label_id')
    .in('card_id', Object.keys(get().cards).filter((id) => get().cards[id].board_id === boardId)),
])

if (labelsRes.error) throw labelsRes.error
if (cardLabelsRes.error) throw cardLabelsRes.error

set((s) => ({
  labels: labelsRes.data.reduce((acc, l) => ({ ...acc, [l.id]: l }), s.labels),
  cardLabels: cardLabelsRes.data.reduce((acc, cl) => {
    const set = acc[cl.card_id] || new Set()
    set.add(cl.label_id)
    return { ...acc, [cl.card_id]: set }
  }, s.cardLabels),
}))
```

(Adjust to match the existing pattern in the file — if the codebase uses `set((s) => ...)` consistently, follow that; if it uses direct assignment, follow that. The point is: parallel-fetch and merge into state.)

- [ ] **Step 4: Run existing tests to confirm nothing broke**

```
npm run test
```

Expected: PASS for all existing tests. Any test that read `card.labels` directly must be updated to read via `selectCardLabels`.

- [ ] **Step 5: Update any test that referenced `card.labels`**

Grep for `card.labels` and `labels:` in `src/__tests__/`. Replace with the new selector. Specifically check:
- `src/__tests__/toolExecutor.create_card.test.js`
- `src/__tests__/toolExecutor.update_card.test.js`
- `src/__tests__/toolExecutor.duplicate_card.test.js`
- `src/__tests__/fieldMapping.test.js`
- `src/__tests__/cardFilters.test.js`

Each test that asserts on `card.labels` either (a) becomes obsolete (move semantics now live in the registry) or (b) gets rewritten to assert on `state.labels` + `state.cardLabels`.

- [ ] **Step 6: Run all tests**

```
npm run test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/store/boardStore.js src/__tests__/
git commit -m "feat(labels): seed labels/cardLabels in boardStore, drop card.labels reads"
```

---

## Task 7: `boardStore` label actions

**Files:**
- Modify: `src/store/boardStore.js`
- Test: `src/__tests__/labels.test.js`

- [ ] **Step 1: Append action tests to `src/__tests__/labels.test.js`**

```js
import { vi } from 'vitest'
import { useBoardStore } from '../store/boardStore'

vi.mock('../lib/supabase', () => {
  const rpc = vi.fn()
  const from = vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    delete: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })) })),
  }))
  return { supabase: { rpc, from, channel: () => ({ on: () => ({ subscribe: () => ({}) }) }) } }
})

describe('boardStore label actions', () => {
  it('addLabelToCard optimistically updates cardLabels then calls attach_label_by_text', async () => {
    const { addLabelToCard } = useBoardStore.getState()
    useBoardStore.setState({
      cards: { C1: { id: 'C1', board_id: 'B1' } },
      labels: {},
      cardLabels: {},
    })
    const { supabase } = await import('../lib/supabase')
    supabase.rpc.mockResolvedValueOnce({ data: 'L1', error: null })

    await addLabelToCard('C1', 'Bug')

    expect(supabase.rpc).toHaveBeenCalledWith('attach_label_by_text', {
      p_card_id: 'C1', p_text: 'Bug', p_color: null,
    })
    expect(useBoardStore.getState().cardLabels.C1.has('L1')).toBe(true)
  })

  it('removeLabelFromCard removes from state and calls delete', async () => {
    const { removeLabelFromCard } = useBoardStore.getState()
    useBoardStore.setState({
      cardLabels: { C1: new Set(['L1']) },
    })
    await removeLabelFromCard('C1', 'L1')
    expect(useBoardStore.getState().cardLabels.C1.has('L1')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

```
npm run test -- src/__tests__/labels.test.js
```

Expected: FAIL — `addLabelToCard`, `removeLabelFromCard` not defined on the store.

- [ ] **Step 3: Add actions to `boardStore.js`**

Inside the store factory, alongside existing card actions:

```js
addLabelToCard: async (cardId, text, color = null) => {
  const card = get().cards[cardId]
  if (!card) return
  const { data: labelId, error } = await supabase.rpc('attach_label_by_text', {
    p_card_id: cardId, p_text: text, p_color: color,
  })
  if (error) {
    showToast.error(`Couldn't add label: ${error.message}`)
    return
  }
  set((s) => {
    const next = new Set(s.cardLabels[cardId] || [])
    next.add(labelId)
    return { cardLabels: { ...s.cardLabels, [cardId]: next } }
  })
},

removeLabelFromCard: async (cardId, labelId) => {
  set((s) => {
    const cur = s.cardLabels[cardId]
    if (!cur) return s
    const next = new Set(cur)
    next.delete(labelId)
    return { cardLabels: { ...s.cardLabels, [cardId]: next } }
  })
  const { error } = await supabase
    .from('card_labels')
    .delete()
    .eq('card_id', cardId)
    .eq('label_id', labelId)
  if (error) showToast.error(`Couldn't remove label: ${error.message}`)
},

renameLabel: async (labelId, newText) => {
  const trimmed = newText.trim()
  if (!trimmed) return
  const { error } = await supabase.from('labels').update({ text: trimmed }).eq('id', labelId)
  if (error) {
    if (error.code === '23505') {
      showToast.warn('A label with that name already exists — use Merge instead.')
    } else {
      showToast.error(`Couldn't rename label: ${error.message}`)
    }
    return
  }
  set((s) => ({
    labels: { ...s.labels, [labelId]: { ...s.labels[labelId], text: trimmed } },
  }))
},

updateLabelColor: async (labelId, color) => {
  const { error } = await supabase.from('labels').update({ color }).eq('id', labelId)
  if (error) { showToast.error(`Couldn't update color: ${error.message}`); return }
  set((s) => ({
    labels: { ...s.labels, [labelId]: { ...s.labels[labelId], color } },
  }))
},

mergeLabels: async (fromId, intoId) => {
  const { error } = await supabase.rpc('merge_labels', { p_from_id: fromId, p_into_id: intoId })
  if (error) { showToast.error(`Couldn't merge: ${error.message}`); return }
  // Realtime will reconcile; do a local apply for snappiness
  set((s) => {
    const nextLabels = { ...s.labels }
    delete nextLabels[fromId]
    const nextCardLabels = {}
    for (const [cid, ids] of Object.entries(s.cardLabels)) {
      const ns = new Set(ids)
      if (ns.delete(fromId)) ns.add(intoId)
      nextCardLabels[cid] = ns
    }
    return { labels: nextLabels, cardLabels: nextCardLabels }
  })
},

archiveLabel: async (labelId) => {
  const { error } = await supabase
    .from('labels').update({ archived_at: new Date().toISOString() }).eq('id', labelId)
  if (error) { showToast.error(`Couldn't archive: ${error.message}`); return }
  set((s) => ({
    labels: { ...s.labels, [labelId]: { ...s.labels[labelId], archived_at: new Date().toISOString() } },
  }))
},

unarchiveLabel: async (labelId) => {
  const { error } = await supabase
    .from('labels').update({ archived_at: null }).eq('id', labelId)
  if (error) {
    if (error.code === '23505') {
      showToast.warn('Cannot unarchive — a label with this name already exists.')
    } else {
      showToast.error(`Couldn't unarchive: ${error.message}`)
    }
    return
  }
  set((s) => ({
    labels: { ...s.labels, [labelId]: { ...s.labels[labelId], archived_at: null } },
  }))
},
```

Ensure `showToast` is already imported at the top of `boardStore.js` (it's used elsewhere — confirm before adding).

- [ ] **Step 4: Run tests**

```
npm run test -- src/__tests__/labels.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/boardStore.js src/__tests__/labels.test.js
git commit -m "feat(labels): add boardStore actions for add/remove/rename/recolor/merge/archive"
```

---

## Task 8: Realtime subscriptions for `labels` and `card_labels`

**Files:**
- Modify: `src/store/boardStore.js`

- [ ] **Step 1: Locate existing realtime subscription**

Find the existing `supabase.channel(...).on('postgres_changes', ...)` block in `boardStore.js` that handles `cards`/`columns`/`boards`. The new subscriptions follow the same pattern.

- [ ] **Step 2: Add subscriptions inside the same channel**

Extend the existing channel chain (or add a sibling channel if the pattern is one-channel-per-table) with:

```js
.on('postgres_changes', { event: '*', schema: 'public', table: 'labels' }, (payload) => {
  set((s) => {
    if (payload.eventType === 'DELETE') {
      const next = { ...s.labels }
      delete next[payload.old.id]
      return { labels: next }
    }
    return { labels: { ...s.labels, [payload.new.id]: payload.new } }
  })
})
.on('postgres_changes', { event: '*', schema: 'public', table: 'card_labels' }, (payload) => {
  set((s) => {
    const row = payload.eventType === 'DELETE' ? payload.old : payload.new
    const cur = s.cardLabels[row.card_id] || new Set()
    const next = new Set(cur)
    if (payload.eventType === 'DELETE') next.delete(row.label_id)
    else next.add(row.label_id)
    return { cardLabels: { ...s.cardLabels, [row.card_id]: next } }
  })
})
```

- [ ] **Step 3: Manually verify with two browser tabs**

```
npm run dev
```

Open two browser tabs to the same board. In tab 1, add a label to a card. Expected: within ~500ms, tab 2 shows the label on the card. Then archive a label from the management modal (Task 12) once available — confirm both tabs reflect the change. (This step is deferred to Task 12 if the modal isn't built yet — for now, verify with direct SQL `insert into card_labels (...)` via `execute_sql` and watch the UI update.)

- [ ] **Step 4: Commit**

```bash
git add src/store/boardStore.js
git commit -m "feat(labels): wire postgres_changes subscriptions for labels and card_labels"
```

---

## Task 9: `Card.jsx` — swap to selector

**Files:**
- Modify: `src/components/board/Card.jsx`

- [ ] **Step 1: Update import**

At line 9 of `Card.jsx`, add `selectCardLabels` to the imports:

```js
import { LABEL_OUTLINE, PRIORITY_DOT } from '../../utils/formatting'
import { selectCardLabels } from '../../store/selectors'
```

- [ ] **Step 2: Replace `labels` destructure**

At line 16, change:

```js
const { title, description, labels, priority, due_date: dueDate, checklist, task_number: taskNumber, completed, icon } = card
```

to:

```js
const { title, description, priority, due_date: dueDate, checklist, task_number: taskNumber, completed, icon } = card
const labels = useBoardStore(selectCardLabels(card.id))
```

The JSX block (lines 111–137) stays byte-for-byte identical.

- [ ] **Step 3: Run dev server, verify card rendering unchanged**

```
npm run dev
```

Open a board. Cards should render as before — `/text` labels in muted gray. Click a label to confirm tap-to-toggle still flips to outline-pill rendering.

(There won't be any labels yet on cards until UI is wired — visual verification will happen in Task 11.)

- [ ] **Step 4: Commit**

```bash
git add src/components/board/Card.jsx
git commit -m "feat(labels): swap Card.jsx label source to selectCardLabels selector"
```

---

## Task 10: `LabelAutocomplete` component

**Files:**
- Create: `src/components/board/LabelAutocomplete.jsx`
- Test: `src/__tests__/labelAutocomplete.test.jsx` (new)

- [ ] **Step 1: Write the failing test**

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LabelAutocomplete from '../components/board/LabelAutocomplete'

vi.mock('../store/boardStore', () => ({
  useBoardStore: (selector) => selector({
    labels: {
      L1: { id: 'L1', board_id: 'B1', text: 'Frontend', color: 'blue',  archived_at: null },
      L2: { id: 'L2', board_id: 'B1', text: 'Backend',  color: 'green', archived_at: null },
      L3: { id: 'L3', board_id: 'B1', text: 'Bug',      color: 'red',   archived_at: null },
    },
  }),
}))

describe('LabelAutocomplete', () => {
  it('filters by case-insensitive prefix as user types', () => {
    render(<LabelAutocomplete boardId="B1" excludeIds={[]} onPick={() => {}} onCreate={() => {}} onManage={() => {}} />)
    const input = screen.getByPlaceholderText('/label')
    fireEvent.change(input, { target: { value: 'fr' } })
    expect(screen.getByText('Frontend')).toBeTruthy()
    expect(screen.queryByText('Backend')).toBeNull()
  })

  it('calls onPick when an existing label is clicked', () => {
    const onPick = vi.fn()
    render(<LabelAutocomplete boardId="B1" excludeIds={[]} onPick={onPick} onCreate={() => {}} onManage={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText('/label'), { target: { value: 'bug' } })
    fireEvent.click(screen.getByText('Bug'))
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'L3' }))
  })

  it('calls onCreate with text and color when no match exists and user hits Enter', () => {
    const onCreate = vi.fn()
    render(<LabelAutocomplete boardId="B1" excludeIds={[]} onPick={() => {}} onCreate={onCreate} onManage={() => {}} />)
    const input = screen.getByPlaceholderText('/label')
    fireEvent.change(input, { target: { value: 'NewLabel' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onCreate).toHaveBeenCalledWith('NewLabel', expect.any(String))
  })

  it('excludes labels in excludeIds', () => {
    render(<LabelAutocomplete boardId="B1" excludeIds={['L3']} onPick={() => {}} onCreate={() => {}} onManage={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText('/label'), { target: { value: 'b' } })
    expect(screen.queryByText('Bug')).toBeNull()
    expect(screen.getByText('Backend')).toBeTruthy()
  })

  it('shows Manage labels footer that calls onManage', () => {
    const onManage = vi.fn()
    render(<LabelAutocomplete boardId="B1" excludeIds={[]} onPick={() => {}} onCreate={() => {}} onManage={onManage} />)
    fireEvent.click(screen.getByText(/Manage labels/i))
    expect(onManage).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify failure**

```
npm run test -- src/__tests__/labelAutocomplete.test.jsx
```

Expected: FAIL — component doesn't exist.

- [ ] **Step 3: Implement component**

Create `src/components/board/LabelAutocomplete.jsx`:

```jsx
import { useState, useMemo, useRef, useEffect } from 'react'
import { useBoardStore } from '../../store/boardStore'
import { selectBoardLabels } from '../../store/selectors'
import { LABEL_COLORS, COLOR_DOT_CLASSES } from '../../constants/colors'

function fuzzyScore(text, query) {
  const t = text.toLowerCase()
  const q = query.toLowerCase()
  if (t.startsWith(q)) return 0
  if (t.includes(q)) return 1
  let qi = 0
  for (const ch of t) if (ch === q[qi]) qi++
  return qi === q.length ? 2 : Infinity
}

export default function LabelAutocomplete({ boardId, excludeIds = [], onPick, onCreate, onManage }) {
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const [newColor, setNewColor] = useState('blue')
  const allLabels = useBoardStore(selectBoardLabels(boardId))
  const inputRef = useRef(null)

  const filtered = useMemo(() => {
    const ex = new Set(excludeIds)
    const visible = allLabels.filter((l) => !ex.has(l.id))
    if (!query.trim()) return visible
    const scored = visible
      .map((l) => ({ l, s: fuzzyScore(l.text, query.trim()) }))
      .filter(({ s }) => s !== Infinity)
      .sort((a, b) => a.s - b.s)
    return scored.map(({ l }) => l)
  }, [allLabels, query, excludeIds])

  const exactMatch = useMemo(
    () => allLabels.find((l) => l.text.toLowerCase() === query.trim().toLowerCase()),
    [allLabels, query],
  )

  const handleEnter = () => {
    if (filtered[highlight]) {
      onPick(filtered[highlight])
    } else if (query.trim() && !exactMatch) {
      onCreate(query.trim(), newColor)
    }
    setQuery('')
    setHighlight(0)
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setHighlight(0) }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); handleEnter() }
          else if (e.key === 'ArrowDown') { setHighlight((h) => Math.min(h + 1, filtered.length - 1)) }
          else if (e.key === 'ArrowUp')   { setHighlight((h) => Math.max(h - 1, 0)) }
        }}
        placeholder="/label"
        autoFocus
        className="text-xs text-[var(--text-secondary)] lowercase bg-transparent border-none focus:outline-none w-24 placeholder-[var(--text-faint)]"
      />
      <div className="absolute z-10 top-full left-0 mt-1 min-w-[180px] bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg shadow-md overflow-hidden">
        {filtered.map((l, i) => (
          <button
            key={l.id}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { onPick(l); setQuery(''); setHighlight(0) }}
            className={`w-full flex items-center gap-2 px-2 py-1 text-xs text-left ${
              i === highlight ? 'bg-[var(--surface-hover)]' : 'hover:bg-[var(--surface-hover)]'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${COLOR_DOT_CLASSES[l.color] || ''}`} />
            <span className="text-[var(--text-secondary)] capitalize">{l.text}</span>
          </button>
        ))}
        {query.trim() && !exactMatch && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { onCreate(query.trim(), newColor); setQuery(''); setHighlight(0) }}
            className="w-full flex items-center gap-2 px-2 py-1 text-xs text-left border-t border-[var(--border-subtle)]"
          >
            <span className={`w-2 h-2 rounded-full ${COLOR_DOT_CLASSES[newColor]}`} />
            <span className="text-[var(--text-faint)]">Create</span>
            <span className="text-[var(--text-secondary)] lowercase">/{query.trim()}</span>
            <span className="ml-auto flex items-center gap-1">
              {LABEL_COLORS.map((c) => (
                <span
                  key={c}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => { e.stopPropagation(); setNewColor(c) }}
                  className={`w-2.5 h-2.5 rounded-full cursor-pointer ${COLOR_DOT_CLASSES[c]} ${
                    newColor === c ? 'ring-1 ring-[var(--text-primary)]' : ''
                  }`}
                />
              ))}
            </span>
          </button>
        )}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onManage()}
          className="w-full text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] text-left px-2 py-1 border-t border-[var(--border-subtle)]"
        >
          Manage labels…
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```
npm run test -- src/__tests__/labelAutocomplete.test.jsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/board/LabelAutocomplete.jsx src/__tests__/labelAutocomplete.test.jsx
git commit -m "feat(labels): add LabelAutocomplete with fuzzy match, create row, manage footer"
```

---

## Task 11: Wire `LabelAutocomplete` into `InlineCardEditor` and `CardDetailPanel`

**Files:**
- Modify: `src/components/board/InlineCardEditor.jsx`
- Modify: `src/components/board/CardDetailPanel.jsx`
- Modify: `src/hooks/useCardEditState.js`

- [ ] **Step 1: Update `useCardEditState` to expose `labelIds` and `pendingLabels`**

In `src/hooks/useCardEditState.js`, find the `labels` state and rename:

```js
// Before
const [labels, setLabels] = useState(card?.labels ? [...card.labels] : [])

// After
const [labelIds, setLabelIds] = useState([]) // resolved for existing card
const [pendingLabels, setPendingLabels] = useState([]) // {text, color} for new card
```

Remove `dedupLabels` import and helper if it lives here; otherwise leave the helper but stop calling it.

Update the return value to expose `labelIds, setLabelIds, pendingLabels, setPendingLabels` instead of `labels, setLabels`.

Update the `formDataRef` initializer to remove the `labels` field.

- [ ] **Step 2: Update `InlineCardEditor.jsx`**

At the destructure from `useCardEditState` (around line 38), replace `labels, setLabels` with `pendingLabels, setPendingLabels`.

Replace the entire labels row (lines 182–236) with:

```jsx
<div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] flex-wrap">
  {pendingLabels.map((label, idx) => (
    <span key={`${label.text}-${idx}`} className="relative inline-flex items-center group/label">
      <span className="font-medium text-[var(--text-secondary)] lowercase">/{label.text}</span>
      <button
        type="button"
        onClick={() => setPendingLabels(pendingLabels.filter((_, i) => i !== idx))}
        className="ml-0.5 opacity-0 group-hover/label:opacity-100 text-[var(--text-faint)] hover:text-[var(--color-copper)] transition-opacity"
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  ))}
  {openMenu === 'label' ? (
    <LabelAutocomplete
      boardId={card?.board_id || activeBoardId}
      excludeIds={[]}
      onPick={(l) => {
        setPendingLabels([...pendingLabels, { text: l.text, color: l.color }])
        setOpenMenu(null)
      }}
      onCreate={(text, color) => {
        setPendingLabels([...pendingLabels, { text, color }])
        setOpenMenu(null)
      }}
      onManage={() => { setOpenMenu(null); openLabelManager() }}
    />
  ) : (
    <button
      type="button"
      onClick={() => setOpenMenu('label')}
      className="text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors"
      data-menu-root
    >
      <Plus className="w-3 h-3" />
    </button>
  )}
</div>
```

Add to the component's save flow (where `createCard` is called):

```js
const newCardId = await createCard({ ...payload })
for (const pending of pendingLabels) {
  await addLabelToCard(newCardId, pending.text, pending.color)
}
```

`addLabelToCard` is destructured from `useBoardStore`. `openLabelManager` is a placeholder for the modal opener — wire it in Task 13.

- [ ] **Step 3: Update `CardDetailPanel.jsx`**

For an existing card, replace the labels block (lines 233–339) with:

```jsx
<div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
  {labels.map((l) => (
    <span
      key={l.id}
      className="relative inline-flex items-center align-middle leading-tight flex-shrink-0 bg-[var(--surface-hover)] text-[var(--text-secondary)] h-6 px-2 rounded-lg text-xs lowercase group/label"
    >
      /{l.text}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); removeLabelFromCard(card.id, l.id) }}
        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--surface-card)] border-0.5 border-[var(--border-default)] flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] opacity-0 group-hover/label:opacity-100 transition-all"
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  ))}
  {showLabelForm ? (
    <LabelAutocomplete
      boardId={card.board_id}
      excludeIds={labels.map((l) => l.id)}
      onPick={(l) => { addLabelToCard(card.id, l.text, l.color); setShowLabelForm(false) }}
      onCreate={(text, color) => { addLabelToCard(card.id, text, color); setShowLabelForm(false) }}
      onManage={() => { setShowLabelForm(false); openLabelManager() }}
    />
  ) : (
    <button
      type="button"
      onClick={() => setShowLabelForm(true)}
      className={`inline-flex items-center flex-shrink-0 h-6 rounded-lg text-[var(--text-faint)] hover:text-[var(--text-muted)] hover:bg-[var(--surface-hover)] transition-colors ${
        labels.length === 0 ? 'gap-1 px-2 text-xs' : 'justify-center w-6'
      }`}
    >
      <Plus className="w-3.5 h-3.5" />
      {labels.length === 0 && <span>Labels</span>}
    </button>
  )}
</div>
```

Update `labels` source: `const labels = useBoardStore(selectCardLabels(card.id))`.

Remove `dedupLabels` helper and all `editingLabelIdx` / `editingLabelText` / `newLabelColor` state — they're replaced by the autocomplete.

Add `addLabelToCard, removeLabelFromCard` destructured from `useBoardStore`. Add `openLabelManager` placeholder.

- [ ] **Step 4: Run existing component tests**

```
npm run test
```

Expected: PASS. If any test (e.g., `hooks.useCardEditState.test.js`) asserts on the old `labels` state field, update it to `labelIds`/`pendingLabels`.

- [ ] **Step 5: Manually verify in browser**

```
npm run dev
```

- Open a board, create a new card, click `+` on the labels row, type "/test", press Enter — label appears.
- Open the new card in detail panel — label is rendered as a chip with the autocomplete-picked color.
- Click `+` in detail panel labels row, type partial of an existing label, watch dropdown filter, click to attach.
- Hover an existing chip, click `×` — label detaches.

Refresh the page — labels persist.

- [ ] **Step 6: Commit**

```bash
git add src/components/board/InlineCardEditor.jsx src/components/board/CardDetailPanel.jsx src/hooks/useCardEditState.js
git commit -m "feat(labels): wire LabelAutocomplete into InlineCardEditor and CardDetailPanel"
```

---

## Task 12: `LabelManagerModal`

**Files:**
- Create: `src/components/board/LabelManagerModal.jsx`

- [ ] **Step 1: Implement the modal**

Create `src/components/board/LabelManagerModal.jsx`:

```jsx
import { useState, useMemo } from 'react'
import { X, Plus, DotsThreeVertical } from '@phosphor-icons/react'
import Modal from '../ui/Modal'
import Menu from '../ui/Menu'
import { useBoardStore } from '../../store/boardStore'
import { selectBoardLabels } from '../../store/selectors'
import { LABEL_COLORS, COLOR_DOT_CLASSES } from '../../constants/colors'

export default function LabelManagerModal({ open, onClose, boardId }) {
  const [showArchived, setShowArchived] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [newText, setNewText] = useState('')
  const [newColor, setNewColor] = useState('blue')
  const [mergePicker, setMergePicker] = useState(null) // {fromLabel}
  const [renameId, setRenameId] = useState(null)
  const [renameText, setRenameText] = useState('')

  const allLabels = useBoardStore((s) => {
    const out = []
    for (const id in s.labels) {
      const l = s.labels[id]
      if (l.board_id === boardId && (showArchived || !l.archived_at)) out.push(l)
    }
    out.sort((a, b) => a.text.toLowerCase().localeCompare(b.text.toLowerCase()))
    return out
  })

  const usageById = useBoardStore((s) => {
    const counts = {}
    for (const cid in s.cardLabels) {
      for (const lid of s.cardLabels[cid]) counts[lid] = (counts[lid] || 0) + 1
    }
    return counts
  })

  const {
    renameLabel, updateLabelColor, mergeLabels, archiveLabel, unarchiveLabel,
  } = useBoardStore.getState()

  const addNewLabel = async () => {
    const t = newText.trim()
    if (!t) return
    const supabase = (await import('../../lib/supabase')).supabase
    await supabase.rpc('upsert_label', { p_board_id: boardId, p_text: t, p_color: newColor })
    setNewText(''); setNewOpen(false)
  }

  return (
    <Modal open={open} onClose={onClose} contentClassName="max-w-md">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-[var(--text-primary)]">Labels</h2>
          <button onClick={onClose} className="text-[var(--text-faint)] hover:text-[var(--text-primary)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-[var(--border-subtle)]">
          {allLabels.map((l) => (
            <div key={l.id} className={`flex items-center gap-3 py-2 ${l.archived_at ? 'opacity-50' : ''}`}>
              <Menu
                trigger={
                  <button className={`w-3 h-3 rounded-full cursor-pointer ${COLOR_DOT_CLASSES[l.color] || ''}`} />
                }
              >
                {LABEL_COLORS.map((c) => (
                  <Menu.Item key={c} onClick={() => updateLabelColor(l.id, c)}>
                    <span className={`inline-block w-3 h-3 rounded-full mr-2 ${COLOR_DOT_CLASSES[c]}`} />
                    {c}
                  </Menu.Item>
                ))}
              </Menu>

              {renameId === l.id ? (
                <input
                  value={renameText}
                  onChange={(e) => setRenameText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { renameLabel(l.id, renameText); setRenameId(null) }
                    else if (e.key === 'Escape') { setRenameId(null) }
                  }}
                  onBlur={() => { renameLabel(l.id, renameText); setRenameId(null) }}
                  autoFocus
                  className="text-sm text-[var(--text-primary)] bg-transparent border-b border-[var(--border-default)] focus:outline-none flex-1"
                />
              ) : (
                <button
                  onClick={() => { setRenameId(l.id); setRenameText(l.text) }}
                  className="text-sm text-[var(--text-primary)] flex-1 text-left hover:underline"
                >
                  /{l.text}
                </button>
              )}

              <span className="text-xs text-[var(--text-faint)]">{usageById[l.id] || 0}</span>

              <Menu trigger={
                <button className="text-[var(--text-faint)] hover:text-[var(--text-primary)]">
                  <DotsThreeVertical className="w-4 h-4" />
                </button>
              }>
                {!l.archived_at && (
                  <>
                    <Menu.Item onClick={() => setMergePicker({ fromLabel: l })}>Merge into…</Menu.Item>
                    <Menu.Item onClick={() => archiveLabel(l.id)} destructive>Archive</Menu.Item>
                  </>
                )}
                {l.archived_at && (
                  <Menu.Item onClick={() => unarchiveLabel(l.id)}>Unarchive</Menu.Item>
                )}
              </Menu>
            </div>
          ))}
        </div>

        {newOpen ? (
          <div className="mt-3 flex items-center gap-2">
            <input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addNewLabel(); if (e.key === 'Escape') setNewOpen(false) }}
              placeholder="label name"
              autoFocus
              className="flex-1 text-sm text-[var(--text-primary)] bg-transparent border-b border-[var(--border-default)] focus:outline-none"
            />
            <div className="flex items-center gap-1">
              {LABEL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={`w-3 h-3 rounded-full ${COLOR_DOT_CLASSES[c]} ${newColor === c ? 'ring-1 ring-[var(--text-primary)]' : ''}`}
                />
              ))}
            </div>
            <button onClick={addNewLabel} className="text-xs text-[var(--accent-lime-dark)]">Add</button>
          </div>
        ) : (
          <button
            onClick={() => setNewOpen(true)}
            className="mt-3 flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <Plus className="w-3 h-3" /> New label
          </button>
        )}

        <label className="mt-4 flex items-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived
        </label>

        {mergePicker && (
          <Modal open onClose={() => setMergePicker(null)} contentClassName="max-w-xs">
            <div className="p-3">
              <div className="text-sm mb-2 text-[var(--text-primary)]">Merge /{mergePicker.fromLabel.text} into…</div>
              <div className="divide-y divide-[var(--border-subtle)] max-h-64 overflow-auto">
                {allLabels
                  .filter((l) => l.id !== mergePicker.fromLabel.id && !l.archived_at)
                  .map((l) => (
                    <button
                      key={l.id}
                      onClick={() => { mergeLabels(mergePicker.fromLabel.id, l.id); setMergePicker(null) }}
                      className="w-full flex items-center gap-2 px-2 py-1 text-xs text-left hover:bg-[var(--surface-hover)]"
                    >
                      <span className={`w-2 h-2 rounded-full ${COLOR_DOT_CLASSES[l.color]}`} />
                      /{l.text}
                    </button>
                  ))}
              </div>
            </div>
          </Modal>
        )}
      </div>
    </Modal>
  )
}
```

- [ ] **Step 2: Run lint**

```
npm run lint
```

Expected: PASS. (May need to add unused-imports config; fix any errors inline.)

- [ ] **Step 3: Commit**

```bash
git add src/components/board/LabelManagerModal.jsx
git commit -m "feat(labels): add LabelManagerModal with rename/merge/archive/recolor"
```

---

## Task 13: Wire `LabelManagerModal` into Board page and autocomplete

**Files:**
- Modify: `src/pages/BoardsPage.jsx` (or wherever the board page lives — verify via `grep -rn "activeBoardId" src/pages/`)
- Modify: `src/components/board/InlineCardEditor.jsx`
- Modify: `src/components/board/CardDetailPanel.jsx`
- Modify: `src/components/board/Board.jsx` (if board header menu lives there)

- [ ] **Step 1: Identify the board header menu**

```bash
grep -rn "Menu" src/components/board/ src/pages/ | grep -i "board\|header" | head -20
```

Find the existing dropdown/menu on the board page (e.g., a `⋯` near the board name with "Rename", "Delete", etc.).

- [ ] **Step 2: Add "Manage labels…" menu item**

In the identified file, add a `Menu.Item`:

```jsx
<Menu.Item onClick={() => setLabelManagerOpen(true)}>Manage labels…</Menu.Item>
```

Add state `const [labelManagerOpen, setLabelManagerOpen] = useState(false)` and render:

```jsx
<LabelManagerModal
  open={labelManagerOpen}
  onClose={() => setLabelManagerOpen(false)}
  boardId={activeBoardId}
/>
```

- [ ] **Step 3: Make `openLabelManager` real in `InlineCardEditor` and `CardDetailPanel`**

Replace the placeholder `openLabelManager` from Task 11 with a prop passed down from the parent (the board page). Pattern:

```jsx
// In the board page
<LabelManagerModal ... />
<Column
  ...
  onOpenLabelManager={() => setLabelManagerOpen(true)}
/>

// Then thread it through to InlineCardEditor and CardDetailPanel as a prop
```

If threading is painful (more than 2 levels of prop drilling), promote `labelManagerOpen` into Zustand `settingsStore` or a tiny new UI store. **Default: prop drilling. Promote only if it bothers you.**

- [ ] **Step 4: Manually verify in browser**

```
npm run dev
```

- Open a board, click the board header menu → click "Manage labels…" → modal opens.
- Rename a label → reflected on cards.
- Merge two labels → both ends reflect in cards.
- Archive a label → disappears from autocomplete; cards keep the chip (now hidden because `selectCardLabels` filters archived).
- Click "Manage labels…" footer in the autocomplete → same modal opens.

- [ ] **Step 5: Commit**

```bash
git add src/pages/BoardsPage.jsx src/components/board/InlineCardEditor.jsx src/components/board/CardDetailPanel.jsx src/components/board/Board.jsx
git commit -m "feat(labels): wire LabelManagerModal into board header and autocomplete footer"
```

---

## Task 14: Update `cardFilters`, schemas, color constants

**Files:**
- Modify: `src/utils/cardFilters.js`
- Modify: `src/utils/schemas.js`
- Modify: `src/constants/colors.js`
- Test: `src/__tests__/cardFilters.test.js`, `src/__tests__/schemas.test.js`

- [ ] **Step 1: Update `cardFilters.js`**

Change line 17 from:

```js
if (filters.label?.length && !(card.labels || []).some((l) => filters.label.includes(l.text))) return false
```

to:

```js
if (filters.label?.length) {
  // labelTexts is precomputed by the caller from state.cardLabels and state.labels
  if (!card._labelTexts?.some((t) => filters.label.includes(t))) return false
}
```

Update the caller (search for usage of `cardFilters`) to pre-attach `_labelTexts` to each card before filtering:

```js
const labelsByCard = (cardId) => {
  const ids = state.cardLabels[cardId] || new Set()
  return [...ids].map((id) => state.labels[id]?.text).filter(Boolean)
}

const enriched = cards.map((c) => ({ ...c, _labelTexts: labelsByCard(c.id) }))
const filtered = enriched.filter(filterPredicate(filters))
```

- [ ] **Step 2: Update `cardFilters.test.js`**

Read existing tests; rewrite assertions that built `card.labels = [{text,color}]` to instead build `card._labelTexts = ['bug']`.

- [ ] **Step 3: Update `schemas.js`**

```js
// Drop these from card schemas (lines 23 and 39):
labels: z.array(z.object({ text: z.string(), color: z.string() })).default([]),
labels: z.array(z.object({ text: z.string(), color: z.string() })).optional(),

// Add new schemas:
export const labelSchema = z.object({
  id: z.string(),
  board_id: z.string(),
  text: z.string().min(1).max(64),
  color: z.enum(['red','orange','yellow','green','blue','purple','pink','gray']),
  created_at: z.string(),
  archived_at: z.string().nullable(),
})

export const cardLabelSchema = z.object({
  card_id: z.string(),
  label_id: z.string(),
  position: z.number().int().default(0),
  created_at: z.string(),
})
```

Update `src/__tests__/schemas.test.js` to add cases for `labelSchema` and remove `labels` from card-schema cases.

- [ ] **Step 4: Update `colors.js`**

In `src/constants/colors.js` line 8, change:

```js
export const LABEL_COLORS = ['neutral', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray']
```

to:

```js
export const LABEL_COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray']
```

Also remove the `neutral` entry from `COLOR_DOT_CLASSES` (if present). Grep for `'neutral'` everywhere — anywhere it's referenced as a label color, remove or replace with `'gray'`.

- [ ] **Step 5: Run all tests**

```
npm run test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/utils/cardFilters.js src/utils/schemas.js src/constants/colors.js src/__tests__/
git commit -m "feat(labels): update cardFilters, schemas, drop neutral from LABEL_COLORS"
```

---

## Task 15: AI edge function — system prompt labels block

**Files:**
- Modify: `supabase/functions/chat/context.ts`

- [ ] **Step 1: Locate the parallel fetch block**

Read `supabase/functions/chat/context.ts` around the existing `Promise.all([ ... ])` that pulls boards/columns/cards/notes/members.

- [ ] **Step 2: Add the labels query**

Append to the `Promise.all` array:

```ts
supabase
  .from('labels')
  .select('id, board_id, text, color')
  .in('board_id', userBoardIds)
  .is('archived_at', null)
```

Destructure the result as `labels` (or whatever naming the file uses).

- [ ] **Step 3: Add the prompt block per board**

In the prompt-assembly function, where each board's columns are rendered, add an extra line:

```ts
const boardLabels = labels.filter((l) => l.board_id === board.id)
if (boardLabels.length > 0) {
  prompt += `  Labels: ${boardLabels.map((l) => `/${l.text} (${l.color})`).join(', ')}\n`
}
```

- [ ] **Step 4: Add the new instruction rules**

Find the hard-coded instruction list (search for "REPLACES the array"). Append:

```
- Labels are per-board entities. The current labels on each board are listed above. When attaching a label that already exists on a board, pass its exact text — the server matches case-insensitively, so don't worry about casing. Only invent a new label name when none of the existing labels fit the user's intent. Never invent stylistic variants (e.g. /front-end when /frontend exists).
- When you create a new label by passing a previously-unseen text, the server assigns its color deterministically. The `labels` field in your tool schemas is now an array of strings (label texts), not objects.
```

- [ ] **Step 5: Type-check**

```
deno check supabase/functions/chat/context.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/chat/context.ts
git commit -m "feat(chat): expose board label inventory in system prompt and add reuse rules"
```

---

## Task 16: AI edge function — change `labels` tool schema and add resolver

**Files:**
- Modify: `supabase/functions/chat/tools.ts`
- Modify: `supabase/functions/chat/index.ts`

- [ ] **Step 1: Update `tools.ts` schema**

In `supabase/functions/chat/tools.ts`, find every `labels:` schema (4 occurrences across `create_card`, `update_card`, `update_cards`, `duplicate_card`). Replace each with:

```ts
labels: {
  type: "array",
  items: { type: "string" },
  description: "Label texts. The server matches case-insensitively against existing labels on the board; unseen texts create a new label with a deterministic color."
}
```

Remove any `LABELS_COLOR_ENUM` or color enum array if it exists at the top of the file (it's no longer referenced).

- [ ] **Step 2: Add `resolveAndSyncLabels` helper in `index.ts`**

Near the top of the file (after imports, before the request handler), add:

```ts
async function resolveAndSyncLabels(supabase: SupabaseClient, cardId: string, boardId: string, texts: string[] | undefined) {
  if (texts === undefined) return
  const resolvedIds: string[] = []
  for (const text of texts ?? []) {
    if (!text || !text.trim()) continue
    const { data, error } = await supabase.rpc('upsert_label', { p_board_id: boardId, p_text: text })
    if (error) throw error
    resolvedIds.push(data)
  }
  if (resolvedIds.length === 0) {
    await supabase.from('card_labels').delete().eq('card_id', cardId)
  } else {
    await supabase
      .from('card_labels')
      .delete()
      .eq('card_id', cardId)
      .not('label_id', 'in', `(${resolvedIds.join(',')})`)
    await supabase
      .from('card_labels')
      .upsert(resolvedIds.map((label_id) => ({ card_id: cardId, label_id })), { onConflict: 'card_id,label_id' })
  }
}
```

- [ ] **Step 3: Call `resolveAndSyncLabels` from each card-mutation tool handler**

In the tool-execution branch for `create_card`:

```ts
// after card insert returns newCard
await resolveAndSyncLabels(supabase, newCard.id, newCard.board_id, input.labels)
```

For `update_card` and `update_cards`, the same call but with the existing card's id/board_id.

For `duplicate_card`, after the new card is created, copy labels from the source card via direct `insert into card_labels select ?, label_id from card_labels where card_id = ?`.

- [ ] **Step 4: Type-check**

```
deno check supabase/functions/chat/index.ts supabase/functions/chat/tools.ts
```

Expected: PASS.

- [ ] **Step 5: Deploy edge function**

```
mcp__plugin_supabase_supabase__deploy_edge_function with name="chat"
```

Or via CLI:

```bash
supabase functions deploy chat
```

- [ ] **Step 6: Smoke-test via chat UI**

```
npm run dev
```

- Open the chat surface (or pill on a board).
- Send: "add a label /smoke-test to this card titled X".
- Confirm the label appears via `mcp__plugin_supabase_supabase__execute_sql`:
  ```sql
  select l.text, l.color from labels l
  join card_labels cl on cl.label_id = l.id
  join cards c on c.id = cl.card_id
  where c.title = 'X';
  ```
- Re-send the same request. Confirm only one `card_labels` row exists (idempotency).
- Open chat logs: `mcp__plugin_supabase_supabase__get_logs` with `service="edge-function"`. Confirm no errors. Confirm the system prompt includes the `Labels:` line.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/chat/tools.ts supabase/functions/chat/index.ts
git commit -m "feat(chat): switch labels tool arg to Array<string>, add resolveAndSyncLabels"
```

---

## Task 17: End-to-end verification

- [ ] **Step 1: Full test suite**

```
npm run test
```

Expected: PASS, no skips beyond pre-existing.

- [ ] **Step 2: Lint**

```
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Build**

```
npm run build
```

Expected: PASS (no type/syntax errors).

- [ ] **Step 4: Browser walk-through (golden paths)**

```
npm run dev
```

1. Create a new card, add labels via autocomplete (one new, one create-from-text), save.
2. Open card in detail panel — both labels render. Tap a label to toggle render style — still works.
3. Open another card on the same board — autocomplete suggests the just-created labels.
4. Open board header → Manage labels → rename one, change another's color, archive a third.
5. Reload page — state survives.
6. In a second tab, attach a label to a card via SQL or the chat → tab 1 picks it up via realtime.
7. Chat: "add /test to all cards on this board" — `update_cards` resolves correctly; cards reflect.
8. Pill: "add /design label" on a board page — fires `create_card` or `update_card` with the new schema.

- [ ] **Step 5: Run advisors one more time**

```
mcp__plugin_supabase_supabase__get_advisors with type="security"
mcp__plugin_supabase_supabase__get_advisors with type="performance"
```

Expected: no new findings since the labels rework.

- [ ] **Step 6: Final commit (if any small fixes from walkthrough)**

```bash
git add -A
git commit -m "chore(labels): post-rework polish and verification fixes"
```

---

## Self-Review Notes

This plan was self-reviewed after writing:

- **Spec coverage check:** Every numbered section in the spec has at least one task — section 4 (schema) → Task 1; section 5.1–5.3 (RPCs) → Tasks 2, 3; section 5.4 (direct writes) → Task 7; section 6 (frontend) → Tasks 5, 6, 7, 8, 9, 10, 11, 12, 13; section 7 (AI) → Tasks 15, 16; section 8 (verification) → distributed plus Task 17.
- **Type consistency:** Selector names (`selectCardLabels`, `selectBoardLabels`, `selectBoardLabelByText`), store action names (`addLabelToCard`, `removeLabelFromCard`, `renameLabel`, `updateLabelColor`, `mergeLabels`, `archiveLabel`, `unarchiveLabel`), and RPC names (`upsert_label`, `attach_label_by_text`, `merge_labels`) are consistent across all tasks.
- **Empty-array Postgres bug:** Task 16 Step 2's `resolveAndSyncLabels` handles the empty `resolvedIds` case explicitly (the bug caught in the spec self-review).
- **Migration via MCP:** Every schema-changing task uses `mcp__plugin_supabase_supabase__apply_migration` rather than CLI, per the user's instruction.
- **Visual surface preserved:** Task 9 (`Card.jsx`) keeps the JSX block byte-for-byte; the only change is the data source.
