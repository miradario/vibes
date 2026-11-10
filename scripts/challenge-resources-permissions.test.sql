-- Run in a transaction; these fixtures are always rolled back. No real users are changed.
begin;
insert into auth.users(id,aud,role,email) values
('ee000000-0000-4000-8000-000000000001','authenticated','authenticated','res-owner@example.invalid'),
('ee000000-0000-4000-8000-000000000002','authenticated','authenticated','res-member@example.invalid'),
('ee000000-0000-4000-8000-000000000003','authenticated','authenticated','res-outsider@example.invalid'),
('ee000000-0000-4000-8000-000000000006','authenticated','authenticated','res-copier@example.invalid');
insert into public.challenges(id,title,duration_days,created_by,visibility)
values('ee000000-0000-4000-8000-000000000004','Resources transaction test',2,'ee000000-0000-4000-8000-000000000001','public');
insert into public.challenge_participants(challenge_id,user_id)
values('ee000000-0000-4000-8000-000000000004','ee000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','ee000000-0000-4000-8000-000000000001',true);
select public.save_challenge_resources('ee000000-0000-4000-8000-000000000004','[]',0);
insert into storage.objects(bucket_id,name,owner_id,metadata) values('challenge-day-media',
'ee000000-0000-4000-8000-000000000004/resources/ee000000-0000-4000-8000-000000000001/ee000000-0000-4000-8000-000000000005.jpg',
'ee000000-0000-4000-8000-000000000001','{"mimetype":"image/jpeg","size":100}');
select public.save_challenge_resources('ee000000-0000-4000-8000-000000000004',
'[{"id":"ee000000-0000-4000-8000-000000000005","type":"photo","name":"Foto","mime":"image/jpeg","size":100,"path":"ee000000-0000-4000-8000-000000000004/resources/ee000000-0000-4000-8000-000000000001/ee000000-0000-4000-8000-000000000005.jpg"}]',1);
do $$ begin
  begin
    perform public.save_challenge_resources('ee000000-0000-4000-8000-000000000004','[]',0);
    raise exception 'FAIL: stale revision was accepted';
  exception when serialization_failure then null; end;
  begin
    perform public.save_challenge_resources('ee000000-0000-4000-8000-000000000004',
      '[{"id":"ee000000-0000-4000-8000-000000000005","type":"photo","name":"Foto","mime":"image/jpeg","size":100,"path":"ee000000-0000-4000-8000-000000000004/1/ee000000-0000-4000-8000-000000000001/ee000000-0000-4000-8000-000000000005.jpg"}]',2);
    raise exception 'FAIL: day path was accepted as a resource';
  exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','ee000000-0000-4000-8000-000000000002',true);
do $$ begin
  if (select count(*) from public.challenge_resources where challenge_id='ee000000-0000-4000-8000-000000000004') <> 1 then raise exception 'FAIL: member cannot read resources'; end if;
  if not public.challenge_day_media_access('ee000000-0000-4000-8000-000000000004/resources/ee000000-0000-4000-8000-000000000001/ee000000-0000-4000-8000-000000000005.jpg',false) then raise exception 'FAIL: member cannot view published resource photo'; end if;
  begin
    perform public.save_challenge_resources('ee000000-0000-4000-8000-000000000004','[]',2);
    raise exception 'FAIL: member edited resources';
  exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','ee000000-0000-4000-8000-000000000003',true);
do $$ begin
  if exists(select 1 from public.challenge_resources where challenge_id='ee000000-0000-4000-8000-000000000004') then raise exception 'FAIL: outsider read resources'; end if;
  if public.challenge_day_media_access('ee000000-0000-4000-8000-000000000004/resources/ee000000-0000-4000-8000-000000000001/ee000000-0000-4000-8000-000000000005.jpg',false) then raise exception 'FAIL: outsider read resource photo'; end if;
end $$;
-- A restart/Por Vibes copy owner can read source resource files to copy them,
-- even if they are not a participant of the original challenge.
reset role;
insert into public.challenges(id,title,duration_days,created_by,visibility,source_challenge_id)
values('ee000000-0000-4000-8000-000000000007','Restart copy',2,'ee000000-0000-4000-8000-000000000006','private','ee000000-0000-4000-8000-000000000004');
set local role authenticated;
select set_config('request.jwt.claim.sub','ee000000-0000-4000-8000-000000000006',true);
do $$ begin
  if exists(select 1 from public.challenge_resources where challenge_id='ee000000-0000-4000-8000-000000000004') then raise exception 'FAIL: copier read resource rows without participating'; end if;
  if not public.challenge_day_media_access('ee000000-0000-4000-8000-000000000004/resources/ee000000-0000-4000-8000-000000000001/ee000000-0000-4000-8000-000000000005.jpg',false) then raise exception 'FAIL: copier cannot read source resource file'; end if;
end $$;
rollback;
select 'Challenge resource permissions, references and optimistic concurrency passed' as result;
