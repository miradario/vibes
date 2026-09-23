-- Qualify the outer object path: unqualified name resolves to community_groups.name.
begin;
drop policy if exists group_photos_read on storage.objects;
drop policy if exists group_photos_insert on storage.objects;
drop policy if exists group_photos_delete on storage.objects;

create policy group_photos_read on storage.objects for select to authenticated
using (bucket_id = 'community-group-photos' and exists (
  select 1 from public.community_groups g
  where g.id::text = (storage.foldername(storage.objects.name))[1]
    and public.is_community_group_member(g.id)
));
create policy group_photos_insert on storage.objects for insert to authenticated
with check (bucket_id = 'community-group-photos' and exists (
  select 1 from public.community_groups g
  where g.id::text = (storage.foldername(storage.objects.name))[1] and g.created_by = (select auth.uid())
));
create policy group_photos_delete on storage.objects for delete to authenticated
using (bucket_id = 'community-group-photos' and exists (
  select 1 from public.community_groups g
  where g.id::text = (storage.foldername(storage.objects.name))[1] and g.created_by = (select auth.uid())
));

commit;
