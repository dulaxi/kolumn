-- Adds profiles.nickname — the short "Display name" edited in the settings
-- modal and preferred by the dashboard greeting. profiles.display_name
-- remains the full name shown in the sidebar, member lists, and on cards.
-- Applied to production 2026-07-17 via management API.
alter table public.profiles add column if not exists nickname text not null default '';
