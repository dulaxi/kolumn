-- Onboarding checklist (2026-07-23): per-step completion timestamps for
-- the sidebar "Get started" card. Shape:
--   { board?: iso, card?: iso, ai?: iso, dismissed?: iso }
alter table public.profiles
  add column if not exists onboarding_steps jsonb not null default '{}'::jsonb;
