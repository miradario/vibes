alter table public.user_preferences
  add column if not exists discover_genders text[] not null default '{}'::text[];

alter table public.user_preferences
  drop constraint if exists user_preferences_discover_genders_check;

alter table public.user_preferences
  add constraint user_preferences_discover_genders_check
  check (
    discover_genders <@ array['woman', 'man', 'nonbinary', 'other']::text[]
  );
