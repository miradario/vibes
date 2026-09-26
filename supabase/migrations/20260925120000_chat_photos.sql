-- Private photos: kind/conversation/uploader/random-id.ext.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-photos', 'chat-photos', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp']) on conflict (id) do nothing;

create function public.can_access_chat_photo(kind text, conversation text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare conversation_id uuid;
begin
  begin
    conversation_id := conversation::uuid;
  exception when invalid_text_representation then return false;
  end;
  return (select auth.uid()) is not null and case
    when kind = 'direct' then exists (
      select 1 from public.matches m where m.id = conversation_id
      and m.is_active and (select auth.uid()) in (m.user1_id, m.user2_id))
    when kind = 'group' then exists (
      select 1 from public.community_group_members m where m.group_id = conversation_id
      and m.user_id = (select auth.uid()))
    when kind in ('event', 'challenge') then exists (
      select 1 from public.event_participants p where p.event_id = conversation_id
      and p.event_type = kind and p.user_id = (select auth.uid()))
      or (kind = 'challenge' and exists (
        select 1 from public.challenge_participants p where p.challenge_id = conversation_id
        and p.user_id = (select auth.uid())))
    else false end;
end;
$$;
revoke all on function public.can_access_chat_photo(text, text) from public, anon;
grant execute on function public.can_access_chat_photo(text, text) to authenticated;

create policy chat_photos_read on storage.objects for select to authenticated
using (bucket_id = 'chat-photos' and public.can_access_chat_photo(
  (storage.foldername(name))[1], (storage.foldername(name))[2]));

create policy chat_photos_insert on storage.objects for insert to authenticated
with check (bucket_id = 'chat-photos'
  and (storage.foldername(name))[3] = (select auth.uid())::text
  and array_length(storage.foldername(name), 1) = 3
  and public.can_access_chat_photo((storage.foldername(name))[1], (storage.foldername(name))[2]));

create policy chat_photos_delete on storage.objects for delete to authenticated
using (bucket_id = 'chat-photos' and owner_id = (select auth.uid())::text);
