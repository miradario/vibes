create table public.challenge_days (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  day integer not null check (day >= 1),
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '' check (char_length(description) <= 10000),
  attachments jsonb not null default '[]' check (jsonb_typeof(attachments) = 'array' and jsonb_array_length(attachments) <= 20),
  revision integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (challenge_id, day)
);
alter table public.challenge_days enable row level security;

create function public.can_read_challenge_day(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and (
    exists (select 1 from public.challenges c where c.id = target and c.created_by = (select auth.uid()))
    or exists (select 1 from public.challenge_participants p where p.challenge_id = target and p.user_id = (select auth.uid()))
  );
$$;
revoke all on function public.can_read_challenge_day(uuid) from public, anon;
grant execute on function public.can_read_challenge_day(uuid) to authenticated;
create policy challenge_days_read on public.challenge_days for select to authenticated
using (public.can_read_challenge_day(challenge_id));
revoke all on public.challenge_days from anon, authenticated;
grant select on public.challenge_days to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('challenge-day-media', 'challenge-day-media', false, 26214400,
 array['image/jpeg','image/png','image/webp','image/heic','image/heif','audio/mpeg','audio/mp3','audio/mp4','audio/x-m4a','audio/aac','audio/wav','audio/x-wav','audio/ogg','audio/webm']);

create function public.challenge_day_media_access(object_name text, editing boolean) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare challenge uuid; day_number integer;
begin
  if object_name !~ '^[0-9a-f-]{36}/[0-9]+/[0-9a-f-]{36}/[0-9a-f-]{36}\.[a-z0-9]+$' then return false; end if;
  begin
    challenge := split_part(object_name, '/', 1)::uuid;
    day_number := split_part(object_name, '/', 2)::integer;
  exception when invalid_text_representation or numeric_value_out_of_range then return false; end;
  if editing then
    return split_part(object_name, '/', 3) = (select auth.uid())::text and exists (
      select 1 from public.challenges c where c.id = challenge and c.created_by = (select auth.uid())
      and day_number between 1 and greatest(coalesce(c.duration_days, 1), 1));
  end if;
  return public.can_read_challenge_day(challenge) and (
    exists(select 1 from public.challenges c where c.id = challenge and c.created_by = (select auth.uid()))
    or exists(select 1 from public.challenge_days d where d.challenge_id = challenge and d.day = day_number
      and d.attachments @> jsonb_build_array(jsonb_build_object('path', object_name)))
  );
end;
$$;
revoke all on function public.challenge_day_media_access(text,boolean) from public,anon;
grant execute on function public.challenge_day_media_access(text,boolean) to authenticated;
create policy challenge_day_media_read on storage.objects for select to authenticated
using (bucket_id = 'challenge-day-media' and public.challenge_day_media_access(name, false));
create policy challenge_day_media_insert on storage.objects for insert to authenticated
with check (bucket_id = 'challenge-day-media' and public.challenge_day_media_access(name, true));
-- No overwrites. A retry reuses its already uploaded immutable object.
create policy challenge_day_media_delete on storage.objects for delete to authenticated
using (bucket_id = 'challenge-day-media' and public.challenge_day_media_access(name, true)
  and not exists(select 1 from public.challenge_days d where d.challenge_id::text = split_part(name, '/', 1)
    and d.attachments @> jsonb_build_array(jsonb_build_object('path', name))));

create function public.save_challenge_day(target_challenge uuid, target_day integer, new_title text,
  new_description text, new_attachments jsonb, expected_revision integer)
returns public.challenge_days language plpgsql security definer set search_path = '' as $$
declare result public.challenge_days; duration integer; current_revision integer; attachment jsonb; attachment_path text;
begin
  select greatest(coalesce(c.duration_days, 1), 1) into duration from public.challenges c
  where c.id = target_challenge and c.created_by = (select auth.uid()) for update;
  if not found then raise exception 'Solo el creador puede personalizar el día'; end if;
  if target_day is null or target_day not between 1 and duration then raise exception 'Día inválido'; end if;
  if new_title is null or char_length(trim(new_title)) not between 1 and 160 or new_description is null or char_length(new_description) > 10000 then
    raise exception 'Revisá el título y la consigna'; end if;
  if new_attachments is null or jsonb_typeof(new_attachments) <> 'array' or jsonb_array_length(new_attachments) > 20 then
    raise exception 'Podés adjuntar hasta 20 contenidos'; end if;
  if (select count(distinct a->>'id') from jsonb_array_elements(new_attachments) a) <> jsonb_array_length(new_attachments) then
    raise exception 'Contenidos duplicados o sin identificador'; end if;
  for attachment in select * from jsonb_array_elements(new_attachments) loop
    if coalesce(attachment->>'id','') !~ '^[0-9a-f-]{36}$' or coalesce(attachment->>'type','') not in ('photo','audio','link')
      or char_length(coalesce(attachment->>'name','')) > 240 then raise exception 'Contenido inválido'; end if;
    if attachment->>'type' = 'link' then
      if coalesce(attachment->>'url','') !~ '^https?://[^[:space:]]+\.[^[:space:]]+' or char_length(attachment->>'url') > 2048 then raise exception 'Enlace inválido'; end if;
    else
      attachment_path := attachment->>'path';
      if attachment_path is null or not public.challenge_day_media_access(attachment_path, true)
        or split_part(attachment_path, '/', 1) <> target_challenge::text
        or split_part(attachment_path, '/', 2) <> target_day::text
        or split_part(split_part(attachment_path, '/', 4), '.', 1) <> attachment->>'id'
        or not exists(select 1 from storage.objects o where o.bucket_id = 'challenge-day-media' and o.name = attachment_path
          and (o.metadata->>'size')::bigint between 1 and case when attachment->>'type' = 'photo' then 10485760 else 26214400 end
          and o.metadata->>'mimetype' = attachment->>'mime'
          and o.metadata->>'mimetype' like case when attachment->>'type' = 'photo' then 'image/%' else 'audio/%' end)
      then raise exception 'El archivo no está subido o no pertenece a este día'; end if;
    end if;
  end loop;
  select revision into current_revision from public.challenge_days where challenge_id = target_challenge and day = target_day;
  if expected_revision is null or coalesce(current_revision,0) <> expected_revision then
    raise exception 'Este día cambió en otro dispositivo. Tu borrador se conserva; revisá la versión publicada antes de reemplazarla.' using errcode = '40001'; end if;
  insert into public.challenge_days(challenge_id,day,title,description,attachments,revision)
    values(target_challenge,target_day,trim(new_title),trim(new_description),new_attachments,1)
    on conflict(challenge_id,day) do update set title=excluded.title,description=excluded.description,
      attachments=excluded.attachments,revision=challenge_days.revision+1,updated_at=now()
    returning * into result;
  return result;
end;
$$;
revoke all on function public.save_challenge_day(uuid,integer,text,text,jsonb,integer) from public,anon;
grant execute on function public.save_challenge_day(uuid,integer,text,text,jsonb,integer) to authenticated;
