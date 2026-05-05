create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  match_id uuid references public.matches(id) on delete set null,
  reason text not null check (
    reason in (
      'Spam o contenido irrelevante',
      'Lenguaje ofensivo',
      'Acoso o incomodidad',
      'Contenido inapropiado',
      'Perfil falso o engañoso'
    )
  ),
  details text,
  created_at timestamptz not null default now(),
  constraint user_reports_no_self check (reporter_id <> reported_user_id)
);

create index if not exists idx_user_reports_reporter on public.user_reports(reporter_id);
create index if not exists idx_user_reports_reported_user on public.user_reports(reported_user_id);
create index if not exists idx_user_reports_match on public.user_reports(match_id);

alter table public.user_reports enable row level security;

create policy "user_reports_insert_own" on public.user_reports
  for insert with check (reporter_id = auth.uid());

create policy "user_reports_select_own" on public.user_reports
  for select using (reporter_id = auth.uid());
