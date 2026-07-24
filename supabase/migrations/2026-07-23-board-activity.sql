-- Board activity tracker (2026-07-23): make card_activity queryable per
-- board and let history survive card deletion.

-- 1) board_id, backfilled from cards
alter table public.card_activity
  add column if not exists board_id uuid references public.boards(id) on delete cascade;

update public.card_activity ca
set board_id = c.board_id
from public.cards c
where ca.card_id = c.id and ca.board_id is null;

-- Rows whose card is already gone can't be scoped — drop them (pre-feature
-- data; the new on-delete-set-null keeps future rows).
delete from public.card_activity where board_id is null;

alter table public.card_activity alter column board_id set not null;

create index if not exists idx_card_activity_board_created
  on public.card_activity(board_id, created_at desc);

-- 2) card_id: cascade -> set null (history outlives the card)
alter table public.card_activity drop constraint card_activity_card_id_fkey;
alter table public.card_activity alter column card_id drop not null;
alter table public.card_activity
  add constraint card_activity_card_id_fkey
  foreign key (card_id) references public.cards(id) on delete set null;

-- 3) RLS via board membership (same helper the cards policies use)
drop policy "Members can view card activity" on public.card_activity;
drop policy "Members can create card activity" on public.card_activity;

create policy "Members can view card activity"
  on public.card_activity for select
  to authenticated
  using (board_id in (select get_my_board_ids()));

create policy "Members can create card activity"
  on public.card_activity for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and board_id in (select get_my_board_ids())
  );
