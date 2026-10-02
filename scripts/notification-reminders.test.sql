-- Transactional integration test. Fixtures and preferences are always rolled back.
-- pg_net requests from the scheduler remain uncommitted and are rolled back: no provider delivery occurs.
begin;
insert into auth.users(id,aud,role,email) values
('de110000-0000-4000-8000-000000000001','authenticated','authenticated','notification-owner@example.invalid'),
('de110000-0000-4000-8000-000000000002','authenticated','authenticated','notification-member@example.invalid');
insert into public.profiles(id,display_name,is_active,gender_id,intent_id) values
('de110000-0000-4000-8000-000000000001','Notification test owner',true,(select id from public.genders limit 1),(select id from public.intents limit 1)),
('de110000-0000-4000-8000-000000000002','Notification test member',true,(select id from public.genders limit 1),(select id from public.intents limit 1))
on conflict(id) do update set is_active=true;
insert into public.events(id,type,title,starts_at,created_by) values
('de110000-0000-4000-8000-000000000003','event','Reminder transaction test',now()+interval '24 hours'-interval '1 minute','de110000-0000-4000-8000-000000000001');
insert into public.event_participants(event_id,event_type,user_id,joined_at) values
('de110000-0000-4000-8000-000000000003','event','de110000-0000-4000-8000-000000000002',now()-interval '2 days');
insert into public.challenges(id,title,duration_days,description,created_by) values
('de110000-0000-4000-8000-000000000004','Reminder challenge test',2,
 '[[starts_at:' || to_char((now()-interval '1 day'-interval '1 minute') at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') || ']]',
 'de110000-0000-4000-8000-000000000001');
insert into public.challenge_participants(challenge_id,user_id,joined_at) values
('de110000-0000-4000-8000-000000000004','de110000-0000-4000-8000-000000000002',now()-interval '2 days');
insert into public.user_preferences(user_id,challenge_reminder_timezone,challenge_reminder_time)
values('de110000-0000-4000-8000-000000000002','UTC',date_trunc('minute',now() at time zone 'UTC')::time)
on conflict(user_id) do update set challenge_reminder_timezone='UTC',challenge_reminder_time=excluded.challenge_reminder_time;
set local role service_role;
do $$ begin
  if (select count(*) from public.notification_reminder_candidates where user_id='de110000-0000-4000-8000-000000000002' and due_at<=now() and expires_at>now()) <> 2 then raise exception 'FAIL: expected event and challenge reminders due now'; end if;
  if private.challenge_reminder_start('[[starts_at:bad date]]') is not null then raise exception 'FAIL: invalid metadata accepted'; end if;
  if private.challenge_reminder_start('[[starts_at:2026-99-99T10:00:00Z]]') is not null then raise exception 'FAIL: invalid ISO date accepted'; end if;
end $$;
reset role;
-- pg_net only processes requests after commit; this transaction always rolls back.
select private.dispatch_notification_reminders();
select private.dispatch_notification_reminders();
do $$ begin
  if (select count(*) from public.notification_reminders where user_id='de110000-0000-4000-8000-000000000002') <> 2 then raise exception 'FAIL: scheduler failed to enqueue or duplicated reminders'; end if;
  if exists(select 1 from public.notification_reminders where user_id='de110000-0000-4000-8000-000000000002' and (attempts<>1 or request_id is null)) then raise exception 'FAIL: scheduler repeated delivery before retry interval'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','de110000-0000-4000-8000-000000000002',true);
update public.user_preferences set notification_connections=false,event_reminder_timing='1h',notifications_enabled=false where user_id='de110000-0000-4000-8000-000000000002';
do $$ begin
  if not exists(select 1 from public.user_preferences where user_id='de110000-0000-4000-8000-000000000002' and notifications_enabled=false) then raise exception 'FAIL: own preferences did not save'; end if;
  begin
    perform * from public.notification_reminders;
    raise exception 'FAIL: client can access reminder queue';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.notification_reminder_candidates;
    raise exception 'FAIL: client can access other users reminders';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  if exists(select 1 from public.notification_reminder_candidates where user_id='de110000-0000-4000-8000-000000000002') then raise exception 'FAIL: master switch did not disable reminders'; end if;
end $$;
update public.user_preferences set notifications_enabled=true where user_id='de110000-0000-4000-8000-000000000002';
do $$ begin
  if (select notification_connections from public.user_preferences where user_id='de110000-0000-4000-8000-000000000002') then raise exception 'FAIL: categories reset on re-enable'; end if;
  if exists(select 1 from public.notification_reminder_candidates where user_id='de110000-0000-4000-8000-000000000002' and kind='event_reminder' and lead_hours=24) then raise exception 'FAIL: wrong lead time'; end if;
end $$;
update public.user_preferences set event_reminder_timing='24h',notification_challenges=false where user_id='de110000-0000-4000-8000-000000000002';
do $$ begin
  if (select count(*) from public.notification_reminder_candidates where user_id='de110000-0000-4000-8000-000000000002') <> 1 then raise exception 'FAIL: independent category and timing preferences'; end if;
end $$;
update public.user_preferences set notification_challenges=true where user_id='de110000-0000-4000-8000-000000000002';
-- Local dates can differ from UTC dates. Yesterday's completion does not suppress
-- today, while a check-in made today does, even with a legacy UTC checkin_date.
update public.user_preferences set challenge_reminder_timezone='Pacific/Kiritimati',
  challenge_reminder_time=date_trunc('minute',now() at time zone 'Pacific/Kiritimati')::time
where user_id='de110000-0000-4000-8000-000000000002';
do $$ begin
  if not exists(select 1 from public.notification_reminder_candidates where user_id='de110000-0000-4000-8000-000000000002' and kind='challenge_reminder' and lead_hours=0 and due_at<=now() and expires_at>now()) then raise exception 'FAIL: local daily reminder not due'; end if;
end $$;
insert into public.challenge_checkins(challenge_id,user_id,checkin_date,created_at)
values('de110000-0000-4000-8000-000000000004','de110000-0000-4000-8000-000000000002',
 (now() at time zone 'UTC')::date,
 ((now() at time zone 'Pacific/Kiritimati')::date::timestamp at time zone 'Pacific/Kiritimati')-interval '1 minute');
do $$ begin
  if not exists(select 1 from public.notification_reminder_candidates where user_id='de110000-0000-4000-8000-000000000002' and kind='challenge_reminder') then raise exception 'FAIL: yesterday completion suppressed today'; end if;
end $$;
update public.challenge_checkins set created_at=now() where user_id='de110000-0000-4000-8000-000000000002';
do $$ begin
  if exists(select 1 from public.notification_reminder_candidates where user_id='de110000-0000-4000-8000-000000000002' and kind='challenge_reminder') then raise exception 'FAIL: completed today still eligible'; end if;
  begin
    update public.user_preferences set challenge_reminder_timezone='Invalid/Zone' where user_id='de110000-0000-4000-8000-000000000002';
    raise exception 'FAIL: invalid timezone accepted';
  exception when invalid_parameter_value then null; end;
end $$;
delete from public.challenge_checkins where user_id='de110000-0000-4000-8000-000000000002';

update public.challenge_participants set total_checkins=2 where user_id='de110000-0000-4000-8000-000000000002';
do $$ begin
  if exists(select 1 from public.notification_reminder_candidates where user_id='de110000-0000-4000-8000-000000000002' and kind='challenge_reminder') then raise exception 'FAIL: completed challenge still eligible'; end if;
end $$;
update public.events set starts_at=now()+interval '3 days' where id='de110000-0000-4000-8000-000000000003';
do $$ begin
  if exists(select 1 from public.notification_reminder_candidates where user_id='de110000-0000-4000-8000-000000000002' and due_at<=now()) then raise exception 'FAIL: rescheduled event still due'; end if;
end $$;
delete from public.event_participants where user_id='de110000-0000-4000-8000-000000000002';
do $$ begin
  if exists(select 1 from public.notification_reminder_candidates where user_id='de110000-0000-4000-8000-000000000002') then raise exception 'FAIL: former participant still eligible'; end if;
end $$;
select 'notification reminder integration checks passed' result;
rollback;
