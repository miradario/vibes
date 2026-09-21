begin;
insert into auth.users(id,aud,role) select ('bf782afd-a6bc-4673-bc43-038fb425002'||n)::uuid,'authenticated','authenticated' from generate_series(1,3)n;
insert into public.profiles(id,display_name,gender_id,intent_id) select ('bf782afd-a6bc-4673-bc43-038fb425002'||n)::uuid,'QA Home '||n,3,3 from generate_series(1,3)n;
insert into public.matches(id,user1_id,user2_id,is_active) values ('bf782afd-a6bc-4673-bc43-038fb4250031','bf782afd-a6bc-4673-bc43-038fb4250021','bf782afd-a6bc-4673-bc43-038fb4250022',true);
insert into public.private_user_state(user_id,availability,moods) values ('bf782afd-a6bc-4673-bc43-038fb4250021','martes',array['Calmado']);
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','bf782afd-a6bc-4673-bc43-038fb4250021',true);
do $$ begin
 if not public.claim_home_preferences_visit() then raise exception 'First visit not claimed';end if;
 if public.claim_home_preferences_visit() then raise exception 'First visit repeated';end if;
 if (select availability from public.private_user_state where user_id=auth.uid()) <> 'martes' then raise exception 'Private answer overwritten';end if;
 if (select moods from public.private_user_state where user_id=auth.uid()) <> array['Calmado'] then raise exception 'Mood overwritten';end if;
end $$;
insert into public.connection_views(user_id,match_id) values(auth.uid(),'bf782afd-a6bc-4673-bc43-038fb4250031') on conflict(user_id,match_id) do nothing;
insert into public.connection_views(user_id,match_id) values(auth.uid(),'bf782afd-a6bc-4673-bc43-038fb4250031') on conflict(user_id,match_id) do nothing;
do $$ begin
 if (select count(*) from public.connection_views) <> 1 then raise exception 'Duplicate view';end if;
 if exists(select 1 from public.direct_message_reads where user_id=auth.uid()) then raise exception 'Opening marked messages read';end if;
end $$;
select set_config('request.jwt.claim.sub','bf782afd-a6bc-4673-bc43-038fb4250022',true);
do $$ begin
 if exists(select 1 from public.connection_views) then raise exception 'Other member view leaked';end if;
 if not public.claim_home_preferences_visit() then raise exception 'New account not claimed';end if;
end $$;
select set_config('request.jwt.claim.sub','bf782afd-a6bc-4673-bc43-038fb4250023',true);
do $$ begin
 begin
  insert into public.connection_views(user_id,match_id) values(auth.uid(),'bf782afd-a6bc-4673-bc43-038fb4250031');
  raise exception 'Nonmember marked conversation open';
 exception when insufficient_privilege then null;end;
 begin
  insert into public.connection_views(user_id,match_id) values('bf782afd-a6bc-4673-bc43-038fb4250022','bf782afd-a6bc-4673-bc43-038fb4250031');
  raise exception 'Forged another user view';
 exception when insufficient_privilege then null;end;
end $$;
set local role anon;
do $$ begin
 begin perform public.claim_home_preferences_visit();raise exception 'Anonymous visit accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'PASS: once per account, private state preserved, views isolated, no false read receipts' as result;
