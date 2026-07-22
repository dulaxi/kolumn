-- Onboarding completeness (2026-07-22 audit fixes):
--   role              — chosen at the onboarding role step; used to tailor starters.
--   onboarded_at      — null = must (re-)enter /onboarding; AppLayout redirects on null.
--   terms_accepted_at — recorded at terms acceptance (email flow: at signup; OAuth: at the authed terms step).
--   trial_ends_at     — set when a Pro trial starts at checkout. Not yet enforced (billing is stubbed).
alter table public.profiles
  add column if not exists role text,
  add column if not exists onboarded_at timestamptz,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists trial_ends_at timestamptz;

-- Existing users predate the completion flow — never bounce them into it.
update public.profiles
  set onboarded_at = coalesce(onboarded_at, now()),
      terms_accepted_at = coalesce(terms_accepted_at, now());
