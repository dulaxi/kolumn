-- Fix: "infinite recursion detected in policy for relation board_invitations"
--
-- Root cause: the "Invitees can view boards they are invited to" policy on
-- boards references board_invitations, and board_invitations policies reference
-- boards — creating a cross-table cycle:
--   board_invitations → boards → board_invitations (boom)
--
-- Fix: extract the invitation lookup into a SECURITY DEFINER function
-- so that the boards policy no longer triggers RLS on board_invitations.

-- Step 1: Create helper function for invitation-based board access
create or replace function public.get_my_invited_board_ids()
returns setof uuid
language sql
security definer
stable
set search_path = ''
as $$
  select board_id from public.board_invitations
  where invited_email = (select auth.jwt()->>'email')
  and status = 'pending'
$$;

-- Step 2: Fix the "Invitees can view boards" policy on boards
drop policy if exists "Invitees can view boards they are invited to" on public.boards;

create policy "Invitees can view boards they are invited to"
  on public.boards for select
  to authenticated
  using (
    id in (select get_my_invited_board_ids())
  );

-- Step 3: Fix board_invitations SELECT policy (references board_members directly — use helper)
drop policy if exists "Board owners and invitees can view invitations" on public.board_invitations;

create policy "Board owners and invitees can view invitations"
  on public.board_invitations for select
  to authenticated
  using (
    board_id in (select get_my_board_ids())
    or invited_email = (auth.jwt()->>'email')
  );

-- Step 4: Fix board_invitations UPDATE policy (same pattern)
drop policy if exists "Board owners and invitees can update invitations" on public.board_invitations;

create policy "Board owners and invitees can update invitations"
  on public.board_invitations for update
  to authenticated
  using (
    board_id in (select get_my_board_ids())
    or invited_email = (auth.jwt()->>'email')
  );
