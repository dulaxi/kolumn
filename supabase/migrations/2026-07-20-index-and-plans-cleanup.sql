-- Index hygiene + retire the dead plan_id/plans subsystem (superseded by
-- profiles.tier; no code references plan_id or the plans table).

-- Cover foreign keys that lacked an index (helps cascade deletes + reverse
-- lookups). Kept small; not dropping the other "unused" indexes the advisor
-- flags, because those are unused only due to low dev traffic and are real
-- production lookups (boards.owner_id, notifications.user_id, labels.board_id…).
create index if not exists idx_card_activity_user_id       on public.card_activity(user_id);
create index if not exists idx_card_attachments_user_id    on public.card_attachments(user_id);
create index if not exists idx_card_comments_user_id       on public.card_comments(user_id);
create index if not exists idx_notifications_board_id       on public.notifications(board_id);
create index if not exists idx_notifications_card_id        on public.notifications(card_id);
create index if not exists idx_workspace_invitations_invited_by on public.workspace_invitations(invited_by);

-- Drop genuinely-dead indexes: assignee filtering runs client-side so the GIN
-- index is never used; notes is a removed feature.
drop index if exists public.cards_assignees_gin;
drop index if exists public.idx_notes_user_id;

-- Retire the abandoned plan system. profiles.tier is the source of truth.
alter table public.profiles drop constraint if exists profiles_plan_id_fkey;
alter table public.profiles drop column if exists plan_id;
drop table if exists public.plans;
