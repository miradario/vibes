-- Run in a transaction; these fixtures are always rolled back. No real users are changed.
begin;
insert into auth.users(id,aud,role,email) values
('de000000-0000-4000-8000-000000000001','authenticated','authenticated','day-owner@example.invalid'),
('de000000-0000-4000-8000-000000000002','authenticated','authenticated','day-member@example.invalid'),
('de000000-0000-4000-8000-000000000003','authenticated','authenticated','day-outsider@example.invalid');
insert into public.challenges(id,title,duration_days,created_by,visibility)
values('de000000-0000-4000-8000-000000000004','Day content transaction test',2,'de000000-0000-4000-8000-000000000001','private');
insert into public.challenge_participants(challenge_id,user_id)
values('de000000-0000-4000-8000-000000000004','de000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','de000000-0000-4000-8000-000000000001',true);
select public.save_challenge_day('de000000-0000-4000-8000-000000000004',1,'Día uno','Consigna','[]',0);
insert into storage.objects(bucket_id,name,owner_id,metadata) values('challenge-day-media',
'de000000-0000-4000-8000-000000000004/1/de000000-0000-4000-8000-000000000001/de000000-0000-4000-8000-000000000005.jpg',
'de000000-0000-4000-8000-000000000001','{"mimetype":"image/jpeg","size":100}');
select public.save_challenge_day('de000000-0000-4000-8000-000000000004',1,'Con foto','Consigna',
'[{"id":"de000000-0000-4000-8000-000000000005","type":"photo","name":"Foto","mime":"image/jpeg","size":100,"path":"de000000-0000-4000-8000-000000000004/1/de000000-0000-4000-8000-000000000001/de000000-0000-4000-8000-000000000005.jpg"}]',1);
do $$ begin
  begin
    perform public.save_challenge_day('de000000-0000-4000-8000-000000000004',1,'Pisado','', '[]',0);
    raise exception 'FAIL: stale revision was accepted';
  exception when serialization_failure then null; end;
  begin
    perform public.save_challenge_day('de000000-0000-4000-8000-000000000004',3,'Fuera de rango','', '[]',0);
    raise exception 'FAIL: invalid day was accepted';
  exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','de000000-0000-4000-8000-000000000002',true);
do $$ begin
  if (select count(*) from public.challenge_days where challenge_id='de000000-0000-4000-8000-000000000004') <> 1 then raise exception 'FAIL: member cannot read'; end if;
  if not public.challenge_day_media_access('de000000-0000-4000-8000-000000000004/1/de000000-0000-4000-8000-000000000001/de000000-0000-4000-8000-000000000005.jpg',false) then raise exception 'FAIL: member cannot view published photo'; end if;
  begin
    perform public.save_challenge_day('de000000-0000-4000-8000-000000000004',1,'Intrusión','', '[]',2);
    raise exception 'FAIL: member edited shared content';
  exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','de000000-0000-4000-8000-000000000003',true);
do $$ begin
  if exists(select 1 from public.challenge_days where challenge_id='de000000-0000-4000-8000-000000000004') then raise exception 'FAIL: outsider read private content'; end if;
  if public.challenge_day_media_access('de000000-0000-4000-8000-000000000004/1/de000000-0000-4000-8000-000000000001/de000000-0000-4000-8000-000000000005.jpg',false) then raise exception 'FAIL: outsider read photo'; end if;
end $$;
rollback;
select 'Challenge day permissions, references and optimistic concurrency passed' as result;
