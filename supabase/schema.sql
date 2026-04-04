-- Kolumn Kanban: Full database schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- ============================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  icon text,
  color text default 'bg-[#7EB8DA]',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Profiles readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

-- ============================================================
-- 2. BOARDS
-- ============================================================
create table public.boards (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Untitled Board',
  icon text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  next_task_number int not null default 1,
  created_at timestamptz default now()
);

alter table public.boards enable row level security;

-- ============================================================
-- 3. BOARD_MEMBERS (join table for board access)
-- ============================================================
create table public.board_members (
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz default now(),
  primary key (board_id, user_id)
);

alter table public.board_members enable row level security;

-- Board RLS: users can see boards they're members of
create policy "Members can view boards"
  on public.boards for select
  to authenticated
  using (
    id in (select board_id from public.board_members where user_id = auth.uid())
  );

create policy "Authenticated users can create boards"
  on public.boards for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "Board owners can update boards"
  on public.boards for update
  to authenticated
  using (owner_id = auth.uid());

create policy "Board owners can delete boards"
  on public.boards for delete
  to authenticated
  using (owner_id = auth.uid());

-- Helper: bypasses RLS to look up current user's board IDs (breaks recursion)
create or replace function public.get_my_board_ids()
returns setof uuid
language sql
security definer
stable
set search_path = ''
as $$
  select board_id from public.board_members where user_id = auth.uid()
$$;

-- Board members RLS (uses helper function to avoid self-referential recursion)
create policy "Members can view board_members"
  on public.board_members for select
  to authenticated
  using (
    board_id in (select get_my_board_ids())
  );

create policy "Board owners can manage members"
  on public.board_members for insert
  to authenticated
  with check (
    board_id in (select id from public.boards where owner_id = auth.uid())
    or user_id = auth.uid()
  );

create policy "Board owners can remove members"
  on public.board_members for delete
  to authenticated
  using (
    board_id in (select id from public.boards where owner_id = auth.uid())
    or user_id = auth.uid()
  );

-- ============================================================
-- 4. COLUMNS
-- ============================================================
create table public.columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  title text not null default 'Untitled',
  position int not null default 0,
  created_at timestamptz default now()
);

alter table public.columns enable row level security;

create policy "Members can view columns"
  on public.columns for select
  to authenticated
  using (
    board_id in (select board_id from public.board_members where user_id = auth.uid())
  );

create policy "Members can create columns"
  on public.columns for insert
  to authenticated
  with check (
    board_id in (select board_id from public.board_members where user_id = auth.uid())
  );

create policy "Members can update columns"
  on public.columns for update
  to authenticated
  using (
    board_id in (select board_id from public.board_members where user_id = auth.uid())
  );

create policy "Members can delete columns"
  on public.columns for delete
  to authenticated
  using (
    board_id in (select board_id from public.board_members where user_id = auth.uid())
  );

-- ============================================================
-- 5. CARDS
-- ============================================================
create table public.cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  column_id uuid not null references public.columns(id) on delete cascade,
  position int not null default 0,
  task_number int not null default 0,
  global_task_number int not null default 0,
  title text not null default 'Untitled task',
  description text default '',
  assignee_id uuid references auth.users(id) on delete set null,
  assignee_name text default '',
  priority text default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date timestamptz,
  icon text,
  completed boolean default false,
  labels jsonb default '[]'::jsonb,
  checklist jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.cards enable row level security;

create policy "Members can view cards"
  on public.cards for select
  to authenticated
  using (
    board_id in (select board_id from public.board_members where user_id = auth.uid())
  );

create policy "Members can create cards"
  on public.cards for insert
  to authenticated
  with check (
    board_id in (select board_id from public.board_members where user_id = auth.uid())
  );

create policy "Members can update cards"
  on public.cards for update
  to authenticated
  using (
    board_id in (select board_id from public.board_members where user_id = auth.uid())
  );

create policy "Members can delete cards"
  on public.cards for delete
  to authenticated
  using (
    board_id in (select board_id from public.board_members where user_id = auth.uid())
  );

-- ============================================================
-- 6. NOTES (private per user)
-- ============================================================
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled',
  content text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.notes enable row level security;

create policy "Users can view own notes"
  on public.notes for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can create own notes"
  on public.notes for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own notes"
  on public.notes for update
  to authenticated
  using (user_id = auth.uid());

create policy "Users can delete own notes"
  on public.notes for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- 7. BOARD_INVITATIONS
-- ============================================================
create table public.board_invitations (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  invited_email text not null,
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz default now(),
  unique(board_id, invited_email)
);

alter table public.board_invitations enable row level security;

create policy "Board owners can view invitations"
  on public.board_invitations for select
  to authenticated
  using (
    board_id in (select id from public.boards where owner_id = auth.uid())
    or invited_email = (select email from auth.users where id = auth.uid())
  );

create policy "Board owners can create invitations"
  on public.board_invitations for insert
  to authenticated
  with check (
    board_id in (select id from public.boards where owner_id = auth.uid())
  );

create policy "Board owners can update invitations"
  on public.board_invitations for update
  to authenticated
  using (
    board_id in (select id from public.boards where owner_id = auth.uid())
    or invited_email = (select email from auth.users where id = auth.uid())
  );

create policy "Board owners can delete invitations"
  on public.board_invitations for delete
  to authenticated
  using (
    board_id in (select id from public.boards where owner_id = auth.uid())
  );

-- ============================================================
-- 8. TRIGGERS
-- ============================================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-add owner to board_members on board creation
create or replace function public.handle_new_board()
returns trigger as $$
begin
  insert into public.board_members (board_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_board_created
  after insert on public.boards
  for each row execute function public.handle_new_board();

-- Auto-accept pending invitations when new user signs up
create or replace function public.handle_invitation_on_signup()
returns trigger as $$
declare
  inv record;
begin
  for inv in
    select * from public.board_invitations
    where invited_email = new.email and status = 'pending'
  loop
    insert into public.board_members (board_id, user_id, role)
    values (inv.board_id, new.id, 'member')
    on conflict do nothing;

    update public.board_invitations
    set status = 'accepted'
    where id = inv.id;
  end loop;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_signup_accept_invitations
  after insert on auth.users
  for each row execute function public.handle_invitation_on_signup();

-- Auto-update updated_at on cards
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_cards_updated_at
  before update on public.cards
  for each row execute function public.handle_updated_at();

create trigger set_notes_updated_at
  before update on public.notes
  for each row execute function public.handle_updated_at();

-- ============================================================
-- 9. ENABLE REALTIME
-- ============================================================
alter publication supabase_realtime add table public.boards;
alter publication supabase_realtime add table public.columns;
alter publication supabase_realtime add table public.cards;
alter publication supabase_realtime add table public.board_members;

-- ============================================================
-- 10. CARD COMMENTS
-- ============================================================
create table public.card_comments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default '',
  text text not null default '',
  created_at timestamptz default now()
);

create index idx_card_comments_card_id on public.card_comments(card_id);

alter table public.card_comments enable row level security;

create policy "Members can view comments"
  on public.card_comments for select
  using (
    card_id in (
      select c.id from public.cards c
      where c.board_id in (
        select board_id from public.board_members where user_id = auth.uid()
      )
    )
  );

create policy "Members can create comments"
  on public.card_comments for insert
  with check (
    user_id = auth.uid()
    and card_id in (
      select c.id from public.cards c
      where c.board_id in (
        select board_id from public.board_members where user_id = auth.uid()
      )
    )
  );

create policy "Users can delete own comments"
  on public.card_comments for delete
  using (user_id = auth.uid());

-- ============================================================
-- 11. RECURRING TASKS
-- ============================================================
alter table public.cards add column recurrence_interval int;
alter table public.cards add column recurrence_unit text check (recurrence_unit in ('days', 'weeks', 'months'));
alter table public.cards add column recurrence_next_due date;

-- ============================================================
-- 12. CARD ACTIVITY LOG
-- ============================================================
create table public.card_activity (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_name text not null default '',
  action text not null,
  detail text,
  created_at timestamptz default now()
);

create index idx_card_activity_card_id on public.card_activity(card_id);

alter table public.card_activity enable row level security;

create policy "Members can view card activity"
  on public.card_activity for select
  to authenticated
  using (
    card_id in (
      select c.id from public.cards c
      where c.board_id in (
        select board_id from public.board_members where user_id = auth.uid()
      )
    )
  );

create policy "Members can create card activity"
  on public.card_activity for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and card_id in (
      select c.id from public.cards c
      where c.board_id in (
        select board_id from public.board_members where user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- 13. CARD ATTACHMENTS
-- ============================================================
create table public.card_attachments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_size bigint not null default 0,
  content_type text not null default '',
  storage_path text not null,
  created_at timestamptz default now()
);

create index idx_card_attachments_card_id on public.card_attachments(card_id);

alter table public.card_attachments enable row level security;

create policy "Members can view attachments"
  on public.card_attachments for select
  to authenticated
  using (
    card_id in (
      select c.id from public.cards c
      where c.board_id in (
        select board_id from public.board_members where user_id = auth.uid()
      )
    )
  );

create policy "Members can upload attachments"
  on public.card_attachments for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and card_id in (
      select c.id from public.cards c
      where c.board_id in (
        select board_id from public.board_members where user_id = auth.uid()
      )
    )
  );

create policy "Users can delete own attachments"
  on public.card_attachments for delete
  to authenticated
  using (user_id = auth.uid());

-- Storage bucket for attachments (run manually if this errors —
-- some Supabase versions need it via Dashboard > Storage > New Bucket)
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict do nothing;

create policy "Authenticated users can upload attachments"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'attachments');

create policy "Authenticated users can read attachments"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'attachments');

create policy "Users can delete own attachments from storage"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- 14. NOTIFICATIONS
-- ============================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  card_id uuid references public.cards(id) on delete cascade,
  board_id uuid references public.boards(id) on delete cascade,
  actor_name text,
  read boolean not null default false,
  created_at timestamptz default now()
);

create index idx_notifications_user_id on public.notifications(user_id);
create index idx_notifications_read on public.notifications(user_id, read);

alter table public.notifications enable row level security;

create policy "Users can view own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "Authenticated users can create notifications"
  on public.notifications for insert
  to authenticated
  with check (true);

create policy "Users can update own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid());

create policy "Users can delete own notifications"
  on public.notifications for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- 15. CARD ARCHIVING
-- ============================================================
alter table public.cards add column archived boolean not null default false;

-- ============================================================
-- 16. COLUMN WIP LIMITS
-- ============================================================
alter table public.columns add column wip_limit int;
