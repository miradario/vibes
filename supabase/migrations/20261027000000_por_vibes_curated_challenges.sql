-- "Por Vibes": challenges curated by Vibes (tag 'por-vibes', public) form a
-- catalog in Desafíos. Users restart them solo or inviting friends; the copy
-- is private and does not keep the curated tag.
-- 1) restart_challenge accepts curated sources that are not finished yet.
-- 2) Only the database (service role / SQL editor, auth.uid() null) can set
--    the 'por-vibes' tag; app users cannot mark their own challenges curated.

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

  -- Same visibility rules as challenges_select_visible (#9) + invitations.
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
  -- Curated "Por Vibes" challenges are a catalog: they can be restarted anytime.
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

  insert into public.challenge_participants (challenge_id, user_id) values (new_id, caller)
    on conflict (challenge_id, user_id) do nothing;
  insert into public.event_participants (event_id, event_type, user_id) values (new_id, 'challenge', caller)
    on conflict (event_id, user_id) do nothing;

  perform private.add_challenge_invitations(new_id, caller, invitee_ids);
  return new_id;
end;
$$;

create or replace function private.guard_curated_challenge_tag()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    new.tags := array_remove(new.tags, 'por-vibes');
  elsif ('por-vibes' = any(coalesce(new.tags, '{}'::text[])))
    is distinct from ('por-vibes' = any(coalesce(old.tags, '{}'::text[]))) then
    new.tags := case when 'por-vibes' = any(coalesce(old.tags, '{}'::text[]))
      then array_append(array_remove(new.tags, 'por-vibes'), 'por-vibes')
      else array_remove(new.tags, 'por-vibes') end;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_curated_challenge_tag() from public, anon, authenticated;

drop trigger if exists challenges_guard_curated_tag on public.challenges;
create trigger challenges_guard_curated_tag
  before insert or update of tags on public.challenges
  for each row execute function private.guard_curated_challenge_tag();
