alter table if exists public.user_preferences
  add column if not exists location text;
