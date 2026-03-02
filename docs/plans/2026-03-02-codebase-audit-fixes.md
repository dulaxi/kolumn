# Codebase Audit Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all bugs found in the codebase audit — Supabase security/performance advisors + 6 frontend bugs.

**Architecture:** Two independent workstreams: (1) a single Supabase migration fixing all DB issues, (2) targeted edits to 4 frontend files. No test suite exists — verify with `npm run build`.

**Tech Stack:** Supabase (Postgres, RLS), React 19, Zustand, Vite

---

## Task 1: Supabase Migration — Fix Functions, Add Indexes, Fix RLS Policies

**Files:**
- Apply via Supabase MCP `apply_migration` tool

**Step 1: Apply the migration**

Use `mcp__supabase__apply_migration` with name `security_and_performance_fixes` and this SQL:

```sql
-- =====================================================
-- 1. FIX FUNCTION SEARCH PATHS (5 functions)
-- =====================================================

-- 1a. handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1b. handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

-- 1c. handle_new_board
CREATE OR REPLACE FUNCTION public.handle_new_board()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
begin
  insert into public.board_members (board_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

-- 1d. handle_invitation_on_signup
CREATE OR REPLACE FUNCTION public.handle_invitation_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
declare
  inv record;
begin
  for inv in
    select * from public.board_invitations
    where invited_email = new.email and status = 'pending'
  loop
    insert into public.board_members (board_id, user_id, role)
    values (inv.board_id, new.id, 'member')
    on conflict do nothing;

    update public.board_invitations
    set status = 'accepted'
    where id = inv.id;
  end loop;
  return new;
end;
$$;

-- 1e. get_my_board_ids
CREATE OR REPLACE FUNCTION public.get_my_board_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  select board_id from public.board_members where user_id = (select auth.uid());
$$;

-- =====================================================
-- 2. ADD MISSING INDEXES (8 foreign keys)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_board_members_user_id ON public.board_members(user_id);
CREATE INDEX IF NOT EXISTS idx_boards_owner_id ON public.boards(owner_id);
CREATE INDEX IF NOT EXISTS idx_columns_board_id ON public.columns(board_id);
CREATE INDEX IF NOT EXISTS idx_cards_board_id ON public.cards(board_id);
CREATE INDEX IF NOT EXISTS idx_cards_column_id ON public.cards(column_id);
CREATE INDEX IF NOT EXISTS idx_cards_assignee_id ON public.cards(assignee_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_board_invitations_invited_by ON public.board_invitations(invited_by);

-- =====================================================
-- 3. FIX RLS POLICIES — replace auth.uid() with (select auth.uid())
-- =====================================================

-- 3a. profiles (2 policies)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (select auth.uid()));

-- 3b. boards (3 policies)
DROP POLICY IF EXISTS "Authenticated users can create boards" ON public.boards;
CREATE POLICY "Authenticated users can create boards" ON public.boards
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "Board owners can delete boards" ON public.boards;
CREATE POLICY "Board owners can delete boards" ON public.boards
  FOR DELETE TO authenticated
  USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "Board owners can update boards" ON public.boards;
CREATE POLICY "Board owners can update boards" ON public.boards
  FOR UPDATE TO authenticated
  USING (owner_id = (select auth.uid()));

-- 3c. board_members (2 policies)
DROP POLICY IF EXISTS "Board owners can manage members" ON public.board_members;
CREATE POLICY "Board owners can manage members" ON public.board_members
  FOR INSERT TO authenticated
  WITH CHECK (
    board_id IN (SELECT id FROM public.boards WHERE owner_id = (select auth.uid()))
    OR user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Board owners can remove members" ON public.board_members;
CREATE POLICY "Board owners can remove members" ON public.board_members
  FOR DELETE TO authenticated
  USING (
    board_id IN (SELECT id FROM public.boards WHERE owner_id = (select auth.uid()))
    OR user_id = (select auth.uid())
  );

-- 3d. notes (4 policies)
DROP POLICY IF EXISTS "Users can create own notes" ON public.notes;
CREATE POLICY "Users can create own notes" ON public.notes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own notes" ON public.notes;
CREATE POLICY "Users can view own notes" ON public.notes
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own notes" ON public.notes;
CREATE POLICY "Users can update own notes" ON public.notes
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own notes" ON public.notes;
CREATE POLICY "Users can delete own notes" ON public.notes
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- 3e. board_invitations (4 policies)
DROP POLICY IF EXISTS "Board owners can create invitations" ON public.board_invitations;
CREATE POLICY "Board owners can create invitations" ON public.board_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    board_id IN (SELECT id FROM public.boards WHERE owner_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "Board owners can view invitations" ON public.board_invitations;
CREATE POLICY "Board owners can view invitations" ON public.board_invitations
  FOR SELECT TO authenticated
  USING (
    board_id IN (SELECT id FROM public.boards WHERE owner_id = (select auth.uid()))
    OR invited_email = (SELECT email FROM auth.users WHERE id = (select auth.uid()))::text
  );

DROP POLICY IF EXISTS "Board owners can update invitations" ON public.board_invitations;
CREATE POLICY "Board owners can update invitations" ON public.board_invitations
  FOR UPDATE TO authenticated
  USING (
    board_id IN (SELECT id FROM public.boards WHERE owner_id = (select auth.uid()))
    OR invited_email = (SELECT email FROM auth.users WHERE id = (select auth.uid()))::text
  );

DROP POLICY IF EXISTS "Board owners can delete invitations" ON public.board_invitations;
CREATE POLICY "Board owners can delete invitations" ON public.board_invitations
  FOR DELETE TO authenticated
  USING (
    board_id IN (SELECT id FROM public.boards WHERE owner_id = (select auth.uid()))
  );
```

**Step 2: Verify migration applied**

Run: `mcp__supabase__get_advisors` for both `security` and `performance` types.
Expected: The 5 `function_search_path_mutable` warnings should be gone. The `auth_rls_initplan` warnings should be gone. The `unindexed_foreign_keys` warnings should be gone.

---

## Task 2: Fix CardDetailPanel ESC Handler Stale Closure

**Files:**
- Modify: `src/components/board/CardDetailPanel.jsx:1,118-126`

**Step 1: Add `useRef` and `useCallback` to imports**

Change line 1 from:
```jsx
import { useState, useEffect } from 'react'
```
to:
```jsx
import { useState, useEffect, useRef, useCallback } from 'react'
```

**Step 2: Replace the stale ESC handler with a ref-based approach**

Replace the ESC key useEffect (lines 118-126):
```jsx
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleSaveAndClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [title, description, assignee, priority, dueDate, labels, checklist])
```

with a ref + stable effect:
```jsx
  const saveAndCloseRef = useRef(handleSaveAndClose)
  useEffect(() => {
    saveAndCloseRef.current = handleSaveAndClose
  })

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        saveAndCloseRef.current()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])
```

**Step 3: Also add error handling to board members fetch (Bug 6)**

Replace lines 104-114:
```jsx
      // Fetch board members
      supabase
        .from('board_members')
        .select('profiles(display_name)')
        .eq('board_id', card.board_id)
        .then(({ data }) => {
          const names = (data || [])
            .map((m) => m.profiles?.display_name)
            .filter(Boolean)
          setBoardMemberNames(names)
        })
```

with:
```jsx
      // Fetch board members
      supabase
        .from('board_members')
        .select('profiles(display_name)')
        .eq('board_id', card.board_id)
        .then(({ data, error }) => {
          if (error) {
            console.error('Failed to fetch board members:', error)
            return
          }
          const names = (data || [])
            .map((m) => m.profiles?.display_name)
            .filter(Boolean)
          setBoardMemberNames(names)
        })
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Builds successfully with no new warnings.

---

## Task 3: Fix BoardView Drag Race Condition

**Files:**
- Modify: `src/components/board/BoardView.jsx:202,273-278`

**Step 1: Add null guard to DragOverlay**

Replace lines 273-279:
```jsx
      <DragOverlay>
        {activeCard ? (
          <div className="rotate-2 opacity-90">
            <Card card={activeCard} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
```

with:
```jsx
      <DragOverlay>
        {activeCardId && activeCard ? (
          <div className="rotate-2 opacity-90">
            <Card card={activeCard} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
```

**Step 2: Add null guard to handleDragEnd**

In `handleDragEnd` (line 128), after `const activeId = active.id` (line 141), the `findCol` call on line 145 already returns null and we handle it. But add a guard for the card existing:

After line 141 `const activeId = active.id`, add:
```jsx
      const activeCardExists = useBoardStore.getState().cards[activeId]
      if (!activeCardExists) {
        persistCardPositions([...affectedCardsRef.current])
        affectedCardsRef.current = new Set()
        return
      }
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Builds successfully.

---

## Task 4: Fix boardStore Error Handling (moveCard + addCard)

**Files:**
- Modify: `src/store/boardStore.js:242-246,346-355,387-390`

**Step 1: Fix addCard — handle next_task_number increment error**

Replace lines 242-246:
```js
    // Increment board task number
    await supabase
      .from('boards')
      .update({ next_task_number: taskNumber + 1 })
      .eq('id', boardId)
```

with:
```js
    // Increment board task number
    const { error: numError } = await supabase
      .from('boards')
      .update({ next_task_number: taskNumber + 1 })
      .eq('id', boardId)

    if (numError) {
      console.error('Failed to increment task number:', numError)
    }
```

**Step 2: Fix moveCard — add try/catch to DB batch updates (same-column)**

Replace lines 352-355:
```js
        // Update positions in DB
        for (const { id, position } of dbBatch) {
          await supabase.from('cards').update({ position }).eq('id', id)
        }
```

with:
```js
        // Update positions in DB
        for (const { id, position } of dbBatch) {
          const { error } = await supabase.from('cards').update({ position }).eq('id', id)
          if (error) console.error('Failed to update card position:', error)
        }
```

**Step 3: Fix moveCard — add try/catch to DB batch updates (cross-column)**

Replace lines 387-390:
```js
      for (const update of dbBatch) {
        const { id, ...rest } = update
        await supabase.from('cards').update(rest).eq('id', id)
      }
```

with:
```js
      for (const update of dbBatch) {
        const { id, ...rest } = update
        const { error } = await supabase.from('cards').update(rest).eq('id', id)
        if (error) console.error('Failed to update card position:', error)
      }
```

**Step 4: Fix persistCardPositions — add error handling**

Replace lines 446-458:
```js
  persistCardPositions: async (cardIds) => {
    const state = get()
    for (const cardId of cardIds) {
      const card = state.cards[cardId]
      if (card) {
        await supabase.from('cards').update({
          column_id: card.column_id,
          position: card.position,
          completed: card.completed,
        }).eq('id', cardId)
      }
    }
  },
```

with:
```js
  persistCardPositions: async (cardIds) => {
    const state = get()
    for (const cardId of cardIds) {
      const card = state.cards[cardId]
      if (card) {
        const { error } = await supabase.from('cards').update({
          column_id: card.column_id,
          position: card.position,
          completed: card.completed,
        }).eq('id', cardId)
        if (error) console.error('Failed to persist card position:', error)
      }
    }
  },
```

**Step 5: Verify build**

Run: `npm run build`
Expected: Builds successfully.

---

## Task 5: Fix InlineCardEditor — Don't Delete Card on Empty Title

**Files:**
- Modify: `src/components/board/InlineCardEditor.jsx:71-85`

**Step 1: Replace delete-on-empty-title with keep-previous-title**

Replace lines 71-85:
```jsx
  const handleSave = () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      deleteCard(cardId)
    } else {
      updateCard(cardId, {
        title: trimmedTitle,
        assignee_name: assignee.trim(),
        priority,
        due_date: dueDate || null,
        labels,
      })
    }
    onDone()
  }
```

with:
```jsx
  const handleSave = () => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      // Keep the card with its existing title (or 'Untitled task' for new cards)
      onDone()
      return
    }
    updateCard(cardId, {
      title: trimmedTitle,
      assignee_name: assignee.trim(),
      priority,
      due_date: dueDate || null,
      labels,
    })
    onDone()
  }
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Builds successfully.

---

## Task 6: Final Build Verification + Commit

**Step 1: Run final build**

Run: `npm run build`
Expected: Builds successfully, no regressions.

**Step 2: Commit all changes**

```bash
git add src/components/board/CardDetailPanel.jsx src/components/board/BoardView.jsx src/store/boardStore.js src/components/board/InlineCardEditor.jsx
git commit -m "fix: resolve audit bugs — stale closures, race conditions, error handling, empty-title deletion"
```

Note: The Supabase migration is applied via MCP and doesn't need a local commit (it's tracked by Supabase's migration system).
