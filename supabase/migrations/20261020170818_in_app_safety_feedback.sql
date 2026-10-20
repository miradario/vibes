-- Internal feedback and child-safety reporting, without launching email or a browser.
create table public.safety_feedback (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  category text not null check (category in ('child_safety','abuse','support','feedback')),
  details text not null check (char_length(btrim(details)) between 10 and 4000),
  context text check (char_length(context) <= 1000),
  status text not null default 'new' check (status in ('new','reviewing','resolved')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.safety_feedback enable row level security;
revoke all on public.safety_feedback from public, anon, authenticated;
grant insert (id, reporter_id, category, details, context) on public.safety_feedback to authenticated;
grant all on public.safety_feedback to service_role;
create policy safety_feedback_insert_own on public.safety_feedback
  for insert to authenticated with check ((select auth.uid()) = reporter_id);
create index safety_feedback_review_queue on public.safety_feedback(category, created_at) where status = 'new';
comment on table public.safety_feedback is 'Private Vibes feedback queue. Child-safety reports must be reviewed by the designated safety contact. Not readable or editable by app clients.';
