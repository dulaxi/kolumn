create or replace function upsert_label(
  p_board_id uuid,
  p_text     text,
  p_color    text default null
) returns uuid
language plpgsql
security definer
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

grant execute on function upsert_label(uuid, text, text) to authenticated;
