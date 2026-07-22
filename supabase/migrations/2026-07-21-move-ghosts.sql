-- Move Ghosts: denormalized last-move pointer + structured move history.
-- last_move powers the zero-query hover ghost; card_activity.meta is the
-- append-only structured history (every move) for the future full-trail tier.
alter table public.cards
  add column if not exists last_move jsonb;

alter table public.card_activity
  add column if not exists meta jsonb;
