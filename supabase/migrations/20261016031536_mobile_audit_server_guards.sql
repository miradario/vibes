begin;

-- SELECT policies combine with OR. Keep existing discovery behavior, but never
-- expose suspended/deleted accounts to other users through a broader policy.
create policy profiles_visible_accounts_only on public.profiles
  as restrictive for select to authenticated
  using (id = (select auth.uid()) or (is_active is true and deleted_at is null));

-- Moderation flags are server-owned; normal profile edits cannot reactivate a
-- suspended account. SECURITY INVOKER preserves the role of trusted admin RPCs.
create or replace function private.guard_profile_moderation()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') and new.is_active is distinct from old.is_active then
    raise exception 'El estado de la cuenta solo puede cambiarlo un administrador' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_profile_moderation() from public, anon;
create trigger profiles_guard_moderation before update on public.profiles
  for each row execute function private.guard_profile_moderation();

-- Serialize reservations on the parent row. Client-side counts and RLS alone
-- cannot protect the final place from concurrent requests.
create or replace function private.guard_activity_enrollment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  target uuid;
  kind text;
  actor uuid := auth.uid();
  owner_id uuid;
  limit_count integer;
  visibility text;
  existing_count integer;
begin
  if tg_op = 'UPDATE' then
    if to_jsonb(new)->'user_id' is distinct from to_jsonb(old)->'user_id'
      or to_jsonb(new)->'event_id' is distinct from to_jsonb(old)->'event_id'
      or to_jsonb(new)->'event_type' is distinct from to_jsonb(old)->'event_type'
      or to_jsonb(new)->'challenge_id' is distinct from to_jsonb(old)->'challenge_id' then
      raise exception 'No se puede mover una inscripción a otra actividad o usuario' using errcode = '42501';
    end if;
    return new;
  end if;
  if tg_table_name = 'challenge_participants' then
    target := new.challenge_id;
    kind := 'challenge';
  else
    target := new.event_id;
    kind := new.event_type;
  end if;
  if actor is not null and new.user_id <> actor then
    raise exception 'Solo podés inscribirte con tu propia cuenta' using errcode = '42501';
  end if;
  if kind = 'event' then
    select e.created_by, e.capacity into owner_id, limit_count from public.events e where e.id=target for update;
    if not found then raise exception 'Evento no disponible' using errcode='23503'; end if;
    -- An idempotent upsert must still succeed when the event is already full.
    if exists(select 1 from public.event_participants p where p.event_id=target and p.user_id=new.user_id) then return new; end if;
    select count(*) into existing_count from public.event_participants p where p.event_id=target;
    if coalesce(limit_count,0)>0 and existing_count>=limit_count then
      raise exception 'No quedan cupos disponibles' using errcode='23514';
    end if;
  elsif kind = 'challenge' then
    select c.created_by, coalesce(c.visibility,'public') into owner_id, visibility from public.challenges c where c.id=target for update;
    if not found then raise exception 'Desafío no disponible' using errcode='23503'; end if;
    if actor is not null and actor<>owner_id and visibility<>'public'
      and not (visibility='friends' and public.is_matched_with(owner_id))
      and not exists(select 1 from public.challenge_invitations i where i.challenge_id=target and i.invitee_id=actor) then
      raise exception 'Necesitás una invitación para este desafío' using errcode='42501';
    end if;
  else
    raise exception 'Tipo de actividad inválido' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_activity_enrollment() from public, anon, authenticated;
create trigger event_participants_guard_enrollment before insert or update on public.event_participants
  for each row execute function private.guard_activity_enrollment();
create trigger challenge_participants_guard_enrollment before insert or update on public.challenge_participants
  for each row execute function private.guard_activity_enrollment();

-- Private challenge rosters should not be enumerable by unrelated accounts.
create policy event_participants_private_rosters on public.event_participants
  as restrictive for select to authenticated using (
    user_id=(select auth.uid()) or event_type='event' or exists (
      select 1 from public.challenges c where c.id=event_id
    )
  );
-- A participant policy alone does not prove mutual consent. Validate the same
-- reciprocal likes used by the client, even when REST is called directly.
create or replace function private.guard_match_consent()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return new; end if;
  if tg_op='UPDATE' then
    if least(new.user1_id,new.user2_id) is distinct from least(old.user1_id,old.user2_id)
      or greatest(new.user1_id,new.user2_id) is distinct from greatest(old.user1_id,old.user2_id) then
      raise exception 'No se pueden cambiar los integrantes de una conexión' using errcode='42501';
    end if;
    return new;
  end if;
  if not exists(select 1 from public.swipes s where s.swiper_id=new.user1_id and s.target_id=new.user2_id and s.direction='like')
    or not exists(select 1 from public.swipes s where s.swiper_id=new.user2_id and s.target_id=new.user1_id and s.direction='like') then
    raise exception 'La conexión requiere la aceptación de ambas personas' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_match_consent() from public,anon,authenticated;
create trigger matches_guard_consent before insert or update on public.matches
  for each row execute function private.guard_match_consent();
commit;
