alter table if exists public.user_preferences
  add column if not exists notifications_enabled boolean not null default true;
