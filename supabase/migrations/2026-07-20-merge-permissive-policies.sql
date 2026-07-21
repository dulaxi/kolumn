-- Collapse overlapping permissive RLS policies into one policy per
-- (table, command) so Postgres evaluates a single policy instead of 2–3 per
-- row (multiple_permissive_policies advisor). Permissive policies are already
-- OR'd together, so the merged policy's condition is the exact OR of the
-- originals — IDENTICAL access, just faster. Each merged condition is built
-- programmatically from pg_policies (the live source of truth) to guarantee it
-- matches the originals verbatim.
--
-- Role note: boards SELECT had two `authenticated` policies + one `public`;
-- the merged policy is `public`. Equivalent because the authenticated-only
-- branches are auth.uid()-gated (they return no rows for anon).

do $$
declare merged text;
begin
  -- ── boards: 3 SELECT policies → 1 (public) ──
  select string_agg('(' || qual || ')', ' or ')
  into merged
  from pg_policies
  where schemaname = 'public' and tablename = 'boards' and cmd = 'SELECT'
    and policyname in (
      'Invitees can view boards they are invited to',
      'Members can view boards',
      'Workspace members can read workspace boards'
    );
  execute format(
    'create policy "Members, invitees and workspace members can view boards" '
    || 'on public.boards for select to public using (%s)', merged);
  drop policy "Invitees can view boards they are invited to" on public.boards;
  drop policy "Members can view boards" on public.boards;
  drop policy "Workspace members can read workspace boards" on public.boards;

  -- ── workspaces: 2 SELECT policies → 1 (public) ──
  select string_agg('(' || qual || ')', ' or ')
  into merged
  from pg_policies
  where schemaname = 'public' and tablename = 'workspaces' and cmd = 'SELECT'
    and policyname in (
      'Invitees can read invited workspaces',
      'Members can read their workspaces'
    );
  execute format(
    'create policy "Members and invitees can read workspaces" '
    || 'on public.workspaces for select to public using (%s)', merged);
  drop policy "Invitees can read invited workspaces" on public.workspaces;
  drop policy "Members can read their workspaces" on public.workspaces;

  -- ── board_members: 2 INSERT policies → 1 (authenticated) ──
  select string_agg('(' || with_check || ')', ' or ')
  into merged
  from pg_policies
  where schemaname = 'public' and tablename = 'board_members' and cmd = 'INSERT'
    and policyname in (
      'Board owners can manage members',
      'Invited users can join boards'
    );
  execute format(
    'create policy "Owners can add members and invited users can join" '
    || 'on public.board_members for insert to authenticated with check (%s)', merged);
  drop policy "Board owners can manage members" on public.board_members;
  drop policy "Invited users can join boards" on public.board_members;
end $$;
