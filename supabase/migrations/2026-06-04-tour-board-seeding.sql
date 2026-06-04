-- Tour board seeding: tracks whether a user has been given the
-- "Welcome to Kolumn" onboarding board so it isn't re-created on
-- subsequent loads (even if the user has deleted it).
--
-- A new column on profiles is the source of truth. We also tag the
-- seeded board itself with is_tour so we can:
--   1. dedupe if a partial seed wrote a board but didn't get a
--      chance to set the profile flag, and
--   2. display "this is the tour" UI later if we want.

alter table public.profiles
  add column if not exists tour_board_seeded_at timestamptz;

alter table public.boards
  add column if not exists is_tour boolean not null default false;
