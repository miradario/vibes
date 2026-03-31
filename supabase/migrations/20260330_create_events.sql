create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('event', 'challenge')),
  title text not null,
  subtitle text,
  description text,
  starts_at timestamptz,
  duration_days integer,
  location text,
  capacity integer not null default 0,
  participant_count integer not null default 0,
  image_url text,
  host_name text,
  host_image_url text,
  tags text[] not null default '{}'::text[],
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists events_type_created_at_idx
  on public.events (type, created_at desc);

create or replace function public.set_events_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
before update on public.events
for each row
execute function public.set_events_updated_at();

alter table public.events enable row level security;

drop policy if exists "events_select_authenticated" on public.events;
create policy "events_select_authenticated"
on public.events
for select
to authenticated
using (true);

drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own"
on public.events
for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists "events_update_own" on public.events;
create policy "events_update_own"
on public.events
for update
to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "events_delete_own" on public.events;
create policy "events_delete_own"
on public.events
for delete
to authenticated
using (auth.uid() = created_by);

insert into storage.buckets (id, name, public)
values ('event-assets', 'event-assets', true)
on conflict (id) do nothing;

drop policy if exists "event_assets_public_read" on storage.objects;
create policy "event_assets_public_read"
on storage.objects
for select
to public
using (bucket_id = 'event-assets');

drop policy if exists "event_assets_authenticated_upload" on storage.objects;
create policy "event_assets_authenticated_upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'event-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "event_assets_authenticated_update" on storage.objects;
create policy "event_assets_authenticated_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'event-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'event-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "event_assets_authenticated_delete" on storage.objects;
create policy "event_assets_authenticated_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'event-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);
