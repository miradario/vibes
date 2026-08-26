-- Re-assert the policies required by the event creation flow. This migration is
-- intentionally idempotent so environments that missed the original event
-- migrations can be repaired safely.

insert into storage.buckets (id, name, public)
values ('event-assets', 'event-assets', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "event_assets_public_read" on storage.objects;
create policy "event_assets_public_read"
on storage.objects for select
to public
using (bucket_id = 'event-assets');

drop policy if exists "event_assets_authenticated_upload" on storage.objects;
create policy "event_assets_authenticated_upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'event-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "event_assets_authenticated_update" on storage.objects;
create policy "event_assets_authenticated_update"
on storage.objects for update
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
on storage.objects for delete
to authenticated
using (
  bucket_id = 'event-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);

alter table public.events enable row level security;
grant select, insert, update, delete on table public.events to authenticated;

drop policy if exists "events_select_authenticated" on public.events;
create policy "events_select_authenticated"
on public.events for select
to authenticated
using (true);

drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own"
on public.events for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists "events_update_own" on public.events;
create policy "events_update_own"
on public.events for update
to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

drop policy if exists "events_delete_own" on public.events;
create policy "events_delete_own"
on public.events for delete
to authenticated
using (auth.uid() = created_by);

alter table public.event_participants enable row level security;
grant select, insert, update, delete on table public.event_participants to authenticated;

drop policy if exists "event_participants_select" on public.event_participants;
create policy "event_participants_select"
on public.event_participants for select
to authenticated
using (true);

drop policy if exists "event_participants_insert" on public.event_participants;
create policy "event_participants_insert"
on public.event_participants for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "event_participants_update_own" on public.event_participants;
create policy "event_participants_update_own"
on public.event_participants for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "event_participants_delete" on public.event_participants;
create policy "event_participants_delete"
on public.event_participants for delete
to authenticated
using (auth.uid() = user_id);
