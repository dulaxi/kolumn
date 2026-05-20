-- Drop existing labels policies using inline subquery
drop policy if exists labels_select on labels;
drop policy if exists labels_insert on labels;
drop policy if exists labels_update on labels;
drop policy if exists labels_delete on labels;

-- Recreate using get_my_board_ids() helper, matching cards table pattern
create policy labels_select on labels for select
  using (board_id in (select get_my_board_ids()));
create policy labels_insert on labels for insert
  with check (board_id in (select get_my_board_ids()));
create policy labels_update on labels for update
  using (board_id in (select get_my_board_ids()));
create policy labels_delete on labels for delete
  using (board_id in (select get_my_board_ids()));

-- Drop existing card_labels policies using inline subquery
drop policy if exists card_labels_select on card_labels;
drop policy if exists card_labels_insert on card_labels;
drop policy if exists card_labels_delete on card_labels;

-- Recreate using get_my_board_ids() via cards join
create policy card_labels_select on card_labels for select
  using (card_id in (
    select c.id from cards c where c.board_id in (select get_my_board_ids())
  ));
create policy card_labels_insert on card_labels for insert
  with check (card_id in (
    select c.id from cards c where c.board_id in (select get_my_board_ids())
  ));
create policy card_labels_delete on card_labels for delete
  using (card_id in (
    select c.id from cards c where c.board_id in (select get_my_board_ids())
  ));
