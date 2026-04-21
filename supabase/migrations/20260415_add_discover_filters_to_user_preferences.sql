alter table if exists public.user_preferences
  add column if not exists discover_age_min integer;

alter table if exists public.user_preferences
  add column if not exists discover_age_max integer;

alter table if exists public.user_preferences
  add column if not exists discover_gender_id integer;

alter table if exists public.user_preferences
  add column if not exists discover_distance_min_km integer;

alter table if exists public.user_preferences
  add column if not exists discover_distance_max_km integer;

alter table if exists public.user_preferences
  add column if not exists discover_smoking text;
