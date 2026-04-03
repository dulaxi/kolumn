-- ============================================================
-- Add missing indexes for columns used in RLS subqueries and
-- common WHERE/ORDER BY clauses. Without these, every RLS
-- check on boards/columns/cards does a full table scan on
-- board_members.
-- ============================================================

-- board_members: used in nearly every RLS policy subquery
create index if not exists idx_board_members_user_id
  on public.board_members(user_id);

-- Composite: the most common RLS pattern is
-- "board_id in (select board_id from board_members where user_id = auth.uid())"
create index if not exists idx_board_members_board_id_user_id
  on public.board_members(board_id, user_id);

-- columns: filtered by board_id in fetchBoards, RLS, and drag-drop
create index if not exists idx_columns_board_id
  on public.columns(board_id);

-- cards: filtered by board_id in RLS, realtime subscriptions, and fetches
create index if not exists idx_cards_board_id
  on public.cards(board_id);

-- cards: filtered by column_id in drag-drop position calculations
create index if not exists idx_cards_column_id
  on public.cards(column_id);

-- card_comments: filtered by card_id on every detail panel open
create index if not exists idx_card_comments_card_id
  on public.card_comments(card_id);

-- card_activity: filtered by card_id on every detail panel open
create index if not exists idx_card_activity_card_id
  on public.card_activity(card_id);

-- card_attachments: filtered by card_id on every detail panel open
create index if not exists idx_card_attachments_card_id
  on public.card_attachments(card_id);

-- board_invitations: filtered by invited_email on login/workspace page
create index if not exists idx_board_invitations_invited_email
  on public.board_invitations(invited_email);
