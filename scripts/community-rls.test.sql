-- Transactional integration test. Never commits fixtures or sends user messages.
begin;
insert into auth.users(id,aud,role) select ('be782afd-a6bc-4673-bc43-038fb425002'||n)::uuid,'authenticated','authenticated' from generate_series(1,4)n;
insert into public.profiles(id,display_name,gender_id,intent_id) select ('be782afd-a6bc-4673-bc43-038fb425002'||n)::uuid,'QA '||n,3,3 from generate_series(1,4)n;
insert into public.matches(id,user1_id,user2_id,is_active) values ('be782afd-a6bc-4673-bc43-038fb4250031','be782afd-a6bc-4673-bc43-038fb4250021','be782afd-a6bc-4673-bc43-038fb4250022',true);
insert into public.community_groups(id,name,created_by) values('be782afd-a6bc-4673-bc43-038fb4250032','QA group','be782afd-a6bc-4673-bc43-038fb4250021');
insert into public.community_group_members(group_id,user_id,joined_at) select 'be782afd-a6bc-4673-bc43-038fb4250032',('be782afd-a6bc-4673-bc43-038fb425002'||n)::uuid,now()+n*interval '1 second' from generate_series(1,3)n;
insert into public.messages(id,match_id,sender_id,text) values('be782afd-a6bc-4673-bc43-038fb4250041','be782afd-a6bc-4673-bc43-038fb4250031','be782afd-a6bc-4673-bc43-038fb4250021','QA direct');
insert into public.community_group_messages(id,group_id,sender_id,body) values('be782afd-a6bc-4673-bc43-038fb4250042','be782afd-a6bc-4673-bc43-038fb4250032','be782afd-a6bc-4673-bc43-038fb4250021','QA group');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','be782afd-a6bc-4673-bc43-038fb4250022',true);
do $$ begin
 if (select count(*) from public.community_receive_messages())<>2 then raise exception 'Expected incoming content'; end if;
 if (select sum(unread_count) from public.community_unread_counts()) is distinct from 2::numeric then raise exception 'Unread counter'; end if;
end $$;
select public.community_ack_messages('direct',array['be782afd-a6bc-4673-bc43-038fb4250041'::uuid],false);
select public.community_ack_messages('group',array['be782afd-a6bc-4673-bc43-038fb4250042'::uuid],true);
select set_config('request.jwt.claim.sub','be782afd-a6bc-4673-bc43-038fb4250021',true);
do $$ begin
 if (select status from public.community_message_statuses('direct',array['be782afd-a6bc-4673-bc43-038fb4250041'::uuid])) is distinct from 'delivered' then raise exception 'Direct delivered'; end if;
 if (select status from public.community_message_statuses('group',array['be782afd-a6bc-4673-bc43-038fb4250042'::uuid])) is distinct from 'sent' then raise exception 'Not all group members received'; end if;
 if exists(select 1 from public.community_unread_counts()) then raise exception 'Own message counted unread'; end if;
end $$;
select set_config('request.jwt.claim.sub','be782afd-a6bc-4673-bc43-038fb4250024',true);
do $$ begin
 if exists(select 1 from public.community_receive_messages()) or exists(select 1 from public.community_message_receipts) then raise exception 'Nonmember leaked receipts'; end if;
 begin perform public.leave_community_group('be782afd-a6bc-4673-bc43-038fb4250032');raise exception 'Nonmember could leave';exception when raise_exception then if sqlerrm<>'Not a member' then raise;end if;end;
end $$;
select public.community_ack_messages('direct',array['be782afd-a6bc-4673-bc43-038fb4250041'::uuid],true);
select set_config('request.jwt.claim.sub','be782afd-a6bc-4673-bc43-038fb4250023',true);
select public.leave_community_group('be782afd-a6bc-4673-bc43-038fb4250032');
do $$ begin
 if exists(select 1 from public.community_group_messages where group_id='be782afd-a6bc-4673-bc43-038fb4250032') then raise exception 'History visible after leaving'; end if;
end $$;
select set_config('request.jwt.claim.sub','be782afd-a6bc-4673-bc43-038fb4250021',true);
do $$ begin
 if (select status from public.community_message_statuses('group',array['be782afd-a6bc-4673-bc43-038fb4250042'::uuid])) is distinct from 'read' then raise exception 'Departed recipient blocks read'; end if;
 if (select status from public.community_message_statuses('direct',array['be782afd-a6bc-4673-bc43-038fb4250041'::uuid])) is distinct from 'delivered' then raise exception 'Outsider forged receipt'; end if;
end $$;
select public.leave_community_group('be782afd-a6bc-4673-bc43-038fb4250032');
select set_config('request.jwt.claim.sub','be782afd-a6bc-4673-bc43-038fb4250022',true);
do $$ begin
 if (select created_by from public.community_groups where id='be782afd-a6bc-4673-bc43-038fb4250032') is distinct from 'be782afd-a6bc-4673-bc43-038fb4250022'::uuid then raise exception 'Owner not transferred'; end if;
 if (select count(*) from public.community_group_messages where group_id='be782afd-a6bc-4673-bc43-038fb4250032' and message_kind='system')<>3 then raise exception 'Missing system events';end if;
 begin insert into public.community_group_messages(group_id,sender_id,body,message_kind) values('be782afd-a6bc-4673-bc43-038fb4250032','be782afd-a6bc-4673-bc43-038fb4250022','forged system','system');raise exception 'Forged system event allowed';exception when insufficient_privilege then null;end;
end $$;
select public.community_ack_messages('direct',array['be782afd-a6bc-4673-bc43-038fb4250041'::uuid],true);
select public.leave_community_group('be782afd-a6bc-4673-bc43-038fb4250032');
reset role;
do $$ begin
 if exists(select 1 from public.community_groups where id='be782afd-a6bc-4673-bc43-038fb4250032') then raise exception 'Empty group remains';end if;
 if exists(select 1 from public.community_message_receipts where conversation_id='be782afd-a6bc-4673-bc43-038fb4250032') then raise exception 'Orphan receipts';end if;
 if (select read_at from public.community_message_receipts where message_id='be782afd-a6bc-4673-bc43-038fb4250041') is null then raise exception 'Direct read missing';end if;
end $$;
insert into public.events(id,type,title,created_by) values('be782afd-a6bc-4673-bc43-038fb4250051','event','QA event','be782afd-a6bc-4673-bc43-038fb4250021');
insert into public.event_participants(event_id,event_type,user_id) values('be782afd-a6bc-4673-bc43-038fb4250051','event','be782afd-a6bc-4673-bc43-038fb4250022');
insert into public.event_messages(event_id,event_type,sender_id,body) values
 ('be782afd-a6bc-4673-bc43-038fb4250051','event','be782afd-a6bc-4673-bc43-038fb4250021','QA event 1'),
 ('be782afd-a6bc-4673-bc43-038fb4250051','event','be782afd-a6bc-4673-bc43-038fb4250021','QA event 2'),
 ('be782afd-a6bc-4673-bc43-038fb4250051','event','be782afd-a6bc-4673-bc43-038fb4250022','Own message');
set local role authenticated;
select set_config('request.jwt.claim.sub','be782afd-a6bc-4673-bc43-038fb4250022',true);
do $$ begin
 if (select unread_count from public.community_unread_counts() where kind='event' and conversation_id='be782afd-a6bc-4673-bc43-038fb4250051') is distinct from 2::bigint then raise exception 'Event unread count or own-message exclusion';end if;
end $$;
insert into public.event_group_reads(event_id,event_type,user_id,last_read_at) values('be782afd-a6bc-4673-bc43-038fb4250051','event','be782afd-a6bc-4673-bc43-038fb4250022',now());
do $$ begin
 if exists(select 1 from public.community_unread_counts() where kind='event') then raise exception 'Event read marker ignored';end if;
end $$;
select set_config('request.jwt.claim.sub','be782afd-a6bc-4673-bc43-038fb4250024',true);
do $$ begin
 if exists(select 1 from public.community_unread_counts()) then raise exception 'Outsider sees event count';end if;
end $$;
reset role;
rollback;
select 'PASS: delivery, reading, unread counts, isolation, leave, succession, system events, cleanup' as result;
