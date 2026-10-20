-- Taps on push notifications, to measure re-engagement and other pushes.
-- Clients can only insert their own rows; reading is for the backoffice
-- (service role).
create table public.notification_opens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- Device notification identifier, used to log each tap once.
  notification_identifier text not null check (char_length(notification_identifier) <= 300),
  -- Push data.type, or reengagement_<kind> for re-engagement pushes.
  notification_type text not null check (char_length(notification_type) <= 80),
  -- Id from the payload (reengagementId, reminderId, messageId, swipeId, matchId...).
  notification_ref text check (char_length(notification_ref) <= 200),
  reengagement_id text check (char_length(reengagement_id) <= 200),
  app_state text not null check (app_state in ('cold_start','background','foreground')),
  platform text check (platform in ('ios','android')),
  app_version text check (char_length(app_version) <= 40),
  opened_at timestamptz not null default now(),
  unique (user_id, notification_identifier)
);
alter table public.notification_opens enable row level security;
revoke all on public.notification_opens from public, anon, authenticated;
grant insert (user_id, notification_identifier, notification_type, notification_ref, reengagement_id, app_state, platform, app_version)
  on public.notification_opens to authenticated;
grant all on public.notification_opens to service_role;
create policy notification_opens_insert_own on public.notification_opens
  for insert to authenticated with check ((select auth.uid()) = user_id);
create index notification_opens_type_opened_at on public.notification_opens(notification_type, opened_at);
comment on table public.notification_opens is 'Push notification taps logged by the app. Insert-only for clients; read by backoffice/service role.';
