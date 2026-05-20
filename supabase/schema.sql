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
  primary key (board_id, user_id),
  -- Second FK to public.profiles so PostgREST can embed `profiles(...)`
  -- from board_members. Without this, embeds silently return null
  -- because PostgREST won't traverse the auth.users FK across schemas.
  constraint board_members_user_id_profiles_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade
);

alter table public.board_members enable row level security;

-- Board RLS: users can see boards they're members of
create policy "Members can view boards"
  on public.boards for select
  to authenticated
  using (
    id in (select get_my_board_ids())
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

create policy "Invitees can view boards they are invited to"
  on public.boards for select
  to authenticated
  using (
    id in (select get_my_invited_board_ids())
  );

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

-- Helper: bypasses RLS to look up card IDs the user can access
create or replace function public.get_my_card_ids()
returns setof uuid
language sql
security definer
stable
set search_path = ''
as $$
  select c.id from public.cards c
  where c.board_id in (
    select board_id from public.board_members where user_id = auth.uid()
  )
$$;

-- Helper: bypasses RLS to look up boards the user is invited to
create or replace function public.get_my_invited_board_ids()
returns setof uuid
language sql
security definer
stable
set search_path = ''
as $$
  select board_id from public.board_invitations
  where invited_email = (select auth.jwt()->>'email')
  and status = 'pending'
$$;

-- Label management functions
create or replace function public.upsert_label(
  p_board_id uuid,
  p_text     text,
  p_color    text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_text  text := trim(p_text);
  v_color text := p_color;
  v_id    uuid;
begin
  if v_text = '' or v_text is null then
    raise exception 'label text required';
  end if;

  select id into v_id
  from public.labels
  where board_id = p_board_id
    and lower(text) = lower(v_text)
    and archived_at is null
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  if v_color is null then
    v_color := (array['red','orange','yellow','green','blue','purple','pink','gray'])
               [(abs(hashtext(lower(v_text))) % 8) + 1];
  end if;

  if v_color not in ('red','orange','yellow','green','blue','purple','pink','gray') then
    v_color := 'gray';
  end if;

  insert into public.labels (board_id, text, color)
  values (p_board_id, v_text, v_color)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.upsert_label(uuid, text, text) to authenticated;

create or replace function public.attach_label_by_text(
  p_card_id  uuid,
  p_text     text,
  p_color    text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_board_id uuid;
  v_label_id uuid;
begin
  select board_id into v_board_id from public.cards where id = p_card_id;
  if v_board_id is null then
    raise exception 'card not found';
  end if;

  v_label_id := public.upsert_label(v_board_id, p_text, p_color);

  insert into public.card_labels (card_id, label_id)
  values (p_card_id, v_label_id)
  on conflict (card_id, label_id) do nothing;

  return v_label_id;
end;
$$;

grant execute on function public.attach_label_by_text(uuid, text, text) to authenticated;

create or replace function public.merge_labels(
  p_from_id uuid,
  p_into_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from_board uuid;
  v_into_board uuid;
begin
  if p_from_id = p_into_id then
    raise exception 'cannot merge label into itself';
  end if;
  select board_id into v_from_board from public.labels where id = p_from_id;
  select board_id into v_into_board from public.labels where id = p_into_id;
  if v_from_board is null or v_into_board is null then
    raise exception 'label not found';
  end if;
  if v_from_board <> v_into_board then
    raise exception 'cannot merge labels across boards';
  end if;

  insert into public.card_labels (card_id, label_id)
  select card_id, p_into_id from public.card_labels where label_id = p_from_id
  on conflict (card_id, label_id) do nothing;

  delete from public.card_labels where label_id = p_from_id;
  delete from public.labels       where id       = p_from_id;
end;
$$;

grant execute on function public.merge_labels(uuid, uuid) to authenticated;

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

create policy "Invited users can join boards"
  on public.board_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and role = 'member'
    and board_id in (select get_my_invited_board_ids())
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
-- 5.1 LABELS (per-board label registry)
-- ============================================================
create table public.labels (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  text text not null check (length(trim(text)) > 0 and length(text) <= 64),
  color text not null check (color in ('red','orange','yellow','green','blue','purple','pink','gray')),
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create unique index labels_board_text_lower_uq
  on public.labels (board_id, lower(text))
  where archived_at is null;

create index labels_board_id_idx on public.labels (board_id);

alter table public.labels enable row level security;

create policy labels_select on public.labels for select
  using (board_id in (select get_my_board_ids()));
create policy labels_insert on public.labels for insert
  with check (board_id in (select get_my_board_ids()));
create policy labels_update on public.labels for update
  using (board_id in (select get_my_board_ids()));
create policy labels_delete on public.labels for delete
  using (board_id in (select get_my_board_ids()));

-- ============================================================
-- 5.2 CARD_LABELS (card ↔ label join)
-- ============================================================
create table public.card_labels (
  card_id uuid not null references public.cards(id) on delete cascade,
  label_id uuid not null references public.labels(id) on delete cascade,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  primary key (card_id, label_id)
);

create index card_labels_label_id_idx on public.card_labels (label_id);

alter table public.card_labels enable row level security;

create policy card_labels_select on public.card_labels for select
  using (card_id in (
    select c.id from public.cards c where c.board_id in (select get_my_board_ids())
  ));
create policy card_labels_insert on public.card_labels for insert
  with check (card_id in (
    select c.id from public.cards c where c.board_id in (select get_my_board_ids())
  ));
create policy card_labels_delete on public.card_labels for delete
  using (card_id in (
    select c.id from public.cards c where c.board_id in (select get_my_board_ids())
  ));

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
  created_at timestamptz default now()
);

-- Partial unique: only one PENDING invite per (board, email). Historical
-- accepted/declined rows can coexist so re-inviting after removal works.
create unique index if not exists
  board_invitations_pending_unique_idx
  on public.board_invitations (board_id, invited_email)
  where status = 'pending';

alter table public.board_invitations enable row level security;

create policy "Board owners and invitees can view invitations"
  on public.board_invitations for select
  to authenticated
  using (
    board_id in (select get_my_board_ids())
    or invited_email = (auth.jwt()->>'email')
  );

create policy "Board owners can create invitations"
  on public.board_invitations for insert
  to authenticated
  with check (
    board_id in (select id from public.boards where owner_id = auth.uid())
  );

create policy "Board owners and invitees can update invitations"
  on public.board_invitations for update
  to authenticated
  using (
    board_id in (select get_my_board_ids())
    or invited_email = (auth.jwt()->>'email')
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
alter publication supabase_realtime add table public.board_invitations;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.workspaces;
alter publication supabase_realtime add table public.workspace_members;
alter publication supabase_realtime add table public.workspace_invitations;

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
  to authenticated
  using (card_id in (select get_my_card_ids()));

create policy "Members can create comments"
  on public.card_comments for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and card_id in (select get_my_card_ids())
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
  using (card_id in (select get_my_card_ids()));

create policy "Members can create card activity"
  on public.card_activity for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and card_id in (select get_my_card_ids())
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
  using (card_id in (select get_my_card_ids()));

create policy "Members can upload attachments"
  on public.card_attachments for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and card_id in (select get_my_card_ids())
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

-- ============================================================
-- 17. AUTH RATE LIMITS (gates the `check-email` edge function)
-- ============================================================
-- Shared Postgres state for rate-limiting unauthenticated auth helpers
-- (currently: the email-existence check used by the landing sign-in
-- card). The edge function calls public.check_rate_limit with its
-- service-role key before doing any user lookup.
create table if not exists public.auth_rate_limits (
  bucket text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

alter table public.auth_rate_limits enable row level security;

create or replace function public.check_rate_limit(
  p_bucket text,
  p_max int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_now timestamptz := now();
begin
  insert into public.auth_rate_limits (bucket, count, window_start)
  values (p_bucket, 1, v_now)
  on conflict (bucket) do update
    set count = case
                  when public.auth_rate_limits.window_start <
                       v_now - make_interval(secs => p_window_seconds)
                    then 1
                  else public.auth_rate_limits.count + 1
                end,
        window_start = case
                         when public.auth_rate_limits.window_start <
                              v_now - make_interval(secs => p_window_seconds)
                           then v_now
                         else public.auth_rate_limits.window_start
                       end
  returning count into v_count;

  return v_count <= p_max;
end;
$$;

-- IMPORTANT: revoking from PUBLIC alone is insufficient. Supabase
-- grants EXECUTE directly to anon + authenticated via default
-- privileges. Revoke from the named roles or anon can bypass the
-- edge function via /rest/v1/rpc/check_rate_limit.
revoke all on function public.check_rate_limit(text, int, int) from public;
revoke execute on function public.check_rate_limit(text, int, int)
  from anon, authenticated;
grant execute on function public.check_rate_limit(text, int, int)
  to service_role;

-- Lookup helper for the check-email edge function. SECURITY DEFINER
-- because PostgREST does not expose the auth schema.
create or replace function public.lookup_email_exists(p_email text)
returns boolean
language sql
security definer
set search_path = public, auth
stable
as $$
  select exists (
    select 1 from auth.users
    where lower(email) = lower(p_email)
  );
$$;

revoke all on function public.lookup_email_exists(text) from public;
revoke execute on function public.lookup_email_exists(text)
  from anon, authenticated;
grant execute on function public.lookup_email_exists(text) to service_role;

-- Deny-all RLS policies on auth_rate_limits — RLS is on with no
-- policies already denies, but explicit policies silence the advisor
-- lint and document intent.
create policy "deny all anon select" on public.auth_rate_limits
  for select to anon using (false);
create policy "deny all anon insert" on public.auth_rate_limits
  for insert to anon with check (false);
create policy "deny all anon update" on public.auth_rate_limits
  for update to anon using (false);
create policy "deny all anon delete" on public.auth_rate_limits
  for delete to anon using (false);
create policy "deny all auth select" on public.auth_rate_limits
  for select to authenticated using (false);
create policy "deny all auth insert" on public.auth_rate_limits
  for insert to authenticated with check (false);
create policy "deny all auth update" on public.auth_rate_limits
  for update to authenticated using (false);
create policy "deny all auth delete" on public.auth_rate_limits
  for delete to authenticated using (false);
