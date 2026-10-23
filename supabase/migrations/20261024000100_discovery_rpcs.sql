-- Server-side reads for Discover/Home and the own profile.
-- Additive only: no grants or policies are changed and the app does not use
-- these functions yet. Coordinates and birth dates never leave the database;
-- the functions return the derived distance (km, rounded) and age instead.

create or replace function private.zodiac_from_birth_date(p_birth date)
returns text
language sql
immutable
set search_path to ''
as $$
  select case when p_birth is null then null else
    (array['Capricornio','Acuario','Piscis','Aries','Tauro','Géminis',
           'Cáncer','Leo','Virgo','Libra','Escorpio','Sagitario'])[
      ((extract(month from p_birth)::int - 1
        + case when extract(day from p_birth)::int >=
            (array[20,19,21,20,21,21,23,23,23,23,22,22])[extract(month from p_birth)::int]
          then 1 else 0 end) % 12) + 1]
  end
$$;

revoke all on function private.zodiac_from_birth_date(date) from public, anon, authenticated;

create or replace function public.get_discovery_candidates(
  p_target_ids uuid[] default null,
  p_include_previously_swiped boolean default false,
  p_limit integer default 500
)
returns table (
  id uuid,
  profile jsonb,
  preferences jsonb,
  age integer,
  zodiac text,
  distance_km integer
)
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  me uuid := auth.uid();
  my_lat double precision;
  my_lng double precision;
begin
  if me is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select p.latitude, p.longitude into my_lat, my_lng
  from public.profiles p
  where p.id = me and p.deleted_at is null;

  return query
  select
    p.id,
    to_jsonb(p) - array['latitude','longitude','birth_date','deleted_at','deleted_by','deleted_reason'],
    case when up.user_id is null then null else
      to_jsonb(up) - array[
        'notifications_enabled','notification_connections','notification_matches',
        'notification_direct_messages','notification_group_messages',
        'notification_challenges','notification_events','event_reminder_timing',
        'challenge_reminder_time','challenge_reminder_timezone',
        'discover_age_min','discover_age_max','discover_gender_id',
        'discover_distance_min_km','discover_distance_max_km','discover_smoking',
        'discover_genders','discover_diets','discover_spiritual_paths',
        'discover_answer_filters']
    end,
    case when p.birth_date is null then null
      else extract(year from age(current_date, p.birth_date))::int end,
    private.zodiac_from_birth_date(p.birth_date),
    case when my_lat is null or my_lng is null or p.latitude is null or p.longitude is null then null
      else round(6371 * 2 * atan2(
        sqrt(sin(radians(p.latitude - my_lat) / 2) ^ 2
          + cos(radians(my_lat)) * cos(radians(p.latitude)) * sin(radians(p.longitude - my_lng) / 2) ^ 2),
        sqrt(1 - (sin(radians(p.latitude - my_lat) / 2) ^ 2
          + cos(radians(my_lat)) * cos(radians(p.latitude)) * sin(radians(p.longitude - my_lng) / 2) ^ 2))
      ))::int end
  from public.profiles p
  left join public.user_preferences up on up.user_id = p.id
  where p.deleted_at is null
    and p.id <> me
    and (case when p_target_ids is not null and cardinality(p_target_ids) > 0
           then p.id = any(p_target_ids) else p.is_active end)
    and not exists (select 1 from private.store_review_user_ids() r(rid) where r.rid = p.id)
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = me and b.blocked_user_id = p.id)
         or (b.blocker_id = p.id and b.blocked_user_id = me)
    )
    and (p_include_previously_swiped or not exists (
      select 1 from public.swipes s
      where s.swiper_id = me and s.target_id = p.id
        and (s.direction = 'like' or s.created_at > now() - interval '30 days')
    ))
  order by p.id
  limit greatest(1, least(coalesce(p_limit, 500), 5000));
end;
$$;

create or replace function public.get_my_profile()
returns table (
  profile jsonb,
  preferences jsonb,
  age integer,
  zodiac text,
  has_location boolean
)
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  return query
  select
    to_jsonb(p) - array['latitude','longitude','deleted_at','deleted_by','deleted_reason'],
    to_jsonb(up),
    case when p.birth_date is null then null
      else extract(year from age(current_date, p.birth_date))::int end,
    private.zodiac_from_birth_date(p.birth_date),
    (p.latitude is not null and p.longitude is not null)
  from public.profiles p
  left join public.user_preferences up on up.user_id = p.id
  where p.id = me and p.deleted_at is null;
end;
$$;

revoke all on function public.get_discovery_candidates(uuid[], boolean, integer) from public, anon, authenticated;
grant execute on function public.get_discovery_candidates(uuid[], boolean, integer) to authenticated;
revoke all on function public.get_my_profile() from public, anon, authenticated;
grant execute on function public.get_my_profile() to authenticated;
