-- Atomic task number increment to prevent duplicate task_numbers under concurrent card creation.
-- Returns the next available task_number for the given board.
-- Uses FOR UPDATE to lock the board row during the increment.
create or replace function public.next_task_number(target_board_id uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  result int;
begin
  update public.boards
    set next_task_number = next_task_number + 1
    where id = target_board_id
    returning next_task_number - 1 into result;

  return coalesce(result, 1);
end;
$$;
