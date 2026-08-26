alter table public.user_preferences
  add column if not exists discover_diets text[] not null default '{}'::text[];

alter table public.user_preferences
  drop constraint if exists user_preferences_discover_diets_check;

alter table public.user_preferences
  add constraint user_preferences_discover_diets_check
  check (
    discover_diets <@ array['vegetarian', 'nonVegetarian', 'other']::text[]
  );
