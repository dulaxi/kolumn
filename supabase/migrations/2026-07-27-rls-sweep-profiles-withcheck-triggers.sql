-- RLS/DB security sweep (2026-07-27) — part 2.

-- 1) Email harvesting: profiles were readable by every authenticated user
--    (SELECT USING true), exposing the email column app-wide. Scope reads to
--    self + collaborators (people who share a board or workspace). Co-member
--    UIs (share modal, member lists, assignees) still resolve; strangers'
--    profiles — including email — are hidden.
drop policy if exists "Profiles readable by authenticated users" on public.profiles;
create policy "Profiles readable by self and collaborators"
  on public.profiles for select
  to authenticated
  using (
    id = (select auth.uid())
    or id in (
      select bm.user_id from public.board_members bm
      where bm.board_id in (select public.get_my_board_ids())
    )
    or id in (
      select wm.user_id from public.workspace_members wm
      where wm.workspace_id in (select public.get_my_workspace_ids())
    )
  );

-- 2) UPDATE policies had USING but no WITH CHECK, permitting "row laundering":
--    editing a row you control into a scope you don't (e.g. moving a card to
--    another board_id). Add WITH CHECK mirroring the owning scope.
alter policy "Members can update cards" on public.cards
  with check (board_id in (select get_my_board_ids()));
alter policy "Members can update columns" on public.columns
  with check (board_id in (select get_my_board_ids()));
alter policy "labels_update" on public.labels
  with check (board_id in (select get_my_board_ids()));
alter policy "Users can update own comments" on public.card_comments
  with check ((user_id = (select auth.uid())) and (card_id in (select get_my_card_ids())));
alter policy "Users can update own notes" on public.notes
  with check (user_id = (select auth.uid()));
alter policy "Users can update own notifications" on public.notifications
  with check (user_id = (select auth.uid()));
alter policy "Board owners can update boards" on public.boards
  with check (owner_id = (select auth.uid()));

-- 3) Trigger-only SECURITY DEFINER functions were callable directly via
--    /rest/v1/rpc. None are invoked as RPCs by the app (verified against every
--    client + edge .rpc call). Revoke the direct-call surface from PUBLIC (and
--    the named roles) — triggers fire as the table owner, bypassing the EXECUTE
--    ACL, so trigger behavior is unaffected.
revoke execute on function
  public.auto_accept_workspace_invitations(),
  public.handle_new_board(),
  public.handle_updated_at(),
  public.handle_workspace_owner(),
  public.purge_leaver_from_board_cards(),
  public.purge_leaver_from_workspace_cards(),
  public.rename_member_in_board_cards(),
  public.set_global_task_number(),
  public.sync_assignee_refs(),
  public.track_board_created(),
  public.track_card_created(),
  public.track_member_invited()
from public, anon, authenticated;

-- Same for the auth.users trigger functions and an internal metric helper
-- (only called by definer triggers) — none are app RPCs.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_invitation_on_signup() from public, anon, authenticated;
revoke execute on function public.increment_usage_metric(uuid, text, text) from public, anon, authenticated;
