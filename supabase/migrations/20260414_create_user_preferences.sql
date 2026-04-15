create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  spiritual_path text[] not null default '{}',
  spiritual_path_details jsonb not null default '{}'::jsonb,
  vegetarian text,
  about_me text,
  smoking text,
  other_tags text[] not null default '{}',
  open_to text[] not null default '{}',
  languages text[] not null default '{}',
  zodiac text,
  education text,
  family_plan text,
  vaccine text,
  personality text,
  communication_style text,
  love_style text,
  pets text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences
  add column if not exists spiritual_path text[] not null default '{}';

alter table public.user_preferences
  add column if not exists spiritual_path_details jsonb not null default '{}'::jsonb;

alter table public.user_preferences
  add column if not exists vegetarian text;

alter table public.user_preferences
  add column if not exists about_me text;

alter table public.user_preferences
  add column if not exists smoking text;

alter table public.user_preferences
  add column if not exists other_tags text[] not null default '{}';

alter table public.user_preferences
  add column if not exists open_to text[] not null default '{}';

alter table public.user_preferences
  add column if not exists languages text[] not null default '{}';

alter table public.user_preferences
  add column if not exists zodiac text;

alter table public.user_preferences
  add column if not exists education text;

alter table public.user_preferences
  add column if not exists family_plan text;

alter table public.user_preferences
  add column if not exists vaccine text;

alter table public.user_preferences
  add column if not exists personality text;

alter table public.user_preferences
  add column if not exists communication_style text;

alter table public.user_preferences
  add column if not exists love_style text;

alter table public.user_preferences
  add column if not exists pets text;

alter table public.user_preferences
  add column if not exists created_at timestamptz not null default now();

alter table public.user_preferences
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_user_preferences_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_preferences_updated_at on public.user_preferences;
create trigger trg_user_preferences_updated_at
  before update on public.user_preferences
  for each row execute function public.set_user_preferences_updated_at();

alter table public.user_preferences enable row level security;

drop policy if exists "user_preferences_select_authenticated" on public.user_preferences;
create policy "user_preferences_select_authenticated" on public.user_preferences
  for select using (auth.role() = 'authenticated');

drop policy if exists "user_preferences_insert_own" on public.user_preferences;
create policy "user_preferences_insert_own" on public.user_preferences
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_preferences_update_own" on public.user_preferences;
create policy "user_preferences_update_own" on public.user_preferences
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_preferences_delete_own" on public.user_preferences;
create policy "user_preferences_delete_own" on public.user_preferences
  for delete using (auth.uid() = user_id);

create index if not exists idx_user_preferences_updated_at
  on public.user_preferences(updated_at desc);