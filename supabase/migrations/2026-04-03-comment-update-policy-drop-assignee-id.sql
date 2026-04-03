-- ============================================================
-- 1. Allow users to edit their own comments
-- ============================================================
create policy "Users can update own comments"
  on public.card_comments for update
  to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- 2. Drop unused assignee_id column from cards
--    Code only uses assignee_name (text). The FK column was
--    never populated and wastes storage + index overhead.
-- ============================================================
alter table public.cards drop column if exists assignee_id;
