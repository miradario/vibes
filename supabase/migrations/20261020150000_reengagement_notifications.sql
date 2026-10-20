-- Re-engagement pushes (Trello: "Plan de notificaciones para que la gente vuelva a la app").
-- 1) Pending connection requests older than 24h (one reminder per pending sender, ever).
-- 2) A new event that matches the user's interests (category or proximity).
-- 3) A new public challenge that matches the user's interests (tags or past participation).
-- Delivery reuses send-push. The cron job is created inactive: activate it only
-- after the compatible send-push is deployed.

create table public.reengagement_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('pending_connections', 'new_event', 'new_challenge')),
  -- Event/challenge id, or the most recent pending sender for pending_connections.
  subject_id uuid not null,
  sender_ids uuid[] not null default '{}',
  local_date date not null,
  due_at timestamptz not null default now(),
  expires_at timestamptz not null,
  request_id bigint,
  attempted_at timestamptz,
  attempts integer not null default 0,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  -- Never repeat the same event/challenge to the same user.
  unique (user_id, kind, subject_id)
);
-- At most one re-engagement push per user per local day.
create unique index reengagement_notifications_daily_idx
  on public.reengagement_notifications(user_id, local_date);
create index reengagement_notifications_pending_idx
  on public.reengagement_notifications(due_at) where processed_at is null;
create index reengagement_notifications_user_created_idx
  on public.reengagement_notifications(user_id, created_at desc);
alter table public.reengagement_notifications enable row level security;
revoke all on public.reengagement_notifications from public, anon, authenticated;
grant all on public.reengagement_notifications to service_role;
create policy reengagement_notifications_service on public.reengagement_notifications
  for all to service_role using (true) with check (true);

-- Pending senders already reminded about, so each one triggers a single reminder.
create table public.reengagement_connection_reminders (
  user_id uuid not null references auth.users(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  notification_id uuid not null references public.reengagement_notifications(id) on delete cascade,
  primary key (user_id, sender_id)
);
alter table public.reengagement_connection_reminders enable row level security;
revoke all on public.reengagement_connection_reminders from public, anon, authenticated;
grant all on public.reengagement_connection_reminders to service_role;
create policy reengagement_connection_reminders_service on public.reengagement_connection_reminders
  for all to service_role using (true) with check (true);

create table public.reengagement_notification_deliveries (
  notification_id uuid not null references public.reengagement_notifications(id) on delete cascade,
  token_id uuid not null references public.push_tokens(id) on delete cascade,
  delivered_at timestamptz not null default now(),
  primary key (notification_id, token_id)
);
alter table public.reengagement_notification_deliveries enable row level security;
revoke all on public.reengagement_notification_deliveries from public, anon, authenticated;
grant all on public.reengagement_notification_deliveries to service_role;
create policy reengagement_notification_deliveries_service on public.reengagement_notification_deliveries
  for all to service_role using (true) with check (true);

create index if not exists swipes_target_like_idx on public.swipes(target_id, created_at) where direction = 'like';

-- Live candidates. Evaluated when queueing and again by send-push right before
-- delivery, so accepting a request, joining the event or opting out cancels it.
-- Users only qualify with an active push token, notifications enabled and
-- inside the local sending window (10:00-21:00, user zone or Buenos Aires).
create view public.reengagement_candidates with (security_invoker = true) as
with recipients as (
  select profile.id user_id, pref.notification_connections, pref.notification_events,
    pref.notification_challenges, profile.latitude, profile.longitude,
    (now() at time zone coalesce(zone.name, 'America/Buenos_Aires')) local_now
  from public.profiles profile
  left join public.user_preferences pref on pref.user_id = profile.id
  left join pg_catalog.pg_timezone_names zone on zone.name = pref.challenge_reminder_timezone
  where profile.is_active and profile.deleted_at is null
    and coalesce(pref.notifications_enabled, true)
    and exists (select 1 from public.push_tokens token where token.user_id = profile.id and token.is_active)
),
eligible as (
  select r.*, r.local_now::date local_date from recipients r
  where r.local_now::time >= time '10:00' and r.local_now::time < time '21:00'
),
pending as (
  select e.user_id, s.swiper_id, s.created_at
  from eligible e
  join public.swipes s on s.target_id = e.user_id and s.direction = 'like'
  join public.profiles sender on sender.id = s.swiper_id and sender.is_active and sender.deleted_at is null
  where coalesce(e.notification_connections, true)
    and s.created_at <= now() - interval '24 hours'
    and s.created_at > now() - interval '14 days'
    and not exists (select 1 from public.swipes answer where answer.swiper_id = e.user_id and answer.target_id = s.swiper_id)
    and not exists (select 1 from public.matches m where m.is_active
      and ((m.user1_id = e.user_id and m.user2_id = s.swiper_id) or (m.user2_id = e.user_id and m.user1_id = s.swiper_id)))
    and not exists (select 1 from public.user_blocks b
      where (b.blocker_id = e.user_id and b.blocked_user_id = s.swiper_id) or (b.blocker_id = s.swiper_id and b.blocked_user_id = e.user_id))
    and not exists (select 1 from public.reengagement_connection_reminders done
      where done.user_id = e.user_id and done.sender_id = s.swiper_id)
),
connection_candidates as (
  select user_id, 'pending_connections'::text kind,
    (array_agg(swiper_id order by created_at desc))[1] subject_id,
    array_agg(swiper_id order by created_at desc) sender_ids,
    count(*)::int item_count, null::text title, 1 priority
  from pending group by user_id
),
event_candidates as (
  select distinct on (e.user_id) e.user_id, 'new_event'::text kind, ev.id subject_id,
    '{}'::uuid[] sender_ids, 1 item_count, ev.title, 2 priority
  from eligible e
  join public.events ev on ev.type = 'event' and ev.created_by <> e.user_id
    and ev.created_at > now() - interval '72 hours'
    and ev.starts_at > now() + interval '12 hours'
    and (ev.capacity = 0 or ev.participant_count < ev.capacity)
  where coalesce(e.notification_events, true)
    and not exists (select 1 from public.event_participants p where p.event_id = ev.id and p.user_id = e.user_id)
    and (
      -- Same category as an event the user joined in the last 6 months.
      (ev.category is not null and exists (select 1 from public.event_participants p
        join public.events past on past.id = p.event_id
        where p.user_id = e.user_id and p.event_type = 'event' and past.category = ev.category
          and p.joined_at > now() - interval '180 days'))
      -- Or in person within ~30 km of the user's profile location.
      or (ev.location_latitude is not null and e.latitude is not null
        and 2 * 6371 * asin(sqrt(power(sin(radians(ev.location_latitude - e.latitude) / 2), 2)
          + cos(radians(e.latitude)) * cos(radians(ev.location_latitude))
          * power(sin(radians(ev.location_longitude - e.longitude) / 2), 2))) <= 30)
    )
  order by e.user_id, ev.participant_count desc, ev.created_at desc
),
challenge_candidates as (
  select distinct on (e.user_id) e.user_id, 'new_challenge'::text kind, c.id subject_id,
    '{}'::uuid[] sender_ids, 1 item_count, c.title, 3 priority
  from eligible e
  join public.challenges c on coalesce(c.visibility, 'public') = 'public'
    and c.source_challenge_id is null and c.created_by <> e.user_id
    and c.created_at > now() - interval '72 hours'
  where coalesce(e.notification_challenges, true)
    and not exists (select 1 from public.challenge_participants p where p.challenge_id = c.id and p.user_id = e.user_id)
    -- Users who joined any challenge in the last 6 months; tag overlap ranks first.
    and exists (select 1 from public.challenge_participants p where p.user_id = e.user_id and p.joined_at > now() - interval '180 days')
  order by e.user_id,
    (select count(*) from public.challenge_participants p join public.challenges past on past.id = p.challenge_id
      where p.user_id = e.user_id and past.tags && c.tags) desc,
    c.participant_count desc, c.created_at desc
)
select e.local_date, c.* from (
  select * from connection_candidates
  union all select * from event_candidates
  union all select * from challenge_candidates
) c join eligible e using (user_id);
revoke all on public.reengagement_candidates from public, anon, authenticated;
grant select on public.reengagement_candidates to service_role;

create or replace function private.dispatch_reengagement_notifications()
returns void language plpgsql security definer set search_path = '' as $$
declare secret text; job record; request bigint;
begin
  if not pg_try_advisory_xact_lock(hashtext('vibes_reengagement_notifications')) then return; end if;
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'push_webhook_secret';
  if secret is null then raise warning 'Push webhook credential is not configured'; return; end if;

  -- One push per user per day (highest priority case wins), max 3 per rolling
  -- 7 days, and nothing while the user has an undelivered one.
  with picked as (
    select distinct on (c.user_id) c.* from public.reengagement_candidates c
    where not exists (select 1 from public.reengagement_notifications n
        where n.user_id = c.user_id and (n.local_date = c.local_date or n.processed_at is null and n.expires_at > now()))
      and (select count(*) from public.reengagement_notifications n
        where n.user_id = c.user_id and n.created_at > now() - interval '7 days') < 3
      -- Discovery pushes (events/challenges) skip users who opened the app in the last 24h.
      and (c.kind = 'pending_connections' or not exists (select 1 from public.app_opens o
        where o.user_id = c.user_id and o.opened_at > now() - interval '24 hours'))
    order by c.user_id, c.priority
    limit 500
  ), inserted as (
    insert into public.reengagement_notifications(user_id, kind, subject_id, sender_ids, local_date, expires_at)
    select user_id, kind, subject_id, sender_ids, local_date, now() + interval '2 hours' from picked
    on conflict do nothing
    returning id, user_id, sender_ids
  )
  insert into public.reengagement_connection_reminders(user_id, sender_id, notification_id)
  select i.user_id, unnest(i.sender_ids), i.id from inserted i
  on conflict do nothing;

  update public.reengagement_notifications queued set processed_at = now()
  from net._http_response response
  where response.id = queued.request_id and response.status_code between 200 and 299
    and queued.processed_at is null;

  for job in select * from public.reengagement_notifications
    where processed_at is null and due_at <= now() and expires_at > now()
      and attempts < 3 and (attempted_at is null or attempted_at < now() - interval '2 minutes')
    order by due_at limit 100
  loop
    request := net.http_post(
      url := 'https://mhmpjezgdvnqyqsnabuq.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || secret),
      body := jsonb_build_object('type','INSERT','table','reengagement_notifications','record',jsonb_build_object('id',job.id)),
      timeout_milliseconds := 10000
    );
    update public.reengagement_notifications set request_id = request, attempted_at = now(), attempts = attempts + 1 where id = job.id;
  end loop;
  -- Keep 90 days of history (dedupe for events/challenges only needs recent items).
  delete from public.reengagement_notifications where created_at < now() - interval '90 days'
    and kind <> 'pending_connections';
end;
$$;
revoke all on function private.dispatch_reengagement_notifications() from public, anon, authenticated;

select cron.schedule('vibes-reengagement-notifications', '*/15 * * * *', 'select private.dispatch_reengagement_notifications()');
-- Deployment activates this job only after the compatible send-push is live.
select cron.alter_job((select jobid from cron.job where jobname = 'vibes-reengagement-notifications'), active := false);
