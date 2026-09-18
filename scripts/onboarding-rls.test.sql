-- Run on a Supabase project via db query. All fixtures are rolled back.
begin;
insert into auth.users (id, aud, role) values ('be782afd-a6bc-4673-bc43-038fb4250011','authenticated','authenticated'),('be782afd-a6bc-4673-bc43-038fb4250012','authenticated','authenticated');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','be782afd-a6bc-4673-bc43-038fb4250011',true);
insert into public.private_user_state (user_id,availability,mood_day,moods) values ('be782afd-a6bc-4673-bc43-038fb4250011','QA private',current_date,array['Calmado']);
do $$ begin
 if (select count(*) from public.private_user_state where user_id='be782afd-a6bc-4673-bc43-038fb4250011') != 1 then raise exception 'Owner read failed'; end if;
 if has_table_privilege(current_user,'public.private_user_state','TRUNCATE') then raise exception 'Unexpected truncate privilege'; end if;
end $$;
insert into public.user_preferences(user_id,profile_answers,gender,looking_for,personality,languages) values ('be782afd-a6bc-4673-bc43-038fb4250011','{"gender":"Mujer","lookingFor":["Amistad","Citas"]}'::jsonb,'Mujer',array['Amistad','Citas'],'Introvertido',array['Español']);
do $$ begin
 if (select gender from public.user_preferences where user_id='be782afd-a6bc-4673-bc43-038fb4250011') is distinct from 'Mujer' then raise exception 'Profile save failed'; end if;
 begin
 update public.user_preferences set profile_answers='{"availability":"private"}'::jsonb where user_id='be782afd-a6bc-4673-bc43-038fb4250011';
 raise exception 'Private data accepted in public answers';
 exception when check_violation then null;
 end;
end $$;
update public.private_user_state set moods=array['Curioso'] where user_id='be782afd-a6bc-4673-bc43-038fb4250011';
select set_config('request.jwt.claim.sub','be782afd-a6bc-4673-bc43-038fb4250012',true);
do $$ declare affected integer; begin
 if exists(select 1 from public.private_user_state where user_id='be782afd-a6bc-4673-bc43-038fb4250011') then raise exception 'Cross user read permitted'; end if;
 update public.private_user_state set availability='intrusion' where user_id='be782afd-a6bc-4673-bc43-038fb4250011';
 get diagnostics affected=row_count;
 if affected != 0 then raise exception 'Cross user update permitted'; end if;
 delete from public.private_user_state where user_id='be782afd-a6bc-4673-bc43-038fb4250011';
 get diagnostics affected=row_count;
 if affected != 0 then raise exception 'Cross user delete permitted'; end if;
 begin
  insert into public.private_user_state(user_id) values('be782afd-a6bc-4673-bc43-038fb4250011');
  raise exception 'Cross user insert permitted';
 exception when insufficient_privilege then null;
 end;
end $$;
select set_config('request.jwt.claim.sub','be782afd-a6bc-4673-bc43-038fb4250011',true);
do $$ begin
 if (select moods from public.private_user_state where user_id='be782afd-a6bc-4673-bc43-038fb4250011') is distinct from array['Curioso'] then raise exception 'Owner update failed'; end if;
end $$;
delete from public.private_user_state where user_id='be782afd-a6bc-4673-bc43-038fb4250011';
reset role;
do $$ begin
 if has_table_privilege('anon','public.private_user_state','SELECT') then raise exception 'Anonymous read permitted'; end if;
end $$;
rollback;
select 'PASS: profile persistence and privacy constraint, owner CRUD, cross-user isolation, anonymous blocked, no truncate; fixtures rolled back' as result;
