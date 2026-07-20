-- Atomic global_task_number. Previously computed client-side as max(...)+1 via
-- a plain select (boardStore.js), which two concurrent creates could read
-- identically and collide on. Assign it from a dedicated sequence in a
-- BEFORE INSERT trigger so every card gets a unique, monotonic number
-- regardless of concurrency. The value the client sends is ignored.

do $$
declare mx bigint;
begin
  select coalesce(max(global_task_number), 0) into mx from public.cards;
  execute format(
    'create sequence if not exists public.cards_global_task_number_seq start with %s',
    mx + 1
  );
end $$;

create or replace function public.set_global_task_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.global_task_number := nextval('public.cards_global_task_number_seq');
  return new;
end;
$$;

revoke execute on function public.set_global_task_number() from public, anon, authenticated;

drop trigger if exists set_global_task_number_before on public.cards;
create trigger set_global_task_number_before
before insert on public.cards
for each row execute function public.set_global_task_number();
