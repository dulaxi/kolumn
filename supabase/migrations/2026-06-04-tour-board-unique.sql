-- Defense-in-depth: at most one tour board per user. The JS seeder
-- has its own concurrency guard, but if anything misbehaves (StrictMode
-- double-invocation, two tabs racing, etc.) this index makes the second
-- insert fail at the DB layer instead of silently creating a duplicate.

create unique index if not exists boards_tour_owner_uq
  on public.boards (owner_id)
  where is_tour = true;
