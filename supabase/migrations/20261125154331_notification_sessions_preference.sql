-- Applied to prod 2026-11-25. New opt-out for session pushes (default on).
-- The app only shows the toggle once this column exists; send-push falls back if it is missing.
alter table public.user_preferences
  add column if not exists notification_sessions boolean not null default true;
