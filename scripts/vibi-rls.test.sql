-- Run in a transaction; fixtures and quota changes are always rolled back.
begin;
do $$
declare owner_id uuid; other_id uuid; conversation_id uuid;
begin
  select id into owner_id from auth.users order by id limit 1;
  select id into other_id from auth.users where id <> owner_id order by id limit 1;
  if owner_id is null or other_id is null then raise exception 'Two test users are required'; end if;
  perform set_config('vibi.test_owner',owner_id::text,true);
  perform set_config('vibi.test_other',other_id::text,true);
  -- Existing user data is untouched outside this rolled-back transaction.
  delete from public.vibi_conversations where user_id in (owner_id,other_id);
  delete from public.vibi_usage where user_id = owner_id;
  insert into public.vibi_conversations(user_id) values(owner_id) returning id into conversation_id;
  perform set_config('vibi.test_conversation',conversation_id::text,true);
end $$;
set local role service_role;
do $$
declare u uuid := current_setting('vibi.test_owner')::uuid;
c uuid := current_setting('vibi.test_conversation')::uuid;
t uuid := gen_random_uuid(); result public.vibi_exchanges;
begin
  if not public.vibi_claim(u,c,t) then raise exception 'Claim failed'; end if;
  if public.vibi_claim(u,c,gen_random_uuid()) then raise exception 'Concurrent claim accepted'; end if;
  result := public.vibi_finish(u,c,t,gen_random_uuid(),'Quiero eventos','Una opción','event','[]');
  if result.user_text <> 'Quiero eventos' then raise exception 'Exchange not saved'; end if;
  begin
    perform public.vibi_finish(u,c,t,gen_random_uuid(),'Again','Duplicate','event','[]');
    raise exception 'Old lock token accepted';
  exception when raise_exception then
    if sqlerrm <> 'vibi_conversation_changed' then raise; end if;
  end;
  begin
    perform public.vibi_claim(u,c,gen_random_uuid());
    raise exception 'Rate limit missing';
  exception when raise_exception then
    if sqlerrm <> 'vibi_rate_limit' then raise; end if;
  end;
end $$;
reset role;
do $$ begin perform set_config('request.jwt.claims', json_build_object('sub',current_setting('vibi.test_owner'),'role','authenticated')::text,true); end $$;
set local role authenticated;
do $$ begin
  if (select count(*) from public.vibi_exchanges) <> 1 then raise exception 'Owner cannot read exchange'; end if;
  begin
    insert into public.vibi_exchanges(conversation_id,request_id,user_text,assistant_text) values(current_setting('vibi.test_conversation')::uuid,gen_random_uuid(),'Fake','Forged');
    raise exception 'Client forged assistant message';
  exception when insufficient_privilege then null; end;
  begin
    perform public.vibi_claim(current_setting('vibi.test_owner')::uuid,current_setting('vibi.test_conversation')::uuid,gen_random_uuid());
    raise exception 'Client accessed service RPC';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin perform set_config('request.jwt.claims', json_build_object('sub',current_setting('vibi.test_other'),'role','authenticated')::text,true); end $$;
set local role authenticated;
do $$ begin
  if exists(select 1 from public.vibi_exchanges where conversation_id=current_setting('vibi.test_conversation')::uuid) then raise exception 'Cross-account history leak'; end if;
  if exists(select 1 from public.vibi_conversations where id=current_setting('vibi.test_conversation')::uuid) then raise exception 'Cross-account conversation leak'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
  begin perform 1 from public.vibi_exchanges; raise exception 'Anonymous access';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role service_role;
do $$ begin
  delete from public.vibi_conversations where id=current_setting('vibi.test_conversation')::uuid;
  if exists(select 1 from public.vibi_exchanges where conversation_id=current_setting('vibi.test_conversation')::uuid) then raise exception 'Reset did not clear exchanges'; end if;
  if not exists(select 1 from public.vibi_usage where user_id=current_setting('vibi.test_owner')::uuid and attempts=1) then raise exception 'Reset erased quota'; end if;
end $$;
reset role;
rollback;
