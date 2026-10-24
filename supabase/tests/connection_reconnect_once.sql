-- Read-only business test. Existing ledger entries exercise the duplicate
-- guard; only blocked RPC paths are called. No push is queued or sent.
begin;
create temp table reconnect_fixture as
select sender_id sender, user_id recipient from public.reengagement_connection_reminders limit 1;
grant select on reconnect_fixture to authenticated;
set local role authenticated;
do $$
declare fixture record; result text;
begin
  select * into fixture from reconnect_fixture;
  if fixture is null then raise exception 'No existing reminder available; test did not run'; end if;
  perform set_config('request.jwt.claim.sub', fixture.sender::text, true);
  -- This pair already has its permanent reminder marker. The RPC must return
  -- before reaching any eligibility checks, inserts or network operations.
  result := public.request_connection_reconnect(fixture.recipient);
  if result <> 'already_sent' then raise exception 'Duplicate was not blocked: %', result; end if;
  result := public.request_connection_reconnect(fixture.recipient);
  if result <> 'already_sent' then raise exception 'Repeated duplicate was not blocked'; end if;
  if not exists(select 1 from public.reengagement_connection_reminders where user_id=fixture.recipient) then
    raise exception 'Sender cannot read reminder state';
  end if;
  perform set_config('request.jwt.claim.sub', fixture.recipient::text, true);
  if exists(select 1 from public.reengagement_connection_reminders where sender_id=fixture.sender) then
    raise exception 'Recipient can read another sender ledger';
  end if;
  result := public.request_connection_reconnect(fixture.recipient);
  if result <> 'unavailable' then raise exception 'Self reminder was not blocked'; end if;
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    perform public.request_connection_reconnect(fixture.recipient);
    raise exception 'Unauthenticated RPC was accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
