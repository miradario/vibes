alter table if exists public.user_preferences
add column if not exists spiritual_path_details jsonb not null default '{}'::jsonb;