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
  on conflict (user_id,event_id,kind,lead_hours,target_at) do nothing;

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
