-- Reiniciar un desafío: copia privada de un desafío finalizado + invitaciones.
-- Depends on the live state from PR #9 (20261015120100_private_challenges_rls):
-- challenges SELECT is "challenges_select_visible" (creator, public, member,
-- friends). This migration only ADDS a complementary SELECT policy so invitees
-- can read the private copy; it does not replace #9's policy.
-- The start date stays in the existing [[starts_at:ISO]] description marker
-- (parsed by private.challenge_reminder_start), so reminders, the client
-- timeline and the copies all read the same source of truth.

begin;

alter table public.challenges
  add column if not exists source_challenge_id uuid
    references public.challenges(id) on delete set null;
create index if not exists challenges_source_challenge_idx
  on public.challenges (source_challenge_id) where source_challenge_id is not null;
comment on column public.challenges.source_challenge_id is
  'Finished challenge this private copy was restarted from (Reiniciar).';

create table if not exists public.challenge_invitations (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  invitee_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  responded_at timestamptz,
  unique (challenge_id, invitee_id),
  check (invitee_id <> invited_by)
);
create index if not exists challenge_invitations_invitee_idx
  on public.challenge_invitations (invitee_id, created_at desc);
create index if not exists challenge_invitations_challenge_idx
  on public.challenge_invitations (challenge_id);

-- Reads only; every write goes through the security definer functions below.
alter table public.challenge_invitations enable row level security;
revoke all on public.challenge_invitations from public, anon, authenticated;
grant select on public.challenge_invitations to authenticated;
drop policy if exists challenge_invitations_select on public.challenge_invitations;
create policy challenge_invitations_select on public.challenge_invitations
  for select to authenticated
  using (invitee_id = (select auth.uid()) or invited_by = (select auth.uid()));

-- Invitees (pending or rejected) can see the private copy to answer the invitation.
create or replace function public.is_challenge_invitee(p_challenge_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.challenge_invitations i
    where i.challenge_id = p_challenge_id and i.invitee_id = (select auth.uid())
  );
$$;
revoke all on function public.is_challenge_invitee(uuid) from public, anon;
grant execute on function public.is_challenge_invitee(uuid) to authenticated;

drop policy if exists "challenges_select_invited" on public.challenges;
create policy "challenges_select_invited" on public.challenges
  for select to authenticated
  using (public.is_challenge_invitee(id));

create schema if not exists private;
grant usage on schema private to authenticated;

-- Shared invite step: invitees must be the caller's active connections.
create or replace function private.add_challenge_invitations(target uuid, caller uuid, invitee_ids uuid[])
returns integer language plpgsql security definer set search_path = '' as $$
declare added integer;
begin
  if coalesce(cardinality(invitee_ids), 0) > 100 then raise exception 'Demasiadas invitaciones'; end if;
  if exists (
    select 1 from unnest(coalesce(invitee_ids, '{}'::uuid[])) member_id
    where member_id is null or (member_id <> caller and not exists (
      select 1 from public.matches m where m.is_active and
      ((m.user1_id = caller and m.user2_id = member_id) or (m.user2_id = caller and m.user1_id = member_id))
    ))
  ) then raise exception 'Solo podés invitar a tus conexiones'; end if;
  with invitees as (
    select distinct member_id from unnest(coalesce(invitee_ids, '{}'::uuid[])) member_id
    where member_id <> caller
      and not exists (select 1 from public.challenge_participants p
                      where p.challenge_id = target and p.user_id = member_id)
  ), upserted as (
    insert into public.challenge_invitations (challenge_id, invitee_id, invited_by)
    select target, member_id, caller from invitees
    on conflict (challenge_id, invitee_id) do update
      set status = 'pending', responded_at = null, created_at = timezone('utc', now())
      where public.challenge_invitations.status = 'rejected'
    returning 1
  )
  select count(*) into added from upserted;
  return added;
end;
$$;
revoke all on function private.add_challenge_invitations(uuid, uuid, uuid[]) from public, anon, authenticated;

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

  source_start := private.challenge_reminder_start(source.description);
  if source_start is null
    or source_start + make_interval(days => greatest(coalesce(source.duration_days, 1), 1)) > now() then
    raise exception 'Solo se pueden reiniciar desafíos finalizados';
  end if;

  new_start := private.challenge_reminder_start(new_description);
  if new_start is null then raise exception 'Elegí una fecha de comienzo'; end if;
  if new_start < now() - interval '1 day' then raise exception 'La fecha de comienzo no puede ser pasada'; end if;
  if new_start::date = source_start::date then raise exception 'Elegí una fecha de comienzo distinta a la original'; end if;
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
    source.tags,
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
revoke all on function private.restart_challenge(uuid, text, text, text, text, text, uuid[]) from public, anon, authenticated;
grant execute on function private.restart_challenge(uuid, text, text, text, text, text, uuid[]) to authenticated;
create or replace function public.restart_challenge(
  source_id uuid, new_title text, new_subtitle text, new_description text,
  new_image_url text, new_host_name text, invitee_ids uuid[]
) returns uuid language sql security invoker set search_path = '' as $$
  select private.restart_challenge(source_id, new_title, new_subtitle, new_description, new_image_url, new_host_name, invitee_ids);
$$;
revoke all on function public.restart_challenge(uuid, text, text, text, text, text, uuid[]) from public, anon, authenticated;
grant execute on function public.restart_challenge(uuid, text, text, text, text, text, uuid[]) to authenticated;

-- Owner adds invitees after creation (detail screen).
create or replace function private.invite_to_challenge(target uuid, invitee_ids uuid[])
returns integer language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid();
begin
  if caller is null then raise exception 'Authentication required'; end if;
  perform 1 from public.challenges c where c.id = target and c.created_by = caller;
  if not found then raise exception 'Solo quien creó el desafío puede invitar'; end if;
  return private.add_challenge_invitations(target, caller, invitee_ids);
end;
$$;
revoke all on function private.invite_to_challenge(uuid, uuid[]) from public, anon, authenticated;
grant execute on function private.invite_to_challenge(uuid, uuid[]) to authenticated;
create or replace function public.invite_to_challenge(target uuid, invitee_ids uuid[])
returns integer language sql security invoker set search_path = '' as $$
  select private.invite_to_challenge(target, invitee_ids);
$$;
revoke all on function public.invite_to_challenge(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.invite_to_challenge(uuid, uuid[]) to authenticated;

-- Invitee answers. Accepting joins (participants + chat); rejecting never joins.
-- A rejected invitation can still be accepted later; an accepted one is final
-- (leaving uses the existing "Salir del desafío").
create or replace function private.respond_challenge_invitation(invitation_id uuid, accept_invitation boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid(); invitation public.challenge_invitations%rowtype;
  next_status text := case when accept_invitation then 'accepted' else 'rejected' end;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if accept_invitation is null then raise exception 'Elegí aceptar o rechazar'; end if;
  select * into invitation from public.challenge_invitations
    where id = invitation_id and invitee_id = caller for update;
  if not found then raise exception 'Invitación no disponible'; end if;
  if invitation.status = next_status then return invitation.challenge_id; end if;
  if invitation.status = 'accepted' then raise exception 'La invitación ya fue aceptada'; end if;
  if accept_invitation then
    insert into public.challenge_participants (challenge_id, user_id) values (invitation.challenge_id, caller)
      on conflict (challenge_id, user_id) do nothing;
    insert into public.event_participants (event_id, event_type, user_id) values (invitation.challenge_id, 'challenge', caller)
      on conflict (event_id, user_id) do nothing;
  end if;
  update public.challenge_invitations
    set status = next_status, responded_at = timezone('utc', now())
    where id = invitation_id;
  return invitation.challenge_id;
end;
$$;
revoke all on function private.respond_challenge_invitation(uuid, boolean) from public, anon, authenticated;
grant execute on function private.respond_challenge_invitation(uuid, boolean) to authenticated;
create or replace function public.respond_challenge_invitation(invitation_id uuid, accept_invitation boolean)
returns uuid language sql security invoker set search_path = '' as $$
  select private.respond_challenge_invitation(invitation_id, accept_invitation);
$$;
revoke all on function public.respond_challenge_invitation(uuid, boolean) from public, anon, authenticated;
grant execute on function public.respond_challenge_invitation(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
commit;
