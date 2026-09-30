-- Provision push_webhook_secret in Vault and PUSH_WEBHOOK_SECRET in Edge secrets first.
create schema if not exists private;
create or replace function private.notify_send_push()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  webhook_secret text;
begin
  if TG_TABLE_NAME = 'swipes' then
    if new.direction <> 'like' or new.swiper_id = new.target_id then return new; end if;
    if TG_OP = 'UPDATE' and old.direction = 'like' then return new; end if;
  end if;
  select decrypted_secret into webhook_secret from vault.decrypted_secrets
    where name = 'push_webhook_secret';
  if webhook_secret is null then
    raise warning 'Push webhook credential is not configured';
    return new;
  end if;
  perform net.http_post(
    url := 'https://mhmpjezgdvnqyqsnabuq.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || webhook_secret),
    body := jsonb_build_object('type', TG_OP, 'schema', TG_TABLE_SCHEMA, 'table', TG_TABLE_NAME,
      'record', to_jsonb(new), 'old_record', case when TG_OP = 'UPDATE' then to_jsonb(old) else null end),
    timeout_milliseconds := 10000
  );
  return new;
end;
$$;
revoke all on function private.notify_send_push() from public, anon, authenticated;

drop trigger if exists trg_send_push_messages on public.messages;
create trigger trg_send_push_messages after insert on public.messages
  for each row execute function private.notify_send_push();
drop trigger if exists trg_send_push_event_messages on public.event_messages;
create trigger trg_send_push_event_messages after insert on public.event_messages
  for each row execute function private.notify_send_push();
drop trigger if exists trg_send_push_matches on public.matches;
create trigger trg_send_push_matches after insert on public.matches
  for each row execute function private.notify_send_push();
drop trigger if exists trg_send_push_swipes on public.swipes;
create trigger trg_send_push_swipes after insert or update of direction on public.swipes
  for each row execute function private.notify_send_push();
drop function if exists public.notify_send_push();
