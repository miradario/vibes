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

-- Earlier draft signature (never shipped to prod); dropped so re-runs are idempotent.
drop function if exists public.get_discovery_candidates(uuid[], boolean, integer);

-- Pagination: ordered by id; pass the last id of a page as p_after_id.
-- p_limit defaults to 50 and is capped at 200.
-- p_target_ids only returns profiles that are eligible for discovery
-- (active, not deleted, not blocked, not store review accounts).
-- p_age_min / p_age_max filter on the real birth date even when the
-- candidate hides their age; hidden ages come back as null.
create or replace function public.get_discovery_candidates(
  p_target_ids uuid[] default null,
  p_include_previously_swiped boolean default false,
  p_limit integer default 50,
  p_after_id uuid default null,
  p_age_min integer default null,
  p_age_max integer default null
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
  with base as (
    select
      p.*,
      coalesce(up.hide_age, false) as hidden_age,
      up.user_id as up_user_id,
      up.spiritual_path, up.spiritual_path_details, up.vegetarian, up.about_me,
      up.smoking, up.other_tags, up.open_to, up.languages, up.zodiac as up_zodiac,
      up.education, up.family_plan, up.vaccine, up.personality,
      up.communication_style, up.love_style, up.pets, up.onboarding_purpose,
      up.current_energy, up.profile_answers, up.gender, up.height_cm,
      up.looking_for, up.hide_age,
      case when p.birth_date is null then null
        else extract(year from age(current_date, p.birth_date))::int end as real_age
    from public.profiles p
    left join public.user_preferences up on up.user_id = p.id
    where p.deleted_at is null
      and p.is_active
      and p.id <> me
      and (p_target_ids is null or cardinality(p_target_ids) = 0 or p.id = any(p_target_ids))
      and (p_after_id is null or p.id > p_after_id)
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
  )
  select
    b.id,
    jsonb_build_object(
      'id', b.id,
      'created_at', b.created_at,
      'updated_at', b.updated_at,
      'display_name', b.display_name,
      'is_active', b.is_active,
      'is_teacher', b.is_teacher,
      'orientation', b.orientation,
      'gender_id', b.gender_id,
      'intent_id', b.intent_id,
      'country', b.country,
      'city', b.city,
      'location_label', b.location_label,
      'neighborhood', b.neighborhood,
      'age_range', case when b.hidden_age then null else b.age_range end,
      'nationality_code', b.nationality_code
    ),
    case when b.up_user_id is null then null else jsonb_build_object(
      'user_id', b.up_user_id,
      'spiritual_path', b.spiritual_path,
      'spiritual_path_details', b.spiritual_path_details,
      'vegetarian', b.vegetarian,
      'about_me', b.about_me,
      'smoking', b.smoking,
      'other_tags', b.other_tags,
      'open_to', b.open_to,
      'languages', b.languages,
      'zodiac', case when b.hidden_age then null else b.up_zodiac end,
      'education', b.education,
      'family_plan', b.family_plan,
      'vaccine', b.vaccine,
      'personality', b.personality,
      'communication_style', b.communication_style,
      'love_style', b.love_style,
      'pets', b.pets,
      'onboarding_purpose', b.onboarding_purpose,
      'current_energy', b.current_energy,
      'profile_answers', b.profile_answers,
      'gender', b.gender,
      'height_cm', b.height_cm,
      'looking_for', b.looking_for,
      'hide_age', b.hide_age
    ) end,
    case when b.hidden_age then null else b.real_age end,
    case when b.hidden_age then null else private.zodiac_from_birth_date(b.birth_date) end,
    case when my_lat is null or my_lng is null or b.latitude is null or b.longitude is null then null
      else round(6371 * 2 * atan2(
        sqrt(sin(radians(b.latitude - my_lat) / 2) ^ 2
          + cos(radians(my_lat)) * cos(radians(b.latitude)) * sin(radians(b.longitude - my_lng) / 2) ^ 2),
        sqrt(1 - (sin(radians(b.latitude - my_lat) / 2) ^ 2
          + cos(radians(my_lat)) * cos(radians(b.latitude)) * sin(radians(b.longitude - my_lng) / 2) ^ 2))
      ))::int end
  from base b
  where (p_age_min is null or b.real_age >= p_age_min)
    and (p_age_max is null or b.real_age <= p_age_max)
  order by b.id
  limit greatest(1, least(coalesce(p_limit, 50), 200));
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

revoke all on function public.get_discovery_candidates(uuid[], boolean, integer, uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.get_discovery_candidates(uuid[], boolean, integer, uuid, integer, integer) to authenticated;
revoke all on function public.get_my_profile() from public, anon, authenticated;
grant execute on function public.get_my_profile() to authenticated;
