alter table if exists public.profiles
  add column if not exists country text;

alter table if exists public.profiles
  add column if not exists city text;

alter table if exists public.profiles
  add column if not exists location_label text;

alter table if exists public.profiles
  add column if not exists latitude double precision;

alter table if exists public.profiles
  add column if not exists longitude double precision;

create index if not exists idx_profiles_coordinates
  on public.profiles(latitude, longitude);
