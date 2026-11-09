-- Desafíos conectados a Salud (Apple Salud / Health Connect), primero pasos.
-- 1) challenges.metric_type + daily_goal: la meta es fija por desafío. 'none'
--    (default) deja todos los desafíos existentes como hasta ahora.
-- 2) challenge_checkins.source: 'manual' (default, lo que inserta la app hoy)
--    o 'health' (marcado automático al llegar a la meta). Al servidor NO llega
--    ningún dato de salud: solo la fila del día cumplido.
-- 3) Los check-ins 'health' solo se crean por la RPC record_health_checkin,
--    que valida participación, tipo de desafío y fecha (±1 día del servidor).
-- 4) Reiniciar un desafío (p. ej. uno de "Por Vibes") copia la métrica y la meta.

alter table public.challenges
  add column if not exists metric_type text not null default 'none',
  add column if not exists daily_goal integer;

alter table public.challenges drop constraint if exists challenges_metric_type_check;
alter table public.challenges add constraint challenges_metric_type_check
  check (metric_type in ('none', 'steps'));

alter table public.challenges drop constraint if exists challenges_daily_goal_check;
alter table public.challenges add constraint challenges_daily_goal_check
  check (
    (metric_type = 'none' and daily_goal is null)
    or (metric_type <> 'none' and daily_goal between 1 and 100000)
  );

alter table public.challenge_checkins
  add column if not exists source text not null default 'manual';

alter table public.challenge_checkins drop constraint if exists challenge_checkins_source_check;
alter table public.challenge_checkins add constraint challenge_checkins_source_check
  check (source in ('manual', 'health'));

-- La app sigue insertando check-ins manuales directo en la tabla; 'health'
-- queda reservado para la RPC (security definer).
drop policy if exists "checkins_insert_own" on public.challenge_checkins;
create policy "checkins_insert_own"
on public.challenge_checkins for insert to authenticated
with check (auth.uid() = user_id and source = 'manual');

-- Al reiniciar (restart_challenge inserta con source_challenge_id) la copia
-- hereda la métrica. Los usuarios no pueden convertir sus desafíos en desafíos
-- de Salud desde la app: solo la base (service role / SQL editor) define la meta.
create or replace function private.guard_challenge_metric()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  source_metric text;
  source_goal integer;
begin
  if tg_op = 'INSERT' and new.source_challenge_id is not null then
    select c.metric_type, c.daily_goal into source_metric, source_goal
    from public.challenges c where c.id = new.source_challenge_id;
    if found then
      new.metric_type := coalesce(source_metric, 'none');
      new.daily_goal := source_goal;
      return new;
    end if;
  end if;
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    new.metric_type := 'none';
    new.daily_goal := null;
  else
    new.metric_type := old.metric_type;
    new.daily_goal := old.daily_goal;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_challenge_metric() from public, anon, authenticated;

drop trigger if exists challenges_guard_metric on public.challenges;
create trigger challenges_guard_metric
  before insert or update of metric_type, daily_goal on public.challenges
  for each row execute function private.guard_challenge_metric();

-- Check-in automático desde Salud. Devuelve true si creó el día, false si ya
-- estaba marcado (manual o automático), así el celular avisa una sola vez.
create or replace function private.record_health_checkin(target_challenge uuid, target_date date)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  inserted_id uuid;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if target_date is null
    or target_date < (now() at time zone 'utc')::date - 1
    or target_date > (now() at time zone 'utc')::date + 1 then
    raise exception 'Fecha de check-in inválida';
  end if;
  perform 1 from public.challenges c
    where c.id = target_challenge and c.metric_type <> 'none';
  if not found then raise exception 'Este desafío no se completa con Salud'; end if;
  perform 1 from public.challenge_participants p
    where p.challenge_id = target_challenge and p.user_id = caller;
  if not found then raise exception 'No participás de este desafío'; end if;

  insert into public.challenge_checkins (challenge_id, user_id, checkin_date, source)
  values (target_challenge, caller, target_date, 'health')
  on conflict (challenge_id, user_id, checkin_date) do nothing
  returning id into inserted_id;
  return inserted_id is not null;
end;
$$;
revoke all on function private.record_health_checkin(uuid, date) from public, anon, authenticated;
grant execute on function private.record_health_checkin(uuid, date) to authenticated;

create or replace function public.record_health_checkin(target_challenge uuid, target_date date)
returns boolean language sql security invoker set search_path = '' as $$
  select private.record_health_checkin(target_challenge, target_date);
$$;
revoke all on function public.record_health_checkin(uuid, date) from public, anon, authenticated;
grant execute on function public.record_health_checkin(uuid, date) to authenticated;
