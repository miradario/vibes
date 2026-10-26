-- New signup funnel events: onboarding_skipped (user taps "Completar después",
-- step = where they skipped from) and app_backgrounded (app sent to background
-- during signup/onboarding, step = current step).
-- MUST be applied BEFORE shipping the native build that sends them: the check
-- constraint rejects unknown events and the app drops those inserts silently.
alter table public.signup_events drop constraint if exists signup_events_event_check;
alter table public.signup_events add constraint signup_events_event_check check (event in (
  'welcome_viewed', 'signup_started', 'age_confirmed', 'signup_method_selected',
  'account_created', 'signup_failed', 'onboarding_step_viewed', 'onboarding_step_completed',
  'onboarding_completed', 'onboarding_failed', 'first_home_viewed',
  'onboarding_skipped', 'app_backgrounded'
));
