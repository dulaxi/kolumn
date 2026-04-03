-- ============================================================
-- Security fix: tighten overly permissive RLS policies
-- Run this against your Supabase project via SQL Editor
-- ============================================================

-- 1. Storage upload: scope to user's own folder
--    Old policy allowed any authenticated user to upload to ANY path.
--    New policy requires the first folder segment to match auth.uid().
drop policy if exists "Authenticated users can upload attachments" on storage.objects;

create policy "Users can upload to own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2. Storage read: scope to boards the user is a member of
--    Old policy let any authenticated user read ANY attachment.
--    New policy scopes reads to the user's own folder.
drop policy if exists "Authenticated users can read attachments" on storage.objects;

create policy "Users can read own attachments"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Notification INSERT: require board membership
--    Old policy: with check (true) — any user can notify any user.
--    New policy: only allow inserts for boards the user is a member of.
drop policy if exists "Authenticated users can create notifications" on public.notifications;

create policy "Board members can create notifications"
  on public.notifications for insert
  to authenticated
  with check (
    board_id is null
    or board_id in (
      select board_id from public.board_members where user_id = auth.uid()
    )
  );
