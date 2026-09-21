begin;
alter table public.user_preferences
  add column if not exists discover_spiritual_paths text[] not null default '{}';
commit;
