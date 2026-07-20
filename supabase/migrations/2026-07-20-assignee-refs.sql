-- Per-entry assignee identity: attach a stable user id to each member
-- assignment so renames and "is-me" matching survive display-name changes
-- with zero namesake collisions.
--
-- Canonical column: cards.assignee_refs jsonb = [{ "name": text, "id": uuid|null }].
-- id is null for free-text (non-member) assignees.
--
-- Clients keep writing the legacy name mirror (cards.assignees text[] +
-- cards.assignee_name text) exactly as before — a BEFORE trigger resolves
-- those names to member ids and keeps assignee_refs in sync, so no client
-- write path, hook, or editor changes. Every existing reader (board filters,
-- AI executor/context, avatar names) keeps using the name mirror untouched.
--
-- Invariant maintained by sync_assignee_refs():
--   assignees     = [ r.name for r in assignee_refs ]
--   assignee_name = assignees[0] or ''

alter table public.cards
  add column if not exists assignee_refs jsonb not null default '[]'::jsonb;

-- ── helpers ──────────────────────────────────────────────────────────
-- Name mirror from refs.
create or replace function public.assignee_names_from_refs(p_refs jsonb)
returns text[]
language sql
immutable
set search_path = public
as $$
  select coalesce(array_agg(elem->>'name' order by ord), '{}')
  from jsonb_array_elements(coalesce(p_refs, '[]'::jsonb)) with ordinality as t(elem, ord)
  where nullif(elem->>'name', '') is not null;
$$;

-- Build refs from a names array, resolving each name to a member id on that
-- board (board member OR workspace member), else null for free-text.
create or replace function public.resolve_assignee_refs(p_board_id uuid, p_names text[])
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'name', a.name,
      'id', (
        select p.id from public.profiles p
        where p.display_name = a.name
          and (
            exists (select 1 from public.board_members bm
                    where bm.board_id = p_board_id and bm.user_id = p.id)
            or exists (select 1 from public.workspace_members wm
                       join public.boards b on b.id = p_board_id
                       where wm.workspace_id = b.workspace_id and wm.user_id = p.id)
          )
        limit 1
      )
    ) order by a.ord
  ) filter (where nullif(a.name, '') is not null), '[]'::jsonb)
  from unnest(coalesce(p_names, '{}')) with ordinality as a(name, ord);
$$;

-- Rename every ref belonging to one user id (id-precise; namesakes untouched).
create or replace function public.rename_id_in_refs(p_refs jsonb, p_id text, p_name text)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select coalesce(jsonb_agg(
    case when elem->>'id' = p_id
         then jsonb_set(elem, '{name}', to_jsonb(p_name))
         else elem end
    order by ord), '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_refs, '[]'::jsonb)) with ordinality as t(elem, ord);
$$;

-- ── BEFORE trigger: keep refs <-> name mirror in sync on every card write ──
-- If a write set assignee_refs explicitly (rename/leaver triggers below, or a
-- future refs-aware client), that is the source of truth and the name mirror
-- is derived from it. Otherwise the names the client wrote are the source and
-- refs are (re)resolved from them. Either way both representations agree after
-- the write, and the client never has to know about refs.
create or replace function public.sync_assignee_refs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.assignee_refs is distinct from old.assignee_refs then
    new.assignees := public.assignee_names_from_refs(new.assignee_refs);
  else
    new.assignee_refs := public.resolve_assignee_refs(new.board_id, new.assignees);
  end if;
  new.assignee_name := coalesce(new.assignees[1], '');
  return new;
end;
$$;

revoke execute on function public.sync_assignee_refs() from public, anon, authenticated;

drop trigger if exists sync_assignee_refs_before on public.cards;
create trigger sync_assignee_refs_before
before insert or update on public.cards
for each row execute function public.sync_assignee_refs();

-- ── backfill existing rows (guarded: only rows still at the default) ──
update public.cards c
set assignee_refs = public.resolve_assignee_refs(c.board_id, c.assignees)
where c.assignee_refs = '[]'::jsonb
  and c.assignees is not null
  and c.assignees <> '{}';

-- ── rename trigger: mutate refs by id; BEFORE trigger re-mirrors names ──
create or replace function public.rename_member_in_board_cards()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.display_name is not distinct from old.display_name then
    return new;
  end if;
  if new.display_name is null or new.display_name = '' then
    return new;
  end if;

  update public.cards c
  set assignee_refs = public.rename_id_in_refs(c.assignee_refs, new.id::text, new.display_name)
  where c.assignee_refs @> jsonb_build_array(jsonb_build_object('id', new.id::text));

  return new;
end;
$$;

revoke execute on function public.rename_member_in_board_cards() from public, anon, authenticated;

drop trigger if exists on_profile_rename_update_cards on public.profiles;
create trigger on_profile_rename_update_cards
after update on public.profiles
for each row execute function public.rename_member_in_board_cards();

-- ── leaver purge: drop the leaver's refs by id (keep name-only legacy
--    entries that match the name); BEFORE trigger re-mirrors names ──────
create or replace function public.purge_leaver_from_board_cards()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  leaver_name text;
  leaver_id   text := old.user_id::text;
begin
  select display_name into leaver_name from public.profiles where id = old.user_id;

  update public.cards c
  set assignee_refs = (
    select coalesce(jsonb_agg(elem order by ord), '[]'::jsonb)
    from jsonb_array_elements(c.assignee_refs) with ordinality as t(elem, ord)
    where not (
      elem->>'id' = leaver_id
      or ((elem->>'id') is null and leaver_name is not null and elem->>'name' = leaver_name)
    )
  )
  where c.board_id = old.board_id
    and (
      c.assignee_refs @> jsonb_build_array(jsonb_build_object('id', leaver_id))
      or (leaver_name is not null and leaver_name = any(c.assignees))
    );

  return old;
end;
$$;

revoke execute on function public.purge_leaver_from_board_cards() from public, anon, authenticated;
