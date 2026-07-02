-- Tighten the notifications INSERT policy (launch hardening).
--
-- The 2026-04-03 policy ("Board members can create notifications") still
-- allowed two spoofing paths:
--   1. `board_id is null` rows bypassed the membership check entirely, so
--      any authenticated user could create notifications for any user.
--   2. The target `user_id` was never validated — a member of any board
--      could notify users who aren't on that board.
--
-- The only notification producer in the app (assignment notify in
-- boardStore.updateCard) always sets board_id and always targets a fellow
-- board member, so require both. The board_members subquery runs under the
-- caller's RLS, which permits reading member rows only for boards the
-- caller belongs to — consistent with the first condition.

drop policy if exists "Board members can create notifications" on public.notifications;
drop policy if exists "Authenticated users can create notifications" on public.notifications;

create policy "Board members can notify fellow members"
  on public.notifications for insert
  to authenticated
  with check (
    board_id is not null
    and board_id in (select public.get_my_board_ids())
    and exists (
      select 1 from public.board_members bm
      where bm.board_id = notifications.board_id
        and bm.user_id = notifications.user_id
    )
  );
