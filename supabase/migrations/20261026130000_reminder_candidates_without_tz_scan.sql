-- Challenge reminders timed out (57014) in send-push: every lookup on this view
-- ran a Function Scan on pg_catalog.pg_timezone_names (~56 ms of ~58 ms, it
-- reads all ~1200 zones from disk) and concurrent lookups hit the 8s timeout.
-- The zone is already validated on write by validate_challenge_reminder_timezone,
-- so use it directly instead of joining the catalog. Same columns and rows.
create or replace view public.notification_reminder_candidates with (security_invoker = true) as
select ep.user_id, e.id event_id, 'event_reminder'::text kind, lead.hours lead_hours,
  e.starts_at target_at, e.starts_at - make_interval(hours => lead.hours) due_at,
  least(e.starts_at, e.starts_at - make_interval(hours => lead.hours) + interval '15 minutes') expires_at,
  e.title
from public.events e
join public.event_participants ep on ep.event_id = e.id and ep.event_type = 'event'
join public.profiles profile on profile.id = ep.user_id and profile.is_active and profile.deleted_at is null
left join public.user_preferences pref on pref.user_id = ep.user_id
cross join (values (24), (1)) lead(hours)
where e.type = 'event' and e.starts_at is not null
  and coalesce(pref.notifications_enabled, true) and coalesce(pref.notification_events, true)
  and (coalesce(pref.event_reminder_timing, 'both') = 'both' or pref.event_reminder_timing = lead.hours::text || 'h')
  and ep.joined_at <= e.starts_at - make_interval(hours => lead.hours)
union all
select cp.user_id, c.id, 'challenge_reminder'::text, 0,
  calendar.local_date::timestamp at time zone 'UTC', timing.due_at,
  least(timing.due_at + interval '15 minutes', (calendar.local_date + 1)::timestamp at time zone zone.name), c.title
from public.challenges c
join public.challenge_participants cp on cp.challenge_id = c.id
join public.profiles profile on profile.id = cp.user_id and profile.is_active and profile.deleted_at is null
join public.user_preferences pref on pref.user_id = cp.user_id
cross join lateral (select pref.challenge_reminder_timezone as name) zone
cross join lateral (select (now() at time zone zone.name)::date as local_date,
  (private.challenge_reminder_start(c.description) at time zone zone.name)::date as start_date) calendar
cross join lateral (select (calendar.local_date + pref.challenge_reminder_time) at time zone zone.name due_at) timing
where pref.challenge_reminder_timezone is not null and c.duration_days > 0 and calendar.start_date is not null
  and calendar.local_date >= calendar.start_date and calendar.local_date < calendar.start_date + c.duration_days
  and private.challenge_reminder_start(c.description) <= now()
  and cp.total_checkins < c.duration_days and cp.joined_at <= timing.due_at
  and pref.notifications_enabled and pref.notification_challenges
  -- Use actual completion instants, including legacy check-ins with UTC date keys.
  and not exists (select 1 from public.challenge_checkins checkin
    where checkin.challenge_id = c.id and checkin.user_id = cp.user_id
      and checkin.created_at >= calendar.local_date::timestamp at time zone zone.name
      and checkin.created_at < (calendar.local_date + 1)::timestamp at time zone zone.name);
revoke all on public.notification_reminder_candidates from public, anon, authenticated;
grant select on public.notification_reminder_candidates to service_role;
