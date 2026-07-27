-- Chat persistence (backlog T1-#4): conversations move from localStorage to
-- Supabase. Client-generated UUIDs are the primary keys (the store already
-- mints them). chat_messages.user_id is denormalized so RLS never joins.
-- The two recency indexes match the client's exact keyset read shapes.

create table if not exists chat_threads (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat' check (char_length(title) <= 200),
  starred boolean not null default false,
  title_edited boolean not null default false,
  ai_titled boolean not null default false,
  rail_group_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key,
  thread_id uuid not null references chat_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  text text not null default '' check (char_length(text) <= 50000),
  card_ids jsonb not null default '[]',
  mentioned_card_ids jsonb not null default '[]',
  activities jsonb not null default '[]',
  stopped boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists chat_threads_user_recency
  on chat_threads (user_id, updated_at desc);
create index if not exists chat_messages_thread_recency
  on chat_messages (thread_id, created_at desc);

alter table chat_threads enable row level security;
alter table chat_messages enable row level security;

create policy "chat_threads_owner" on chat_threads
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "chat_messages_owner" on chat_messages
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
