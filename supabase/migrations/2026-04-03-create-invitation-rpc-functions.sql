-- ============================================================
-- Create RPC functions for invitation accept/decline and leave board
-- These are called by workspaceStore.js but were never defined.
-- SECURITY DEFINER: bypasses RLS, does its own auth checks.
-- ============================================================

-- 1. accept_invitation: mark invitation accepted + add user to board_members
create or replace function public.accept_invitation(invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  caller_email text;
begin
  -- Get caller's email
  select email into caller_email
    from auth.users where id = auth.uid();

  -- Fetch the invitation
  select * into inv
    from public.board_invitations
    where id = invitation_id;

  if inv is null then
    raise exception 'Invitation not found';
  end if;

  if inv.status <> 'pending' then
    raise exception 'Invitation is no longer pending';
  end if;

  -- Verify caller is the invited user
  if inv.invited_email <> caller_email then
    raise exception 'You are not the recipient of this invitation';
  end if;

  -- Accept: update status + add to board_members (atomic)
  update public.board_invitations
    set status = 'accepted'
    where id = invitation_id;

  insert into public.board_members (board_id, user_id, role)
    values (inv.board_id, auth.uid(), 'member')
    on conflict (board_id, user_id) do nothing;
end;
$$;

-- 2. decline_invitation: mark invitation declined
create or replace function public.decline_invitation(invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  caller_email text;
begin
  select email into caller_email
    from auth.users where id = auth.uid();

  select * into inv
    from public.board_invitations
    where id = invitation_id;

  if inv is null then
    raise exception 'Invitation not found';
  end if;

  if inv.status <> 'pending' then
    raise exception 'Invitation is no longer pending';
  end if;

  if inv.invited_email <> caller_email then
    raise exception 'You are not the recipient of this invitation';
  end if;

  update public.board_invitations
    set status = 'declined'
    where id = invitation_id;
end;
$$;

-- 3. leave_board: remove caller from board_members (owners cannot leave)
create or replace function public.leave_board(target_board_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  board_owner_id uuid;
begin
  -- Check if the board exists and get owner
  select owner_id into board_owner_id
    from public.boards
    where id = target_board_id;

  if board_owner_id is null then
    raise exception 'Board not found';
  end if;

  -- Owners cannot leave their own board
  if board_owner_id = auth.uid() then
    raise exception 'Board owners cannot leave their own board — transfer ownership or delete it';
  end if;

  -- Verify caller is actually a member
  if not exists (
    select 1 from public.board_members
    where board_id = target_board_id and user_id = auth.uid()
  ) then
    raise exception 'You are not a member of this board';
  end if;

  -- Remove membership
  delete from public.board_members
    where board_id = target_board_id
    and user_id = auth.uid();
end;
$$;
