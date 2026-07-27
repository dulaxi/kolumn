-- Fix broken-access-control in the membership INSERT policies for
-- board_members and workspace_members.
--
-- Both policies carried a bare `or user_id = auth.uid()` branch in their
-- INSERT WITH CHECK, with no invitation gate and no role restriction. Because
-- every downstream policy (boards/columns/cards SELECT+write, workspace/board
-- visibility, member roster) authorizes on membership derived from these two
-- tables, that branch let ANY authenticated user self-insert a membership row
-- for an arbitrary board_id / workspace_id — taking over a board's data
-- (read+write) or reading a workspace's board metadata + full member roster.
--
-- Legitimate self-joins do NOT need that branch:
--   * owner-add runs through SECURITY DEFINER triggers (handle_new_board /
--     handle_workspace_owner), which bypass RLS;
--   * invite-accept runs through the SECURITY DEFINER RPCs (accept_invitation /
--     accept_workspace_invitation), which also bypass RLS.
-- The only RLS path a client needs is "join a board/workspace I hold a pending
-- invitation to", which we express explicitly below via the get_my_invited_*
-- helpers (both STABLE SECURITY DEFINER, scoped to pending invites for the
-- caller's JWT email) and pin to role = 'member'.
--
-- Policies are kept as a single permissive policy per (table, command) to
-- preserve the merge done in 2026-07-20-merge-permissive-policies.sql.

-- ── board_members INSERT ──
-- Live policy (post-merge) had: owner-add OR (bare user_id=auth.uid()) OR invited-join.
-- Drop the bare middle branch; keep owner-add + invitation-gated join.
drop policy if exists "Owners can add members and invited users can join"
  on public.board_members;

create policy "Owners can add members and invited users can join"
  on public.board_members for insert
  to authenticated
  with check (
    board_id in (select id from public.boards where owner_id = (select auth.uid()))
    or (
      user_id = (select auth.uid())
      and role = 'member'
      and board_id in (select public.get_my_invited_board_ids())
    )
  );

-- ── workspace_members INSERT ──
-- Live policy had: owner-add OR (bare user_id=auth.uid()).
-- Replace the bare branch with an invitation-gated, member-only self-join,
-- mirroring the board pattern.
drop policy if exists "Owners can add members, users can self-join on accept"
  on public.workspace_members;

create policy "Owners can add members, users can self-join on accept"
  on public.workspace_members for insert
  to authenticated
  with check (
    workspace_id in (select id from public.workspaces where owner_id = (select auth.uid()))
    or (
      user_id = (select auth.uid())
      and role = 'member'
      and workspace_id in (select public.get_my_invited_workspace_ids())
    )
  );
