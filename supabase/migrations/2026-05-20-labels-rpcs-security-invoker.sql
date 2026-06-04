-- Security fix: the three label RPCs were SECURITY DEFINER with no membership
-- check and granted to `authenticated`, so any logged-in user could pass an
-- arbitrary board_id / card_id / label id and create, attach, merge, or delete
-- labels on boards they are not a member of (cross-tenant IDOR).
--
-- These functions have no reason to be definer: every statement they run is
-- already covered by the RLS policies on `labels` and `card_labels` (see
-- 2026-05-20-labels-registry-policy-fix.sql, gated on get_my_board_ids()).
-- Switching to SECURITY INVOKER makes RLS evaluate against the caller, so a
-- non-member's INSERT is rejected by the policy `with check` and their SELECT
-- returns nothing — the membership boundary is enforced by a single source of
-- truth (the policies) rather than duplicated inside each function.

create or replace function upsert_label(
  p_board_id uuid,
  p_text     text,
  p_color    text default null
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_text  text := trim(p_text);
  v_color text := p_color;
  v_id    uuid;
begin
  if v_text = '' or v_text is null then
    raise exception 'label text required';
  end if;

  select id into v_id
  from labels
  where board_id = p_board_id
    and lower(text) = lower(v_text)
    and archived_at is null
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  if v_color is null then
    v_color := (array['red','orange','yellow','green','blue','purple','pink','gray'])
               [(abs(hashtext(lower(v_text))) % 8) + 1];
  end if;

  if v_color not in ('red','orange','yellow','green','blue','purple','pink','gray') then
    v_color := 'gray';
  end if;

  insert into labels (board_id, text, color)
  values (p_board_id, v_text, v_color)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function attach_label_by_text(
  p_card_id  uuid,
  p_text     text,
  p_color    text default null
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_board_id uuid;
  v_label_id uuid;
begin
  select board_id into v_board_id from cards where id = p_card_id;
  if v_board_id is null then
    raise exception 'card not found';
  end if;

  v_label_id := upsert_label(v_board_id, p_text, p_color);

  insert into card_labels (card_id, label_id)
  values (p_card_id, v_label_id)
  on conflict (card_id, label_id) do nothing;

  return v_label_id;
end;
$$;

create or replace function merge_labels(
  p_from_id uuid,
  p_into_id uuid
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_from_board uuid;
  v_into_board uuid;
begin
  if p_from_id = p_into_id then
    raise exception 'cannot merge label into itself';
  end if;
  select board_id into v_from_board from labels where id = p_from_id;
  select board_id into v_into_board from labels where id = p_into_id;
  if v_from_board is null or v_into_board is null then
    raise exception 'label not found';
  end if;
  if v_from_board <> v_into_board then
    raise exception 'cannot merge labels across boards';
  end if;

  insert into card_labels (card_id, label_id)
  select card_id, p_into_id from card_labels where label_id = p_from_id
  on conflict (card_id, label_id) do nothing;

  delete from card_labels where label_id = p_from_id;
  delete from labels       where id       = p_from_id;
end;
$$;

grant execute on function upsert_label(uuid, text, text) to authenticated;
grant execute on function attach_label_by_text(uuid, text, text) to authenticated;
grant execute on function merge_labels(uuid, uuid) to authenticated;
