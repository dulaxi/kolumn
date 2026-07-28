-- Perf: wrap auth.uid() in (select auth.uid()) in three policies flagged by the
-- Supabase performance advisor (auth_rls_initplan). A bare auth.uid() in a RLS
-- qual/with-check is re-evaluated per row; wrapping it in a scalar subquery lets
-- the planner evaluate it once per statement. Same pattern already used by the
-- membership policies (2026-07-27-fix-self-join-rls.sql). No behavior change —
-- auth.uid() is stable within a statement.

-- card_activity INSERT
drop policy if exists "Members can create card activity" on public.card_activity;
create policy "Members can create card activity"
  on public.card_activity for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and board_id in (select public.get_my_board_ids())
  );

-- chat_threads (FOR ALL)
drop policy if exists "chat_threads_owner" on public.chat_threads;
create policy "chat_threads_owner" on public.chat_threads
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- chat_messages (FOR ALL) — with-check also proves thread ownership
drop policy if exists "chat_messages_owner" on public.chat_messages;
create policy "chat_messages_owner" on public.chat_messages
  for all using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and thread_id in (select id from public.chat_threads where user_id = (select auth.uid()))
  );
