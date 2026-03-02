# Codebase Audit & Fix Design

**Date:** 2026-03-02
**Goal:** Fix all real bugs, apply Supabase security/performance advisors, ship stable app.

## Workstream 1: Supabase Migration

Single migration to fix all DB-level issues:

### Security: Mutable search_path (5 functions)
Set `search_path = ''` on:
- `handle_updated_at`
- `handle_new_user`
- `handle_new_board`
- `handle_invitation_on_signup`
- `get_my_board_ids`

### Performance: Missing indexes (8 foreign keys)
Add indexes on:
- `board_members.user_id`
- `boards.owner_id`
- `columns.board_id`
- `cards.board_id`, `cards.column_id`, `cards.assignee_id`
- `notes.user_id`
- `board_invitations.invited_by`

### Performance: RLS initplan (~22 policies)
Replace `auth.uid()` with `(select auth.uid())` in all RLS policies across:
- `profiles` (2 policies)
- `boards` (3 policies)
- `board_members` (2 policies)
- `notes` (4 policies)
- `board_invitations` (4 policies)

## Workstream 2: Frontend Bug Fixes

### Bug 1: CardDetailPanel ESC handler stale closure
Use a ref to store current save handler instead of re-creating event listener on every field change.

### Bug 2: BoardView drag race condition
Add null check for active card before using it in drag overlay and drag end handler.

### Bug 3: boardStore.moveCard missing error handling
Add try/catch around batch updates, log errors, handle failures gracefully.

### Bug 4: boardStore.addCard next_task_number error handling
Check response of task number increment, handle failure.

### Bug 5: InlineCardEditor deletes card on empty title
Show visual feedback or revert to previous title instead of deleting.

### Bug 6: CardDetailPanel board members fetch error handling
Add .catch() to board members query.

## Verification
- `npm run build` passes
- No new warnings introduced
