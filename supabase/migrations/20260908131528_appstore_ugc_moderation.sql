create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  details text,
  created_at timestamptz not null default now(),
  constraint user_blocks_no_self check (blocker_id <> blocked_user_id),
  constraint user_blocks_unique_pair unique (blocker_id, blocked_user_id)
);

create index if not exists idx_user_blocks_blocker
  on public.user_blocks(blocker_id);

create index if not exists idx_user_blocks_blocked_user
  on public.user_blocks(blocked_user_id);

alter table public.user_blocks enable row level security;

drop policy if exists "user_blocks_select_own" on public.user_blocks;
create policy "user_blocks_select_own"
on public.user_blocks for select
to authenticated
using (auth.uid() = blocker_id or auth.uid() = blocked_user_id);

drop policy if exists "user_blocks_insert_own" on public.user_blocks;
create policy "user_blocks_insert_own"
on public.user_blocks for insert
to authenticated
with check (auth.uid() = blocker_id);

drop policy if exists "user_blocks_update_own" on public.user_blocks;
create policy "user_blocks_update_own"
on public.user_blocks for update
to authenticated
using (auth.uid() = blocker_id)
with check (auth.uid() = blocker_id);

drop policy if exists "user_blocks_delete_own" on public.user_blocks;
create policy "user_blocks_delete_own"
on public.user_blocks for delete
to authenticated
using (auth.uid() = blocker_id);

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  content_type text not null check (content_type in ('profile', 'direct_message', 'event_message', 'event', 'challenge')),
  content_id uuid not null,
  event_id uuid,
  event_type text check (event_type is null or event_type in ('event', 'challenge')),
  reason text not null,
  details text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'removed', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint content_reports_no_self check (reporter_id <> reported_user_id)
);

create index if not exists idx_content_reports_reporter
  on public.content_reports(reporter_id);

create index if not exists idx_content_reports_reported_user
  on public.content_reports(reported_user_id);

create index if not exists idx_content_reports_status_created
  on public.content_reports(status, created_at desc);

alter table public.content_reports enable row level security;

drop policy if exists "content_reports_insert_own" on public.content_reports;
create policy "content_reports_insert_own"
on public.content_reports for insert
to authenticated
with check (auth.uid() = reporter_id);

drop policy if exists "content_reports_select_own" on public.content_reports;
create policy "content_reports_select_own"
on public.content_reports for select
to authenticated
using (auth.uid() = reporter_id);
