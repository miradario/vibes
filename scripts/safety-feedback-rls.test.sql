begin;
select set_config('request.jwt.claim.sub',(select id::text from auth.users order by created_at limit 1),true);
set local role authenticated;
insert into public.safety_feedback(reporter_id,category,details,context)
values(auth.uid(),'support','PRUEBA TECNICA RLS: no es una denuncia real.','rollback-test');
do $$ begin
  begin
    insert into public.safety_feedback(reporter_id,category,details) values(gen_random_uuid(),'support','Prueba de suplantación bloqueada.');
    raise exception 'FAIL: spoofed reporter accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform id from public.safety_feedback;
    raise exception 'FAIL: clients can read private reports';
  exception when insufficient_privilege then null; end;
  begin
    update public.safety_feedback set status='resolved';
    raise exception 'FAIL: clients can change review status';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.safety_feedback;
    raise exception 'FAIL: clients can delete reports';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.safety_feedback(reporter_id,category,details) values(auth.uid(),'invalid','Invalid category must be rejected.');
    raise exception 'FAIL: invalid category accepted';
  exception when check_violation then null; end;
  begin
    insert into public.safety_feedback(reporter_id,category,details) values(auth.uid(),'child_safety',' ');
    raise exception 'FAIL: empty report accepted';
  exception when check_violation then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
  begin
    insert into public.safety_feedback(reporter_id,category,details) values(null,'support','Anonymous insert must be blocked.');
    raise exception 'FAIL: anonymous report accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: own insert, no impersonation, no client read/update/delete, category/length validation, no anonymous insert' as result;
rollback;
