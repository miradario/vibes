-- Day 0 holds content shared by all days; daily records and check-ins remain unchanged.
begin;
alter table public.challenge_days drop constraint if exists challenge_days_day_check;
alter table public.challenge_days add constraint challenge_days_day_check check (day >= 0) not valid;
alter table public.challenge_days validate constraint challenge_days_day_check;
comment on column public.challenge_days.day is '0 = shared content for all days; 1..duration_days = daily content.';

create or replace function public.challenge_day_media_access(object_name text, editing boolean) returns boolean
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
      and day_number between 0 and greatest(coalesce(c.duration_days, 1), 1));
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

create or replace function public.save_challenge_day(target_challenge uuid, target_day integer, new_title text,
  new_description text, new_attachments jsonb, expected_revision integer)
returns public.challenge_days language plpgsql security definer set search_path = '' as $$
declare result public.challenge_days; duration integer; current_revision integer; attachment jsonb; attachment_path text;
begin
  select greatest(coalesce(c.duration_days, 1), 1) into duration from public.challenges c
  where c.id = target_challenge and c.created_by = (select auth.uid()) for update;
  if not found then raise exception 'Solo el creador puede personalizar el día'; end if;
  if target_day is null or target_day not between 0 and duration then raise exception 'Día inválido'; end if;
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

notify pgrst, 'reload schema';
commit;
