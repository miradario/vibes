-- ===================================================
-- Ensure RLS policies exist for matches, messages, and swipes
-- ===================================================

-- matches: enable RLS
alter table public.matches enable row level security;

-- Drop + recreate to be idempotent
drop policy if exists "matches_select_own" on public.matches;
create policy "matches_select_own" on public.matches
  for select using (
    auth.uid() = user1_id or auth.uid() = user2_id
  );

drop policy if exists "matches_insert" on public.matches;
create policy "matches_insert" on public.matches
  for insert with check (
    auth.uid() = user1_id or auth.uid() = user2_id
  );

drop policy if exists "matches_update_own" on public.matches;
create policy "matches_update_own" on public.matches
  for update using (
    auth.uid() = user1_id or auth.uid() = user2_id
  );

drop policy if exists "matches_delete_own" on public.matches;
create policy "matches_delete_own" on public.matches
  for delete using (
    auth.uid() = user1_id or auth.uid() = user2_id
  );

-- messages: enable RLS
alter table public.messages enable row level security;

-- Select: match participants can read messages
drop policy if exists "messages_select_participant" on public.messages;
create policy "messages_select_participant" on public.messages
  for select using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
    )
  );

-- Insert: only match participants can send
drop policy if exists "messages_insert_participant" on public.messages;
create policy "messages_insert_participant" on public.messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
    )
  );

-- Delete: sender can delete own messages
drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own" on public.messages
  for delete using (
    auth.uid() = sender_id
  );

-- swipes: enable RLS
alter table public.swipes enable row level security;

-- Users can see their own swipes
drop policy if exists "swipes_select_own" on public.swipes;
create policy "swipes_select_own" on public.swipes
  for select using (
    auth.uid() = swiper_id or auth.uid() = target_id
  );

-- Users can insert their own swipes
drop policy if exists "swipes_insert_own" on public.swipes;
create policy "swipes_insert_own" on public.swipes
  for insert with check (
    auth.uid() = swiper_id
  );

-- Users can delete their own swipes
drop policy if exists "swipes_delete_own" on public.swipes;
create policy "swipes_delete_own" on public.swipes
  for delete using (
    auth.uid() = swiper_id
  );
