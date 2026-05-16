-- Ensure authenticated app users can still use Vibes after revoking public DB access.
-- RLS remains enabled; these grants only allow policies to be evaluated.

grant usage on schema public to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'profile_photos',
    'user_preferences',
    'swipes',
    'matches',
    'messages',
    'direct_messages',
    'direct_message_reads',
    'events',
    'event_participants',
    'event_messages',
    'event_group_reads',
    'challenges',
    'challenge_participants',
    'challenge_checkins',
    'challenge_join_requests',
    'challenge_ai_messages',
    'meditation_presence',
    'push_tokens',
    'user_reports'
  ] loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    end if;
  end loop;
end $$;

create table if not exists public.direct_message_reads (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

create index if not exists direct_message_reads_user_id_idx
  on public.direct_message_reads(user_id);

alter table public.direct_message_reads enable row level security;
grant select, insert, update, delete on table public.direct_message_reads to authenticated;

drop policy if exists "direct_message_reads_select_own" on public.direct_message_reads;
create policy "direct_message_reads_select_own"
on public.direct_message_reads
for select
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.matches m
    where m.id = match_id
      and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
  )
);

drop policy if exists "direct_message_reads_insert_own" on public.direct_message_reads;
create policy "direct_message_reads_insert_own"
on public.direct_message_reads
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.matches m
    where m.id = match_id
      and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
  )
);

drop policy if exists "direct_message_reads_update_own" on public.direct_message_reads;
create policy "direct_message_reads_update_own"
on public.direct_message_reads
for update
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.matches m
    where m.id = match_id
      and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.matches m
    where m.id = match_id
      and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
  )
);

create table if not exists public.event_group_reads (
  event_id uuid not null,
  event_type text not null check (event_type in ('event', 'challenge')),
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, event_type, user_id)
);

create index if not exists event_group_reads_user_id_idx
  on public.event_group_reads(user_id);

alter table public.event_group_reads enable row level security;
grant select, insert, update, delete on table public.event_group_reads to authenticated;

drop policy if exists "event_group_reads_select_own" on public.event_group_reads;
create policy "event_group_reads_select_own"
on public.event_group_reads
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "event_group_reads_insert_own" on public.event_group_reads;
create policy "event_group_reads_insert_own"
on public.event_group_reads
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "event_group_reads_update_own" on public.event_group_reads;
create policy "event_group_reads_update_own"
on public.event_group_reads
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "event_group_reads_delete_own" on public.event_group_reads;
create policy "event_group_reads_delete_own"
on public.event_group_reads
for delete
to authenticated
using (auth.uid() = user_id);

-- Keep the storage expectations aligned with the app:
-- profile pictures are private and read through signed URLs;
-- event assets use public URLs returned by getPublicUrl.
update storage.buckets
set public = false
where id = 'profile pictures';

update storage.buckets
set public = true
where id = 'event-assets';
