-- New: per-board label registry
create table labels (
  id           uuid primary key default gen_random_uuid(),
  board_id     uuid not null references boards(id) on delete cascade,
  text         text not null check (length(trim(text)) > 0 and length(text) <= 64),
  color        text not null check (color in ('red','orange','yellow','green','blue','purple','pink','gray')),
  created_at   timestamptz not null default now(),
  archived_at  timestamptz
);

create unique index labels_board_text_lower_uq
  on labels (board_id, lower(text))
  where archived_at is null;

create index labels_board_id_idx on labels (board_id);

alter table labels enable row level security;

create policy labels_select on labels for select
  using (board_id in (select board_id from board_members where user_id = auth.uid()));
create policy labels_insert on labels for insert
  with check (board_id in (select board_id from board_members where user_id = auth.uid()));
create policy labels_update on labels for update
  using (board_id in (select board_id from board_members where user_id = auth.uid()));
create policy labels_delete on labels for delete
  using (board_id in (select board_id from board_members where user_id = auth.uid()));

-- New: card ↔ label join
create table card_labels (
  card_id    uuid not null references cards(id) on delete cascade,
  label_id   uuid not null references labels(id) on delete cascade,
  position   smallint not null default 0,
  created_at timestamptz not null default now(),
  primary key (card_id, label_id)
);

create index card_labels_label_id_idx on card_labels (label_id);

alter table card_labels enable row level security;

create policy card_labels_select on card_labels for select
  using (card_id in (
    select c.id from cards c
    where c.board_id in (select board_id from board_members where user_id = auth.uid())
  ));
create policy card_labels_insert on card_labels for insert
  with check (card_id in (
    select c.id from cards c
    where c.board_id in (select board_id from board_members where user_id = auth.uid())
  ));
create policy card_labels_delete on card_labels for delete
  using (card_id in (
    select c.id from cards c
    where c.board_id in (select board_id from board_members where user_id = auth.uid())
  ));

-- Drop the legacy column
alter table cards drop column labels;
