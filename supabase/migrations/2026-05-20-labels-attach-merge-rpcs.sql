create or replace function attach_label_by_text(
  p_card_id  uuid,
  p_text     text,
  p_color    text default null
) returns uuid
language plpgsql
security definer
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

grant execute on function attach_label_by_text(uuid, text, text) to authenticated;

create or replace function merge_labels(
  p_from_id uuid,
  p_into_id uuid
) returns void
language plpgsql
security definer
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

grant execute on function merge_labels(uuid, uuid) to authenticated;
