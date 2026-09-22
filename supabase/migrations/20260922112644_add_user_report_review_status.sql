alter table public.user_reports
  add column if not exists status text not null default 'pending' check (status in ('pending', 'reviewed', 'removed', 'dismissed')),
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

create index if not exists idx_user_reports_status_created
  on public.user_reports(status, created_at desc);
