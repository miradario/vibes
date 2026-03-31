create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  description text,
  duration_days integer,
  participant_count integer not null default 0,
  image_url text,
  host_name text,
  host_image_url text,
  tags text[] not null default '{}'::text[],
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint challenges_duration_days_nonnegative
    check (duration_days is null or duration_days >= 0),
  constraint challenges_participant_count_nonnegative
    check (participant_count >= 0)
);

create index if not exists challenges_created_at_idx
  on public.challenges (created_at desc);

create or replace function public.set_challenges_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_challenges_updated_at on public.challenges;
create trigger set_challenges_updated_at
before update on public.challenges
for each row
execute function public.set_challenges_updated_at();

alter table public.challenges enable row level security;

drop policy if exists "challenges_select_authenticated" on public.challenges;
create policy "challenges_select_authenticated"
on public.challenges
for select
to authenticated
using (true);

drop policy if exists "challenges_insert_own" on public.challenges;
create policy "challenges_insert_own"
on public.challenges
for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists "challenges_update_own" on public.challenges;
create policy "challenges_update_own"
on public.challenges
for update
to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "challenges_delete_own" on public.challenges;
create policy "challenges_delete_own"
on public.challenges
for delete
to authenticated
using (auth.uid() = created_by);
