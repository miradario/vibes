create table if not exists public.meditation_presence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  presence_date date not null default (timezone('utc', now()))::date,
  duration_minutes integer not null check (duration_minutes in (5, 10, 20)),
  meditation_type text not null check (meditation_type in ('silent', 'guided')),
  visibility text not null default 'friends'
    check (visibility in ('public', 'friends', 'private')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, presence_date)
);

create index if not exists meditation_presence_date_idx
  on public.meditation_presence (presence_date desc);

create index if not exists meditation_presence_user_idx
  on public.meditation_presence (user_id, presence_date desc);

alter table public.meditation_presence enable row level security;

drop policy if exists "meditation_presence_select" on public.meditation_presence;
create policy "meditation_presence_select"
on public.meditation_presence for select
to authenticated
using (
  auth.uid() = user_id
  or visibility = 'public'
  or (
    visibility = 'friends'
    and exists (
      select 1
      from public.matches m
      where (
        (m.user1_id = auth.uid() and m.user2_id = meditation_presence.user_id)
        or (m.user2_id = auth.uid() and m.user1_id = meditation_presence.user_id)
      )
    )
  )
);

drop policy if exists "meditation_presence_insert_own" on public.meditation_presence;
create policy "meditation_presence_insert_own"
on public.meditation_presence for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "meditation_presence_update_own" on public.meditation_presence;
create policy "meditation_presence_update_own"
on public.meditation_presence for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
