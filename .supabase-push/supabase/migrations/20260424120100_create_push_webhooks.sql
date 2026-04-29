create extension if not exists pg_net;

create or replace function public.notify_send_push()
returns trigger
language plpgsql
security definer
as $$
declare
  payload jsonb;
begin
  payload := jsonb_build_object(
    'type', TG_OP,
    'schema', TG_TABLE_SCHEMA,
    'table', TG_TABLE_NAME,
    'record', to_jsonb(new)
  );

  perform net.http_post(
    url := 'https://mhmpjezgdvnqyqsnabuq.supabase.co/functions/v1/send-push',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  );

  return new;
end;
$$;

drop trigger if exists trg_send_push_messages on public.messages;
create trigger trg_send_push_messages
  after insert on public.messages
  for each row execute function public.notify_send_push();

drop trigger if exists trg_send_push_event_messages on public.event_messages;
create trigger trg_send_push_event_messages
  after insert on public.event_messages
  for each row execute function public.notify_send_push();

drop trigger if exists trg_send_push_matches on public.matches;
create trigger trg_send_push_matches
  after insert on public.matches
  for each row execute function public.notify_send_push();
