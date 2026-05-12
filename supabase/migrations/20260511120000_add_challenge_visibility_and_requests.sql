alter table public.challenges
add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'friends', 'private'));

create index if not exists challenges_visibility_idx
  on public.challenges (visibility);

create table if not exists public.challenge_join_requests (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default timezone('utc', now()),
  responded_at timestamptz,
  responder_id uuid references auth.users(id) on delete set null,
  unique (challenge_id, requester_id)
);

create index if not exists challenge_join_requests_challenge_idx
  on public.challenge_join_requests (challenge_id, status, created_at desc);

create index if not exists challenge_join_requests_requester_idx
  on public.challenge_join_requests (requester_id, created_at desc);

alter table public.challenge_join_requests enable row level security;

drop policy if exists "challenge_join_requests_select" on public.challenge_join_requests;
create policy "challenge_join_requests_select"
on public.challenge_join_requests for select
to authenticated
using (
  auth.uid() = requester_id
  or exists (
    select 1
    from public.challenges c
    where c.id = challenge_join_requests.challenge_id
      and c.created_by = auth.uid()
  )
);

drop policy if exists "challenge_join_requests_insert_own" on public.challenge_join_requests;
create policy "challenge_join_requests_insert_own"
on public.challenge_join_requests for insert
to authenticated
with check (
  auth.uid() = requester_id
  and exists (
    select 1
    from public.challenges c
    where c.id = challenge_join_requests.challenge_id
      and c.created_by <> auth.uid()
  )
);

drop policy if exists "challenge_join_requests_update_admin" on public.challenge_join_requests;
create policy "challenge_join_requests_update_admin"
on public.challenge_join_requests for update
to authenticated
using (
  exists (
    select 1
    from public.challenges c
    where c.id = challenge_join_requests.challenge_id
      and c.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.challenges c
    where c.id = challenge_join_requests.challenge_id
      and c.created_by = auth.uid()
  )
);

drop policy if exists "challenge_join_requests_delete_own_or_admin" on public.challenge_join_requests;
create policy "challenge_join_requests_delete_own_or_admin"
on public.challenge_join_requests for delete
to authenticated
using (
  auth.uid() = requester_id
  or exists (
    select 1
    from public.challenges c
    where c.id = challenge_join_requests.challenge_id
      and c.created_by = auth.uid()
  )
);

drop policy if exists "participants_insert_admin" on public.challenge_participants;
create policy "participants_insert_admin"
on public.challenge_participants for insert
to authenticated
with check (
  exists (
    select 1
    from public.challenges c
    where c.id = challenge_participants.challenge_id
      and c.created_by = auth.uid()
  )
);

drop policy if exists "participants_delete_admin" on public.challenge_participants;
create policy "participants_delete_admin"
on public.challenge_participants for delete
to authenticated
using (
  exists (
    select 1
    from public.challenges c
    where c.id = challenge_participants.challenge_id
      and c.created_by = auth.uid()
  )
);

drop policy if exists "event_participants_insert_challenge_admin" on public.event_participants;
create policy "event_participants_insert_challenge_admin"
on public.event_participants for insert
to authenticated
with check (
  event_type = 'challenge'
  and exists (
    select 1
    from public.challenges c
    where c.id = event_participants.event_id
      and c.created_by = auth.uid()
  )
);
