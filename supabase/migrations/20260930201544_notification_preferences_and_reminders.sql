-- Apply before deploying send-push and releasing the notification settings UI.
alter table public.user_preferences
  add column if not exists notification_connections boolean not null default true,
  add column if not exists notification_matches boolean not null default true,
  add column if not exists notification_direct_messages boolean not null default true,
  add column if not exists notification_group_messages boolean not null default true,
  add column if not exists notification_challenges boolean not null default true,
  add column if not exists notification_events boolean not null default true,
  add column if not exists event_reminder_timing text not null default 'both'
    check (event_reminder_timing in ('24h', '1h', 'both'));

-- Challenges currently encode their start instant in description metadata.
-- Invalid or missing dates must never prevent other reminders from running.
create or replace function private.challenge_reminder_start(description text)
returns timestamptz language plpgsql stable set search_path = '' set timezone = 'UTC' as $$
declare value text;
begin
  value := substring(description from '\[\[starts_at:([^\]]+)\]\]');
  if value is null or value !~ '^\d{4}-\d{2}-\d{2}T' then return null; end if;
  return value::timestamptz;
exception when invalid_datetime_format or datetime_field_overflow then return null;
end;
$$;
revoke all on function private.challenge_reminder_start(text) from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.challenge_reminder_start(text) to service_role;

create table public.notification_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null,
  kind text not null check (kind in ('event_reminder', 'challenge_reminder')),
  lead_hours integer not null check (lead_hours in (1, 24)),
  target_at timestamptz not null,
  due_at timestamptz not null,
  expires_at timestamptz not null,
  request_id bigint,
  attempted_at timestamptz,
  attempts integer not null default 0,
  processed_at timestamptz,
  unique(user_id, event_id, kind, lead_hours, target_at)
);
alter table public.notification_reminders enable row level security;
revoke all on public.notification_reminders from public, anon, authenticated;
grant all on public.notification_reminders to service_role;
create index notification_reminders_pending_idx on public.notification_reminders(due_at)
  where processed_at is null;

create policy notification_reminders_service on public.notification_reminders
  for all to service_role using (true) with check (true);
create table public.notification_reminder_deliveries (
  reminder_id uuid not null references public.notification_reminders(id) on delete cascade,
  token_id uuid not null references public.push_tokens(id) on delete cascade,
  delivered_at timestamptz not null default now(),
  primary key (reminder_id, token_id)
);
alter table public.notification_reminder_deliveries enable row level security;
revoke all on public.notification_reminder_deliveries from public, anon, authenticated;
grant all on public.notification_reminder_deliveries to service_role;
create policy notification_reminder_deliveries_service on public.notification_reminder_deliveries
  for all to service_role using (true) with check (true);

-- A live eligibility view is used both when queueing and immediately before
-- delivery. Leaving, deleting, completing or rescheduling invalidates stale jobs.
create view public.notification_reminder_candidates with (security_invoker = true) as
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
select cp.user_id, c.id, 'challenge_reminder'::text, 24,
  timing.closes_at, timing.closes_at - interval '24 hours',
  timing.closes_at - interval '24 hours' + interval '15 minutes', c.title
from public.challenges c
join public.challenge_participants cp on cp.challenge_id = c.id
join public.profiles profile on profile.id = cp.user_id and profile.is_active and profile.deleted_at is null
left join public.user_preferences pref on pref.user_id = cp.user_id
cross join lateral (select private.challenge_reminder_start(c.description) + c.duration_days * interval '24 hours' closes_at) timing
where c.duration_days > 0 and timing.closes_at is not null
  and cp.total_checkins < c.duration_days
  and cp.joined_at <= timing.closes_at - interval '24 hours'
  and coalesce(pref.notifications_enabled, true) and coalesce(pref.notification_challenges, true);
revoke all on public.notification_reminder_candidates from public, anon, authenticated;
grant select on public.notification_reminder_candidates to service_role;

do $$ begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    create extension pg_cron;
  end if;
end $$;
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
  on conflict (user_id,event_id,kind,lead_hours,target_at) do nothing;

  update public.notification_reminders job set processed_at = now()
  from net._http_response response
  where response.id = job.request_id and response.status_code between 200 and 299
    and job.processed_at is null;

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
select cron.schedule('vibes-notification-reminders', '* * * * *', 'select private.dispatch_notification_reminders()');
-- Deployment activates this job only after the compatible Edge Function is live.
select cron.alter_job((select jobid from cron.job where jobname = 'vibes-notification-reminders'), active := false);
