-- RLS/DB security sweep (2026-07-27) — two safe, high-value fixes.
--
-- 1) chat_usage was directly client-writable. `authenticated` held INSERT/UPDATE/
--    DELETE grants and the table had own-row INSERT/UPDATE policies, so a free
--    user could PATCH /rest/v1/chat_usage and reset their daily message counter,
--    bypassing the 20/day limit (or DELETE the row). The only legitimate writer
--    is the SECURITY DEFINER increment_chat_usage RPC (which bypasses RLS); the
--    client only needs to read its own usage. Revoke the write grants and drop
--    the moot write policies; SELECT stays.
revoke insert, update, delete on public.chat_usage from anon, authenticated;
drop policy if exists "Users can insert own usage" on public.chat_usage;
drop policy if exists "Users can update own usage" on public.chat_usage;

-- 2) function_search_path_mutable (advisor): pin search_path on these SECURITY
--    DEFINER functions to close search-path injection. They reference public
--    tables unqualified, so `= public` preserves behavior. ALTER only — no body
--    change.
alter function public.increment_usage_metric(uuid, text, text) set search_path = public;
alter function public.increment_chat_usage(uuid, integer) set search_path = public;
alter function public.track_board_created() set search_path = public;
alter function public.track_card_created() set search_path = public;
alter function public.track_member_invited() set search_path = public;
alter function public.create_getting_started_board() set search_path = public;
