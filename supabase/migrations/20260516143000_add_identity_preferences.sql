alter table if exists public.user_preferences
  add column if not exists gender text;

alter table if exists public.user_preferences
  add column if not exists height_cm integer;

alter table if exists public.user_preferences
  add column if not exists looking_for text[] not null default '{}';
