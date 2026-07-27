-- Anti-forgery for unbilled continuation rounds in the chat edge function.
--
-- The function marks a turn "unbilled" when the incoming message is a
-- tool_result continuation (so a multi-round pill loop doesn't burn a free
-- user's daily message limit on every round). The only prior linkage check —
-- "every tool_result.tool_use_id appears in the supplied history" — is
-- forgeable: history is client-supplied, so a free user could wrap any prompt
-- as a fabricated tool_result continuation and ride the unbilled path,
-- bypassing the daily limit entirely (the code comment in tier.ts acknowledged
-- this as an accepted risk).
--
-- Fix: the server records every tool_use id it actually emits as a single-use
-- grant. A continuation is only unbilled if EVERY tool_result consumes an
-- unconsumed, recent grant owned by the caller. Forged / expired / replayed
-- continuations fall through to being billed like any normal user message, so
-- the bypass costs the attacker their quota instead of dodging it.
--
-- Only the chat edge function (service-role key) writes and consumes this
-- table. RLS is ON with NO policies, so anon/authenticated cannot read or
-- write it directly — a client-writable grant would itself be forgeable, which
-- is the whole thing we're preventing. Service role bypasses RLS.

create table if not exists public.chat_tool_grants (
  tool_use_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);

-- Matches the consume query shape (user + recency + unconsumed) and the
-- per-user opportunistic cleanup of expired rows.
create index if not exists chat_tool_grants_user_created
  on public.chat_tool_grants (user_id, created_at desc);

alter table public.chat_tool_grants enable row level security;
-- No policies: deny-all to anon/authenticated. Service role is the only writer.
