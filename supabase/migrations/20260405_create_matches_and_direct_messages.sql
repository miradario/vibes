-- ===================================================
-- Migration: matches & direct_messages tables
-- ===================================================

-- 1. matches table – tracks mutual "like" connections
create table if not exists public.matches (
  id          uuid primary key default gen_random_uuid(),
  user1_id    uuid not null references auth.users(id) on delete cascade,
  user2_id    uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  -- ensure unique pair regardless of order
  constraint matches_unique_pair unique (user1_id, user2_id),
  -- prevent self-match
  constraint matches_no_self check (user1_id <> user2_id)
);

-- always store with smaller uuid first so the unique constraint works both ways
create or replace function public.normalize_match_order()
returns trigger as $$
begin
  if new.user1_id > new.user2_id then
    declare tmp uuid;
    begin
      tmp := new.user1_id;
      new.user1_id := new.user2_id;
      new.user2_id := tmp;
    end;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_normalize_match_order
  before insert on public.matches
  for each row execute function public.normalize_match_order();

-- Indexes
create index if not exists idx_matches_user1 on public.matches(user1_id);
create index if not exists idx_matches_user2 on public.matches(user2_id);

-- RLS
alter table public.matches enable row level security;

-- Both participants can see their own matches
create policy "matches_select_own" on public.matches
  for select using (
    auth.uid() = user1_id or auth.uid() = user2_id
  );

-- Authenticated users can insert matches (after mutual like)
create policy "matches_insert" on public.matches
  for insert with check (
    auth.uid() = user1_id or auth.uid() = user2_id
  );

-- Either participant can delete (unmatch)
create policy "matches_delete_own" on public.matches
  for delete using (
    auth.uid() = user1_id or auth.uid() = user2_id
  );


-- 2. direct_messages table
create table if not exists public.direct_messages (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references public.matches(id) on delete cascade,
  sender_id   uuid not null references auth.users(id) on delete cascade,
  body        text not null check (char_length(body) <= 2000),
  created_at  timestamptz not null default now()
);

create index if not exists idx_dm_match_id on public.direct_messages(match_id);
create index if not exists idx_dm_created on public.direct_messages(match_id, created_at);

-- RLS
alter table public.direct_messages enable row level security;

-- Only match participants can read messages
create policy "dm_select_participant" on public.direct_messages
  for select using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
    )
  );

-- Only match participants can send messages
create policy "dm_insert_participant" on public.direct_messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
    )
  );

-- Sender can delete own messages
create policy "dm_delete_own" on public.direct_messages
  for delete using (sender_id = auth.uid());

-- Enable Realtime for direct_messages
alter publication supabase_realtime add table public.direct_messages;
