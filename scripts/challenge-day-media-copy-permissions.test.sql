-- Run in a transaction; these fixtures are always rolled back. No real users are changed.
begin;
insert into auth.users(id,aud,role,email) values
('df000000-0000-4000-8000-000000000001','authenticated','authenticated','copy-owner@example.invalid'),
('df000000-0000-4000-8000-000000000002','authenticated','authenticated','copy-member@example.invalid'),
('df000000-0000-4000-8000-000000000003','authenticated','authenticated','copy-outsider@example.invalid'),
('df000000-0000-4000-8000-000000000006','authenticated','authenticated','copy-copier@example.invalid');

-- Public catalog-like source (Por Vibes case): copier is not a participant.
insert into public.challenges(id,title,duration_days,created_by,visibility)
values('df000000-0000-4000-8000-000000000004','Public source',2,'df000000-0000-4000-8000-000000000001','public');
insert into public.challenge_participants(challenge_id,user_id)
values('df000000-0000-4000-8000-000000000004','df000000-0000-4000-8000-000000000002');

-- Private source the copier must not be able to reach by planting source_challenge_id.
insert into public.challenges(id,title,duration_days,created_by,visibility)
values('df000000-0000-4000-8000-000000000008','Private source',2,'df000000-0000-4000-8000-000000000001','private');

set local role authenticated;
select set_config('request.jwt.claim.sub','df000000-0000-4000-8000-000000000001',true);
select public.save_challenge_day('df000000-0000-4000-8000-000000000004',1,'Día uno','Consigna secreta','[]',0);
insert into storage.objects(bucket_id,name,owner_id,metadata) values('challenge-day-media',
'df000000-0000-4000-8000-000000000004/1/df000000-0000-4000-8000-000000000001/df000000-0000-4000-8000-000000000005.jpg',
'df000000-0000-4000-8000-000000000001','{"mimetype":"image/jpeg","size":100}');
select public.save_challenge_day('df000000-0000-4000-8000-000000000004',1,'Día uno','Consigna secreta',
'[{"id":"df000000-0000-4000-8000-000000000005","type":"photo","name":"Foto","mime":"image/jpeg","size":100,"path":"df000000-0000-4000-8000-000000000004/1/df000000-0000-4000-8000-000000000001/df000000-0000-4000-8000-000000000005.jpg"},{"id":"df000000-0000-4000-8000-000000000009","type":"link","name":"youtube.com","url":"https://www.youtube.com/watch?v=M7lc1UVf-VE"}]',1);

select public.save_challenge_day('df000000-0000-4000-8000-000000000008',1,'Privado','No copiar','[]',0);
insert into storage.objects(bucket_id,name,owner_id,metadata) values('challenge-day-media',
'df000000-0000-4000-8000-000000000008/1/df000000-0000-4000-8000-000000000001/df000000-0000-4000-8000-00000000000a.jpg',
'df000000-0000-4000-8000-000000000001','{"mimetype":"image/jpeg","size":100}');
select public.save_challenge_day('df000000-0000-4000-8000-000000000008',1,'Privado','No copiar',
'[{"id":"df000000-0000-4000-8000-00000000000a","type":"photo","name":"Secreta","mime":"image/jpeg","size":100,"path":"df000000-0000-4000-8000-000000000008/1/df000000-0000-4000-8000-000000000001/df000000-0000-4000-8000-00000000000a.jpg"}]',1);

-- Copier without a restart copy still cannot read rows or files.
select set_config('request.jwt.claim.sub','df000000-0000-4000-8000-000000000006',true);
do $$ begin
  if exists(select 1 from public.challenge_days where challenge_id='df000000-0000-4000-8000-000000000004') then
    raise exception 'FAIL: copier read source day rows before copying';
  end if;
  if public.challenge_day_media_access('df000000-0000-4000-8000-000000000004/1/df000000-0000-4000-8000-000000000001/df000000-0000-4000-8000-000000000005.jpg',false) then
    raise exception 'FAIL: copier got generic day media access';
  end if;
  if public.challenge_restart_copy_media_access('df000000-0000-4000-8000-000000000004/1/df000000-0000-4000-8000-000000000001/df000000-0000-4000-8000-000000000005.jpg') then
    raise exception 'FAIL: copier read source files before creating a copy';
  end if;
  begin
    perform * from public.list_challenge_day_media_for_copy(
      'df000000-0000-4000-8000-000000000004','df000000-0000-4000-8000-000000000007');
    raise exception 'FAIL: list media allowed without a copy';
  exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
end $$;

reset role;
insert into public.challenges(id,title,duration_days,created_by,visibility,source_challenge_id)
values('df000000-0000-4000-8000-000000000007','Restart copy',2,'df000000-0000-4000-8000-000000000006','private','df000000-0000-4000-8000-000000000004');
-- Planted pointer at a private source the copier cannot restart.
insert into public.challenges(id,title,duration_days,created_by,visibility,source_challenge_id)
values('df000000-0000-4000-8000-00000000000b','Planted copy',2,'df000000-0000-4000-8000-000000000006','private','df000000-0000-4000-8000-000000000008');

set local role authenticated;
select set_config('request.jwt.claim.sub','df000000-0000-4000-8000-000000000006',true);
do $$ begin
  if exists(select 1 from public.challenge_days where challenge_id='df000000-0000-4000-8000-000000000004') then
    raise exception 'FAIL: copier read source day rows after copying';
  end if;
  if public.challenge_day_media_access('df000000-0000-4000-8000-000000000004/1/df000000-0000-4000-8000-000000000001/df000000-0000-4000-8000-000000000005.jpg',false) then
    raise exception 'FAIL: copier got generic day media access after copying';
  end if;
  if not public.challenge_restart_copy_media_access('df000000-0000-4000-8000-000000000004/1/df000000-0000-4000-8000-000000000001/df000000-0000-4000-8000-000000000005.jpg') then
    raise exception 'FAIL: copier cannot read published source day file';
  end if;
  if public.challenge_restart_copy_media_access('df000000-0000-4000-8000-000000000008/1/df000000-0000-4000-8000-000000000001/df000000-0000-4000-8000-00000000000a.jpg') then
    raise exception 'FAIL: planted private source file was readable';
  end if;
  if (select count(*) from public.list_challenge_day_media_for_copy(
        'df000000-0000-4000-8000-000000000004','df000000-0000-4000-8000-000000000007')) <> 1 then
    raise exception 'FAIL: copier did not receive source media for the public copy';
  end if;
  if exists (
    select 1 from public.list_challenge_day_media_for_copy(
      'df000000-0000-4000-8000-000000000004','df000000-0000-4000-8000-000000000007')
    where attachments::text like '%Consigna secreta%'
  ) then
    raise exception 'FAIL: copy RPC leaked day title or description';
  end if;
  begin
    perform * from public.list_challenge_day_media_for_copy(
      'df000000-0000-4000-8000-000000000008','df000000-0000-4000-8000-00000000000b');
    raise exception 'FAIL: list media allowed for planted private source';
  exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
end $$;

-- An unrelated outsider still cannot read source files after someone else copied.
select set_config('request.jwt.claim.sub','df000000-0000-4000-8000-000000000003',true);
do $$ begin
  if public.challenge_restart_copy_media_access('df000000-0000-4000-8000-000000000004/1/df000000-0000-4000-8000-000000000001/df000000-0000-4000-8000-000000000005.jpg') then
    raise exception 'FAIL: outsider read source file via copy access';
  end if;
end $$;
rollback;
select 'Challenge day media copy permissions passed' as result;
