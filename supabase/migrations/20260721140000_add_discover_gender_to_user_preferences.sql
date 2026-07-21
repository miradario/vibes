alter table if exists public.user_preferences
  add column if not exists discover_gender text;
