-- Al reiniciar o copiar un desafío (incl. Por Vibes), quien crea la copia
-- necesita leer los archivos de foto/audio ya publicados del original para
-- copiarlos a rutas del nuevo desafío. No se abre la lectura de challenge_days
-- (títulos y consignas siguen restringidos a creador y participantes).
--
-- No se reemplaza challenge_day_media_access: se agrega una función de lectura
-- y se amplía solo la policy SELECT del bucket, para no pisar otros cambios
-- de esa función (p. ej. recursos generales del desafío).
begin;

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

-- Published day media of a source the caller just copied (restart / Por Vibes).
create or replace function public.challenge_restart_copy_media_access(object_name text)
returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  challenge uuid;
  day_number integer;
  caller uuid := (select auth.uid());
begin
  if caller is null then return false; end if;
  if object_name !~ '^[0-9a-f-]{36}/[0-9]+/[0-9a-f-]{36}/[0-9a-f-]{36}\.[a-z0-9]+$' then
    return false;
  end if;
  begin
    challenge := split_part(object_name, '/', 1)::uuid;
    day_number := split_part(object_name, '/', 2)::integer;
  exception when invalid_text_representation or numeric_value_out_of_range then
    return false;
  end;
  if not private.can_restart_source(challenge, caller) then return false; end if;
  if not exists (
    select 1 from public.challenges copy
    where copy.created_by = caller and copy.source_challenge_id = challenge
  ) then
    return false;
  end if;
  return exists (
    select 1 from public.challenge_days d
    where d.challenge_id = challenge
      and d.day = day_number
      and d.attachments @> jsonb_build_array(jsonb_build_object('path', object_name))
  );
end;
$$;
revoke all on function public.challenge_restart_copy_media_access(text) from public, anon;
grant execute on function public.challenge_restart_copy_media_access(text) to authenticated;

drop policy if exists challenge_day_media_read on storage.objects;
create policy challenge_day_media_read on storage.objects for select to authenticated
using (
  bucket_id = 'challenge-day-media'
  and (
    public.challenge_day_media_access(name, false)
    or public.challenge_restart_copy_media_access(name)
  )
);

-- Returns source attachment lists (needed to preserve order and copy files)
-- without exposing title/description via a general SELECT on challenge_days.
create or replace function public.list_challenge_day_media_for_copy(
  source_id uuid,
  target_id uuid
) returns table(day integer, attachments jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if not private.owns_restart_copy(source_id, target_id, caller)
    or not private.can_restart_source(source_id, caller) then
    raise exception 'Desafío no disponible';
  end if;
  return query
    select d.day, d.attachments
    from public.challenge_days d
    where d.challenge_id = source_id
      and exists (
        select 1 from jsonb_array_elements(d.attachments) a
        where a->>'type' in ('photo', 'audio') and coalesce(a->>'path', '') <> ''
      )
    order by d.day;
end;
$$;
revoke all on function public.list_challenge_day_media_for_copy(uuid, uuid) from public, anon;
grant execute on function public.list_challenge_day_media_for_copy(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
