-- Persistent IP → "City, Country" cache for the account edge function's
-- session list.
--
-- Before this, GET /functions/v1/account/sessions geolocated every session IP
-- on every request via a blocking external call to ipwho.is (up to 2s each,
-- Promise.all-gated), with only a per-request in-memory cache — so opening the
-- Account settings pane re-geolocated the same IPs every time and the whole
-- response waited on the slowest lookup. This table remembers each IP's
-- resolution so only genuinely-new IPs ever hit the external API.
--
-- Service-role only: the edge function's service-role client is the sole
-- reader/writer (it bypasses RLS). No client should ever touch this table —
-- it's non-sensitive but there's no reason to expose it. Locked down like
-- chat_usage: RLS on, no policies, grants revoked from anon/authenticated.

create table if not exists public.ip_geo_cache (
  ip        text primary key,
  location  text        not null,
  cached_at timestamptz not null default now()
);

alter table public.ip_geo_cache enable row level security;

-- No policies: only the service-role client (which bypasses RLS) reads/writes.
revoke all on public.ip_geo_cache from anon, authenticated;
