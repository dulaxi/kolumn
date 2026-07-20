-- Resolve assignee names against nickname as well as display_name, so a card
-- assigned to someone by their nickname still links to their id.

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
        where (p.display_name = a.name or nullif(p.nickname, '') = a.name)
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
