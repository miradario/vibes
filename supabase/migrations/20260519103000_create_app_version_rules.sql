create table if not exists public.app_version_rules (
  id integer primary key default 1 check (id = 1),
  is_enabled boolean not null default true,
  minimum_supported_version text,
  recommended_version text,
  ios_store_url text,
  android_store_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.app_version_rules (id)
values (1)
on conflict (id) do nothing;

alter table public.app_version_rules enable row level security;

drop policy if exists "app_version_rules_select_public" on public.app_version_rules;
create policy "app_version_rules_select_public"
on public.app_version_rules for select
to anon, authenticated
using (is_enabled = true);
