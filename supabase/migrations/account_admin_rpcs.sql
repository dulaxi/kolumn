-- Security-definer RPCs for the `account` edge function. The auth schema is
-- not exposed to PostgREST, so session rows are read/deleted through these.
-- EXECUTE is revoked from client roles — only service_role may call them.

create or replace function public.admin_list_sessions(p_user_id uuid)
returns table (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  refreshed_at timestamptz,
  user_agent text,
  ip text
)
language sql
security definer
set search_path = auth, public
as $$
  select s.id, s.created_at, s.updated_at, s.refreshed_at,
         s.user_agent, host(s.ip) as ip
  from auth.sessions s
  where s.user_id = p_user_id
  order by coalesce(s.refreshed_at, s.updated_at, s.created_at) desc
$$;

create or replace function public.admin_revoke_session(p_user_id uuid, p_session_id uuid)
returns boolean
language sql
security definer
set search_path = auth, public
as $$
  with del as (
    delete from auth.sessions
    where id = p_session_id and user_id = p_user_id
    returning 1
  )
  select exists (select 1 from del)
$$;

revoke all on function public.admin_list_sessions(uuid) from public, anon, authenticated;
revoke all on function public.admin_revoke_session(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_list_sessions(uuid) to service_role;
grant execute on function public.admin_revoke_session(uuid, uuid) to service_role;
