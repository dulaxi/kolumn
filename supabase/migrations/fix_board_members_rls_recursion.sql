-- Fix: "infinite recursion detected in policy for relation board_members"
--
-- Root cause: the board_members SELECT policy references board_members itself,
-- causing PostgreSQL to re-evaluate the same RLS policy infinitely.
--
-- Fix: create a SECURITY DEFINER function that bypasses RLS to look up
-- the current user's board IDs, then use it in the board_members SELECT policy.

-- Step 1: Create helper function (runs as owner, bypasses RLS)
create or replace function public.get_my_board_ids()
returns setof uuid
language sql
security definer
stable
set search_path = ''
as $$
  select board_id from public.board_members where user_id = auth.uid()
$$;

-- Step 2: Drop the self-referential policy
drop policy if exists "Members can view board_members" on public.board_members;

-- Step 3: Recreate using the helper function (no more self-reference)
create policy "Members can view board_members"
  on public.board_members for select
  to authenticated
  using (
    board_id in (select get_my_board_ids())
  );
