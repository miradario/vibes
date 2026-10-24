-- Reuse the pending-connection reminder ledger, including automatic reminders.
-- Senders may read their own reminder state, never edit or remove the ledger.
grant select on public.reengagement_connection_reminders to authenticated;
create policy connection_reminders_sender_read on public.reengagement_connection_reminders
  for select to authenticated using ((select auth.uid()) = sender_id);

-- Privileged only to queue notifications and read cross-user eligibility.
-- The sender is always derived from the authenticated caller.
create function public.request_connection_reconnect(target_user_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  sender uuid := auth.uid();
  job_id uuid;
  secret text;
  request bigint;
  recipient_date date;
begin
  if sender is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  -- Share the dispatcher lock so manual and scheduled requests cannot race.
  perform pg_advisory_xact_lock(hashtext('vibes_reengagement_notifications'));
  if exists (select 1 from public.reengagement_connection_reminders
      where user_id = target_user_id and sender_id = sender) then
    return 'already_sent';
  end if;
  if target_user_id = sender
    or not exists (select 1 from public.swipes where swiper_id = sender and target_id = target_user_id and direction = 'like')
    or exists (select 1 from public.swipes where swiper_id = target_user_id and target_id = sender)
    or exists (select 1 from public.matches where (user1_id = sender and user2_id = target_user_id) or (user2_id = sender and user1_id = target_user_id))
    or exists (select 1 from public.user_blocks where (blocker_id = sender and blocked_user_id = target_user_id) or (blocker_id = target_user_id and blocked_user_id = sender))
    or (select count(*) from public.profiles where id in (sender, target_user_id) and is_active and deleted_at is null) <> 2
  then return 'unavailable'; end if;
  if exists (select 1 from public.user_preferences where user_id = target_user_id
      and (notifications_enabled = false or notification_connections = false))
    or not exists (select 1 from public.push_tokens where user_id = target_user_id and is_active)
  then return 'unavailable'; end if;
  select (now() at time zone coalesce(zone.name, 'America/Buenos_Aires'))::date into recipient_date
    from public.profiles p
    left join public.user_preferences pref on pref.user_id = p.id
    left join pg_catalog.pg_timezone_names zone on zone.name = pref.challenge_reminder_timezone
    where p.id = target_user_id;
  if exists (select 1 from public.reengagement_notifications where user_id = target_user_id
      and (local_date = recipient_date or (processed_at is null and expires_at > now())))
    or (select count(*) from public.reengagement_notifications where user_id = target_user_id and created_at > now() - interval '7 days') >= 3
  then return 'try_later'; end if;
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'push_webhook_secret';
  if secret is null then raise exception 'Notifications unavailable'; end if;
  insert into public.reengagement_notifications(user_id, kind, subject_id, sender_ids, local_date, expires_at)
    values (target_user_id, 'pending_connections', sender, array[sender], recipient_date, now() + interval '2 hours')
    on conflict do nothing returning id into job_id;
  if job_id is null then return 'already_sent'; end if;
  insert into public.reengagement_connection_reminders(user_id, sender_id, notification_id)
    values (target_user_id, sender, job_id);
  request := net.http_post(
    url := 'https://mhmpjezgdvnqyqsnabuq.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secret),
    body := jsonb_build_object('type', 'INSERT', 'table', 'reengagement_notifications', 'record', jsonb_build_object('id', job_id)),
    timeout_milliseconds := 10000
  );
  update public.reengagement_notifications set request_id = request, attempted_at = now(), attempts = 1 where id = job_id;
  return 'queued';
end;
$$;
revoke all on function public.request_connection_reconnect(uuid) from public, anon;
grant execute on function public.request_connection_reconnect(uuid) to authenticated;
