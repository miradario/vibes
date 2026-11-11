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
-- Private source the copier must not be able to reach by planting source_challenge_id.
reset role;
insert into public.challenges(id,title,duration_days,created_by,visibility)
values('ee000000-0000-4000-8000-000000000008','Private resources',2,'ee000000-0000-4000-8000-000000000001','private');
set local role authenticated;
select set_config('request.jwt.claim.sub','ee000000-0000-4000-8000-000000000001',true);
select public.save_challenge_resources('ee000000-0000-4000-8000-000000000008','[]',0);
insert into storage.objects(bucket_id,name,owner_id,metadata) values('challenge-day-media',
'ee000000-0000-4000-8000-000000000008/resources/ee000000-0000-4000-8000-000000000001/ee000000-0000-4000-8000-00000000000a.jpg',
'ee000000-0000-4000-8000-000000000001','{"mimetype":"image/jpeg","size":100}');
select public.save_challenge_resources('ee000000-0000-4000-8000-000000000008',
'[{"id":"ee000000-0000-4000-8000-00000000000a","type":"photo","name":"Secreta","mime":"image/jpeg","size":100,"path":"ee000000-0000-4000-8000-000000000008/resources/ee000000-0000-4000-8000-000000000001/ee000000-0000-4000-8000-00000000000a.jpg"}]',1);

-- Copier without a restart copy still cannot read rows, files or the copy RPC.
select set_config('request.jwt.claim.sub','ee000000-0000-4000-8000-000000000006',true);
do $$ begin
  if exists(select 1 from public.challenge_resources where challenge_id='ee000000-0000-4000-8000-000000000004') then
    raise exception 'FAIL: copier read resource rows before copying';
  end if;
  if public.challenge_day_media_access('ee000000-0000-4000-8000-000000000004/resources/ee000000-0000-4000-8000-000000000001/ee000000-0000-4000-8000-000000000005.jpg',false) then
    raise exception 'FAIL: copier read source resource file before creating a copy';
  end if;
  begin
    perform public.list_challenge_resource_media_for_copy(
      'ee000000-0000-4000-8000-000000000004','ee000000-0000-4000-8000-000000000007');
    raise exception 'FAIL: list resource media allowed without a copy';
  exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
end $$;

reset role;
insert into public.challenges(id,title,duration_days,created_by,visibility,source_challenge_id)
values('ee000000-0000-4000-8000-000000000007','Restart copy',2,'ee000000-0000-4000-8000-000000000006','private','ee000000-0000-4000-8000-000000000004');
-- Planted pointer at a private source the copier cannot restart.
insert into public.challenges(id,title,duration_days,created_by,visibility,source_challenge_id)
values('ee000000-0000-4000-8000-00000000000b','Planted copy',2,'ee000000-0000-4000-8000-000000000006','private','ee000000-0000-4000-8000-000000000008');

set local role authenticated;
select set_config('request.jwt.claim.sub','ee000000-0000-4000-8000-000000000006',true);
do $$ begin
  if exists(select 1 from public.challenge_resources where challenge_id='ee000000-0000-4000-8000-000000000004') then
    raise exception 'FAIL: copier read resource rows without participating';
  end if;
  if not public.challenge_day_media_access('ee000000-0000-4000-8000-000000000004/resources/ee000000-0000-4000-8000-000000000001/ee000000-0000-4000-8000-000000000005.jpg',false) then
    raise exception 'FAIL: copier cannot read source resource file';
  end if;
  if public.challenge_day_media_access('ee000000-0000-4000-8000-000000000008/resources/ee000000-0000-4000-8000-000000000001/ee000000-0000-4000-8000-00000000000a.jpg',false) then
    raise exception 'FAIL: planted private source resource file was readable';
  end if;
  if jsonb_array_length(public.list_challenge_resource_media_for_copy(
        'ee000000-0000-4000-8000-000000000004','ee000000-0000-4000-8000-000000000007')) <> 1 then
    raise exception 'FAIL: copier did not receive source resource media for the public copy';
  end if;
  begin
    perform public.list_challenge_resource_media_for_copy(
      'ee000000-0000-4000-8000-000000000008','ee000000-0000-4000-8000-00000000000b');
    raise exception 'FAIL: list resource media allowed for planted private source';
  exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
end $$;

-- An unrelated outsider still cannot read source files after someone else copied.
select set_config('request.jwt.claim.sub','ee000000-0000-4000-8000-000000000003',true);
do $$ begin
  if public.challenge_day_media_access('ee000000-0000-4000-8000-000000000004/resources/ee000000-0000-4000-8000-000000000001/ee000000-0000-4000-8000-000000000005.jpg',false) then
    raise exception 'FAIL: outsider read source resource file via copy access';
  end if;
end $$;
rollback;
select 'Challenge resource permissions, references and optimistic concurrency passed' as result;
