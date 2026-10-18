-- Signup funnel events (written by the app, read only by the backoffice via service_role).
-- Pre-auth rows carry only install_id; account_created links install_id + user_id.
create table if not exists public.signup_events (
  id bigint generated always as identity primary key,
  install_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  event text not null check (event in (
    'welcome_viewed', 'signup_started', 'age_confirmed', 'signup_method_selected',
    'account_created', 'signup_failed', 'onboarding_step_viewed', 'onboarding_step_completed',
    'onboarding_completed', 'onboarding_failed', 'first_home_viewed'
  )),
  step text check (step is null or char_length(step) <= 40),
  step_index smallint,
  props jsonb not null default '{}'::jsonb check (pg_column_size(props) <= 2048),
  platform text check (platform is null or char_length(platform) <= 16),
  app_version text check (app_version is null or char_length(app_version) <= 32),
  created_at timestamptz not null default now()
);
create index if not exists signup_events_install_created_idx on public.signup_events (install_id, created_at);
create index if not exists signup_events_event_created_idx on public.signup_events (event, created_at);
create index if not exists signup_events_user_idx on public.signup_events (user_id) where user_id is not null;

alter table public.signup_events enable row level security;
revoke all on public.signup_events from anon, authenticated;
grant insert (install_id, user_id, event, step, step_index, props, platform, app_version)
  on public.signup_events to anon, authenticated;

drop policy if exists signup_events_insert_anon on public.signup_events;
create policy signup_events_insert_anon on public.signup_events
  for insert to anon
  with check (user_id is null);

drop policy if exists signup_events_insert_own on public.signup_events;
create policy signup_events_insert_own on public.signup_events
  for insert to authenticated
  with check (user_id is null or user_id = (select auth.uid()));
