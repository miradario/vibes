-- Recursos generales del desafío (fotos, audios y links), visibles solo para
-- el creador y los participantes. No se agrega una columna en challenges
-- porque esa tabla la pueden leer personas que todavía no se unieron
-- (p. ej. visibilidad public/friends o una invitación pendiente).
begin;

create table public.challenge_resources (
  challenge_id uuid primary key references public.challenges(id) on delete cascade,
  attachments jsonb not null default '[]' check (
    jsonb_typeof(attachments) = 'array' and jsonb_array_length(attachments) <= 20
  ),
  revision integer not null default 1,
  updated_at timestamptz not null default now()
);
comment on table public.challenge_resources is
  'Challenge-level resources (photo/audio/link, max 20). Visible to the host and participants only.';
alter table public.challenge_resources enable row level security;
revoke all on public.challenge_resources from public, anon, authenticated;
grant select on public.challenge_resources to authenticated;
create policy challenge_resources_read on public.challenge_resources
  for select to authenticated
  using (public.can_read_challenge_day(challenge_id));


-- Shared restart/copy visibility checks. Same helpers as the day-media copy
-- migration; CREATE OR REPLACE keeps them identical in either merge order.
create or replace function private.can_restart_source(source_id uuid, caller uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.challenges source
    where source.id = source_id
      and (
        source.created_by = caller
        or coalesce(source.visibility, 'public') = 'public'
        or exists (
          select 1 from public.challenge_participants p
          where p.challenge_id = source_id and p.user_id = caller
        )
        or exists (
          select 1 from public.event_participants ep
          where ep.event_id = source_id and ep.event_type = 'challenge' and ep.user_id = caller
        )
        or exists (
          select 1 from public.challenge_invitations i
          where i.challenge_id = source_id and i.invitee_id = caller
        )
        or (
          source.visibility = 'friends' and exists (
            select 1 from public.matches m
            where (m.user1_id = caller and m.user2_id = source.created_by)
               or (m.user2_id = caller and m.user1_id = source.created_by)
          )
        )
      )
  );
$$;
revoke all on function private.can_restart_source(uuid, uuid) from public, anon, authenticated;

create or replace function private.owns_restart_copy(source_id uuid, target_id uuid, caller uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.challenges copy
    where copy.id = target_id
      and copy.created_by = caller
      and copy.source_challenge_id = source_id
  );
$$;
revoke all on function private.owns_restart_copy(uuid, uuid, uuid) from public, anon, authenticated;

-- Day media stays at {challenge}/{day}/{user}/{id}.ext.
-- Challenge resources use {challenge}/resources/{user}/{id}.ext in the same bucket.
create or replace function public.challenge_day_media_access(object_name text, editing boolean)
returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  challenge uuid;
  day_number integer;
  is_resource boolean := split_part(object_name, '/', 2) = 'resources';
begin
  if is_resource then
    if object_name !~ '^[0-9a-f-]{36}/resources/[0-9a-f-]{36}/[0-9a-f-]{36}\.[a-z0-9]+$' then
      return false;
    end if;
  elsif object_name !~ '^[0-9a-f-]{36}/[0-9]+/[0-9a-f-]{36}/[0-9a-f-]{36}\.[a-z0-9]+$' then
    return false;
  end if;
  begin
    challenge := split_part(object_name, '/', 1)::uuid;
    if not is_resource then
      day_number := split_part(object_name, '/', 2)::integer;
    end if;
  exception when invalid_text_representation or numeric_value_out_of_range then
    return false;
  end;
  if editing then
    return split_part(object_name, '/', 3) = (select auth.uid())::text and exists (
      select 1 from public.challenges c
      where c.id = challenge and c.created_by = (select auth.uid())
        and (is_resource or day_number between 0 and greatest(coalesce(c.duration_days, 1), 1))
    );
  end if;
  if is_resource then
    return (
      public.can_read_challenge_day(challenge) and (
        exists (
          select 1 from public.challenges c
          where c.id = challenge and c.created_by = (select auth.uid())
        )
        or exists (
          select 1 from public.challenge_resources r
          where r.challenge_id = challenge
            and r.attachments @> jsonb_build_array(jsonb_build_object('path', object_name))
        )
      )
    ) or (
      -- Owner of a restart / Por Vibes copy can read source resource files to copy them,
      -- only if they can still see the source challenge (same check as restart).
      private.can_restart_source(challenge, (select auth.uid()))
      and exists (
        select 1 from public.challenges copy
        where copy.created_by = (select auth.uid())
          and copy.source_challenge_id = challenge
      ) and exists (
        select 1 from public.challenge_resources r
        where r.challenge_id = challenge
          and r.attachments @> jsonb_build_array(jsonb_build_object('path', object_name))
      )
    );
  end if;
  return public.can_read_challenge_day(challenge) and (
    exists (
      select 1 from public.challenges c
      where c.id = challenge and c.created_by = (select auth.uid())
    )
    or exists (
      select 1 from public.challenge_days d
      where d.challenge_id = challenge and d.day = day_number
        and d.attachments @> jsonb_build_array(jsonb_build_object('path', object_name))
    )
  );
end;
$$;
revoke all on function public.challenge_day_media_access(text, boolean) from public, anon;
grant execute on function public.challenge_day_media_access(text, boolean) to authenticated;

drop policy if exists challenge_day_media_delete on storage.objects;
create policy challenge_day_media_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'challenge-day-media'
  and public.challenge_day_media_access(name, true)
  and not exists (
    select 1 from public.challenge_days d
    where d.challenge_id::text = split_part(name, '/', 1)
      and d.attachments @> jsonb_build_array(jsonb_build_object('path', name))
  )
  and not exists (
    select 1 from public.challenge_resources r
    where r.challenge_id::text = split_part(name, '/', 1)
      and r.attachments @> jsonb_build_array(jsonb_build_object('path', name))
  )
);

create or replace function public.save_challenge_resources(
  target_challenge uuid,
  new_attachments jsonb,
  expected_revision integer
) returns public.challenge_resources
language plpgsql security definer set search_path = '' as $$
declare
  result public.challenge_resources;
  current_revision integer;
  attachment jsonb;
  attachment_path text;
begin
  perform 1 from public.challenges c
    where c.id = target_challenge and c.created_by = (select auth.uid())
    for update;
  if not found then
    raise exception 'Solo el creador puede editar los recursos';
  end if;
  if new_attachments is null or jsonb_typeof(new_attachments) <> 'array'
    or jsonb_array_length(new_attachments) > 20 then
    raise exception 'Podés adjuntar hasta 20 contenidos';
  end if;
  if (select count(distinct a->>'id') from jsonb_array_elements(new_attachments) a)
    <> jsonb_array_length(new_attachments) then
    raise exception 'Contenidos duplicados o sin identificador';
  end if;
  for attachment in select * from jsonb_array_elements(new_attachments) loop
    if coalesce(attachment->>'id', '') !~ '^[0-9a-f-]{36}$'
      or coalesce(attachment->>'type', '') not in ('photo', 'audio', 'link')
      or char_length(coalesce(attachment->>'name', '')) > 240 then
      raise exception 'Contenido inválido';
    end if;
    if attachment->>'type' = 'link' then
      if coalesce(attachment->>'url', '') !~ '^https?://[^[:space:]]+\.[^[:space:]]+'
        or char_length(attachment->>'url') > 2048 then
        raise exception 'Enlace inválido';
      end if;
    else
      attachment_path := attachment->>'path';
      if attachment_path is null
        or not public.challenge_day_media_access(attachment_path, true)
        or split_part(attachment_path, '/', 1) <> target_challenge::text
        or split_part(attachment_path, '/', 2) <> 'resources'
        or split_part(split_part(attachment_path, '/', 4), '.', 1) <> attachment->>'id'
        or not exists (
          select 1 from storage.objects o
          where o.bucket_id = 'challenge-day-media' and o.name = attachment_path
            and (o.metadata->>'size')::bigint between 1 and case
              when attachment->>'type' = 'photo' then 10485760 else 26214400 end
            and o.metadata->>'mimetype' = attachment->>'mime'
            and o.metadata->>'mimetype' like case
              when attachment->>'type' = 'photo' then 'image/%' else 'audio/%' end
        )
      then
        raise exception 'El archivo no está subido o no pertenece a los recursos de este desafío';
      end if;
    end if;
  end loop;
  select revision into current_revision
    from public.challenge_resources where challenge_id = target_challenge;
  if expected_revision is null or coalesce(current_revision, 0) <> expected_revision then
    raise exception 'Los recursos cambiaron en otro dispositivo. Tu borrador se conserva; revisá la versión publicada antes de reemplazarla.'
      using errcode = '40001';
  end if;
  insert into public.challenge_resources(challenge_id, attachments, revision)
    values(target_challenge, new_attachments, 1)
    on conflict (challenge_id) do update set
      attachments = excluded.attachments,
      revision = challenge_resources.revision + 1,
      updated_at = now()
    returning * into result;
  return result;
end;
$$;
revoke all on function public.save_challenge_resources(uuid, jsonb, integer) from public, anon;
grant execute on function public.save_challenge_resources(uuid, jsonb, integer) to authenticated;


-- Returns source resource attachments (needed to preserve order and copy files)
-- without exposing them via a general SELECT on challenge_resources.
create or replace function public.list_challenge_resource_media_for_copy(
  source_id uuid,
  target_id uuid
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  result jsonb;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if not private.owns_restart_copy(source_id, target_id, caller)
    or not private.can_restart_source(source_id, caller) then
    raise exception 'Desafío no disponible';
  end if;
  select r.attachments into result
    from public.challenge_resources r
    where r.challenge_id = source_id;
  return coalesce(result, '[]'::jsonb);
end;
$$;
revoke all on function public.list_challenge_resource_media_for_copy(uuid, uuid) from public, anon;
grant execute on function public.list_challenge_resource_media_for_copy(uuid, uuid) to authenticated;

-- Latest restart_challenge body (Por Vibes) plus link-only copy of resources.
-- Photos and audio are copied afterwards by the app into new storage paths.
create or replace function private.restart_challenge(
  source_id uuid, new_title text, new_subtitle text, new_description text,
  new_image_url text, new_host_name text, invitee_ids uuid[]
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  source public.challenges%rowtype;
  source_start timestamptz;
  new_start timestamptz;
  new_id uuid;
  curated boolean;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  select * into source from public.challenges where id = source_id;
  if not found then raise exception 'Desafío no disponible'; end if;

  if not (
    source.created_by = caller
    or coalesce(source.visibility, 'public') = 'public'
    or exists (select 1 from public.challenge_participants p where p.challenge_id = source_id and p.user_id = caller)
    or exists (select 1 from public.event_participants ep where ep.event_id = source_id and ep.event_type = 'challenge' and ep.user_id = caller)
    or exists (select 1 from public.challenge_invitations i where i.challenge_id = source_id and i.invitee_id = caller)
    or (source.visibility = 'friends' and exists (
      select 1 from public.matches m
      where (m.user1_id = caller and m.user2_id = source.created_by) or (m.user2_id = caller and m.user1_id = source.created_by)))
  ) then raise exception 'Desafío no disponible'; end if;

  curated := coalesce(source.visibility, 'public') = 'public' and 'por-vibes' = any(coalesce(source.tags, '{}'::text[]));
  source_start := private.challenge_reminder_start(source.description);
  if not curated and (source_start is null
    or source_start + make_interval(days => greatest(coalesce(source.duration_days, 1), 1)) > now()) then
    raise exception 'Solo se pueden reiniciar desafíos finalizados';
  end if;

  new_start := private.challenge_reminder_start(new_description);
  if new_start is null then raise exception 'Elegí una fecha de comienzo'; end if;
  if new_start < now() - interval '1 day' then raise exception 'La fecha de comienzo no puede ser pasada'; end if;
  if not curated and new_start::date = source_start::date then raise exception 'Elegí una fecha de comienzo distinta a la original'; end if;
  if new_title is null or char_length(btrim(new_title)) not between 1 and 160 then
    raise exception 'Revisá el título'; end if;

  insert into public.challenges (
    title, subtitle, description, duration_days, image_url, host_name, host_image_url,
    tags, created_by, visibility, source_challenge_id
  ) values (
    btrim(new_title),
    coalesce(nullif(btrim(coalesce(new_subtitle, '')), ''), source.subtitle),
    new_description,
    source.duration_days,
    coalesce(nullif(btrim(coalesce(new_image_url, '')), ''), source.image_url),
    coalesce(nullif(btrim(coalesce(new_host_name, '')), ''), source.host_name),
    null,
    array_remove(source.tags, 'por-vibes'),
    caller,
    'private',
    source_id
  ) returning id into new_id;

  -- Day content: text and links are copied here. Uploaded photos/audio live
  -- under the source challenge path and are copied by the app afterwards
  -- (storage copy + save_challenge_day), so they are left out at this step.
  insert into public.challenge_days (challenge_id, day, title, description, attachments, revision)
  select new_id, d.day, d.title, d.description,
    coalesce((select jsonb_agg(a) from jsonb_array_elements(d.attachments) a where a->>'type' = 'link'), '[]'::jsonb),
    1
  from public.challenge_days d
  where d.challenge_id = source_id
    and d.day between 0 and greatest(coalesce(source.duration_days, 1), 1);

  -- Challenge resources: links are copied here. Photos/audio are copied by the
  -- app afterwards (storage copy + save_challenge_resources).
  insert into public.challenge_resources (challenge_id, attachments, revision)
  select new_id,
    coalesce((select jsonb_agg(a) from jsonb_array_elements(r.attachments) a where a->>'type' = 'link'), '[]'::jsonb),
    1
  from public.challenge_resources r
  where r.challenge_id = source_id;

  insert into public.challenge_participants (challenge_id, user_id) values (new_id, caller)
    on conflict (challenge_id, user_id) do nothing;
  insert into public.event_participants (event_id, event_type, user_id) values (new_id, 'challenge', caller)
    on conflict (event_id, user_id) do nothing;

  perform private.add_challenge_invitations(new_id, caller, invitee_ids);
  return new_id;
end;
$$;

notify pgrst, 'reload schema';
commit;
