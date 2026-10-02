-- Daily challenge reminders use the user's local clock, including DST.
alter table public.user_preferences
  add column challenge_reminder_time time not null default '20:00'
    check (extract(second from challenge_reminder_time) = 0),
  add column challenge_reminder_timezone text;

create or replace function private.validate_challenge_reminder_timezone()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.challenge_reminder_timezone is not null and not exists (
    select 1 from pg_catalog.pg_timezone_names where name = new.challenge_reminder_timezone
  ) then
    raise exception 'Invalid reminder time zone' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_challenge_reminder_timezone() from public, anon, authenticated;
create trigger validate_challenge_reminder_timezone
before insert or update of challenge_reminder_timezone on public.user_preferences
for each row execute function private.validate_challenge_reminder_timezone();

alter table public.notification_reminders drop constraint notification_reminders_lead_hours_check;
alter table public.notification_reminders add constraint notification_reminders_lead_hours_check
  check ((kind = 'event_reminder' and lead_hours in (1,24)) or (kind = 'challenge_reminder' and lead_hours in (0,24)));

create index if not exists challenge_checkins_reminder_day_idx
  on public.challenge_checkins(challenge_id, user_id, created_at);

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
join pg_catalog.pg_timezone_names zone on zone.name = pref.challenge_reminder_timezone
cross join lateral (select (now() at time zone zone.name)::date as local_date,
  (private.challenge_reminder_start(c.description) at time zone zone.name)::date as start_date) calendar
cross join lateral (select (calendar.local_date + pref.challenge_reminder_time) at time zone zone.name due_at) timing
where c.duration_days > 0 and calendar.start_date is not null
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

-- Avoid a PL/pgSQL record variable shadowing the SQL table alias.
create or replace function private.dispatch_notification_reminders()
returns void language plpgsql security definer set search_path = '' as $$
declare secret text; job record; request bigint;
begin
  -- Serialize concurrent scheduler executions without holding a blocking lock.
  if not pg_try_advisory_xact_lock(hashtext('vibes_notification_reminders')) then return; end if;
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'push_webhook_secret';
  if secret is null then raise warning 'Push webhook credential is not configured'; return; end if;

  insert into public.notification_reminders(user_id,event_id,kind,lead_hours,target_at,due_at,expires_at)
  select user_id,event_id,kind,lead_hours,target_at,due_at,expires_at
  from public.notification_reminder_candidates where due_at <= now() and expires_at > now()
  on conflict (user_id,event_id,kind,lead_hours,target_at) do update
    set due_at = excluded.due_at, expires_at = excluded.expires_at,
      request_id = null, attempted_at = null, attempts = 0, processed_at = null
    where public.notification_reminders.due_at is distinct from excluded.due_at
      and not exists (select 1 from public.notification_reminder_deliveries delivered
        where delivered.reminder_id = public.notification_reminders.id);

  update public.notification_reminders queued set processed_at = now()
  from net._http_response response
  where response.id = queued.request_id and response.status_code between 200 and 299
    and queued.processed_at is null;

  for job in select * from public.notification_reminders
    where processed_at is null and due_at <= now() and expires_at > now()
      and attempts < 3 and (attempted_at is null or attempted_at < now() - interval '2 minutes')
    order by due_at limit 100
  loop
    request := net.http_post(
      url := 'https://mhmpjezgdvnqyqsnabuq.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || secret),
      body := jsonb_build_object('type','INSERT','table','notification_reminders','record',jsonb_build_object('id',job.id)),
      timeout_milliseconds := 10000
    );
    update public.notification_reminders set request_id = request, attempted_at = now(), attempts = attempts + 1 where id = job.id;
  end loop;
  delete from public.notification_reminders where expires_at < now() - interval '30 days';
end;
$$;
revoke all on function private.dispatch_notification_reminders() from public, anon, authenticated;
