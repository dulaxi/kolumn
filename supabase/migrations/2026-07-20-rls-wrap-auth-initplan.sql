-- Perf: wrap auth.<fn>() calls in RLS policies as (select auth.<fn>()) so
-- Postgres evaluates them once per query instead of once per row (Supabase's
-- documented initplan optimization). Semantically identical — only changes how
-- often the function runs, never which rows pass. Only rewrites unwrapped
-- policies; roles and command are preserved by ALTER POLICY.
--
-- NOTE: the "multiple permissive policies" advisories (boards SELECT,
-- board_members INSERT, workspaces SELECT) are intentionally NOT merged here —
-- consolidating overlapping policies can change access semantics for only a
-- minor perf gain, so that is left as a reviewed, deliberate follow-up.
do $$
declare
  r record;
  q text;
  c text;
  clause text;
begin
  for r in
    select tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
  loop
    q := r.qual;
    c := r.with_check;

    if q is not null and q like '%auth.%' and q not like '%select auth.%' then
      q := replace(q, 'auth.uid()',  '(select auth.uid())');
      q := replace(q, 'auth.role()', '(select auth.role())');
      q := replace(q, 'auth.jwt()',  '(select auth.jwt())');
    end if;

    if c is not null and c like '%auth.%' and c not like '%select auth.%' then
      c := replace(c, 'auth.uid()',  '(select auth.uid())');
      c := replace(c, 'auth.role()', '(select auth.role())');
      c := replace(c, 'auth.jwt()',  '(select auth.jwt())');
    end if;

    if q is distinct from r.qual or c is distinct from r.with_check then
      clause := '';
      if q is not null then clause := clause || format(' using (%s)', q); end if;
      if c is not null then clause := clause || format(' with check (%s)', c); end if;
      if clause <> '' then
        execute format('alter policy %I on public.%I%s', r.policyname, r.tablename, clause);
      end if;
    end if;
  end loop;
end $$;
