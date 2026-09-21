alter table public.community_groups add column if not exists photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-group-photos', 'community-group-photos', false, 10485760,
  array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;

create policy group_photos_read on storage.objects for select to authenticated
using (bucket_id = 'community-group-photos' and exists (
  select 1 from public.community_groups g
  where g.id::text = (storage.foldername(name))[1]
    and public.is_community_group_member(g.id)
));
create policy group_photos_insert on storage.objects for insert to authenticated
with check (bucket_id = 'community-group-photos' and exists (
  select 1 from public.community_groups g
  where g.id::text = (storage.foldername(name))[1] and g.created_by = (select auth.uid())
));
create policy group_photos_delete on storage.objects for delete to authenticated
using (bucket_id = 'community-group-photos' and exists (
  select 1 from public.community_groups g
  where g.id::text = (storage.foldername(name))[1] and g.created_by = (select auth.uid())
));

create function public.set_community_group_photo(target_group uuid, new_path text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.community_groups
  where id = target_group and created_by = (select auth.uid()) for update;
  if not found then raise exception 'Solo quien administra el grupo puede cambiar su foto'; end if;
  if split_part(new_path, '/', 1) <> target_group::text or not exists (
    select 1 from storage.objects where bucket_id = 'community-group-photos' and name = new_path
  ) then raise exception 'Foto de grupo inválida'; end if;
  update public.community_groups set photo_path = new_path where id = target_group;
end;
$$;
revoke all on function public.set_community_group_photo(uuid,text) from public, anon;
grant execute on function public.set_community_group_photo(uuid,text) to authenticated;
