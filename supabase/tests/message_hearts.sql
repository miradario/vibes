-- Run with an administrative connection against a database with sample chats.
-- All test writes are rolled back; no message content or user IDs are returned.
begin;
do $$
declare
  fixture record;
  total integer;
  tested integer := 0;
  outsider uuid := gen_random_uuid();
begin
  for fixture in
    select 'direct_message_hearts' as heart_table, m.id as message_id, c.user1_id as actor
    from public.messages m join public.matches c on c.id=m.match_id
    where m.id=(select id from public.messages limit 1)
    union all
    select 'group_message_hearts', m.id, member.user_id
    from public.community_group_messages m
    join public.community_group_members member on member.group_id=m.group_id
    where m.message_kind='message' and m.id=(
      select g.id from public.community_group_messages g
      where g.message_kind='message' and exists (
        select 1 from public.community_group_members gm where gm.group_id=g.group_id
      ) limit 1
    )
    union all
    select 'event_message_hearts', m.id, member.user_id
    from public.event_messages m
    join public.event_participants member on member.event_id=m.event_id
    where m.id=(select e.id from public.event_messages e where exists (
      select 1 from public.event_participants ep where ep.event_id=e.event_id
    ) limit 1)
  loop
    perform set_config('request.jwt.claim.sub',fixture.actor::text,true);
    perform set_config('request.jwt.claims',json_build_object('sub',fixture.actor,'role','authenticated')::text,true);
    set local role authenticated;
    execute format('insert into public.%I(message_id,user_id) values ($1,$2) on conflict do nothing',fixture.heart_table)
      using fixture.message_id,fixture.actor;
    -- Duplicate double taps must remain idempotent.
    execute format('insert into public.%I(message_id,user_id) values ($1,$2) on conflict do nothing',fixture.heart_table)
      using fixture.message_id,fixture.actor;
    execute format('select count(*) from public.%I where message_id=$1 and user_id=$2',fixture.heart_table)
      into total using fixture.message_id,fixture.actor;
    if total <> 1 then raise exception 'Heart was not saved exactly once: %',fixture.heart_table; end if;
    begin
      execute format('insert into public.%I(message_id,user_id) values ($1,$2)',fixture.heart_table)
        using fixture.message_id,outsider;
      raise exception 'Spoofed author was accepted: %',fixture.heart_table;
    exception when insufficient_privilege then null;
    end;
    perform set_config('request.jwt.claim.sub',outsider::text,true);
    perform set_config('request.jwt.claims',json_build_object('sub',outsider,'role','authenticated')::text,true);
    execute format('select count(*) from public.%I where message_id=$1',fixture.heart_table)
      into total using fixture.message_id;
    if total <> 0 then raise exception 'Private reactions leaked: %',fixture.heart_table; end if;
    begin
      execute format('insert into public.%I(message_id,user_id) values ($1,$2)',fixture.heart_table)
        using fixture.message_id,outsider;
      raise exception 'Outsider could react: %',fixture.heart_table;
    exception when insufficient_privilege then null;
    end;
    execute format('delete from public.%I where message_id=$1',fixture.heart_table) using fixture.message_id;
    get diagnostics total = row_count;
    if total <> 0 then raise exception 'Outsider could delete: %',fixture.heart_table; end if;
    perform set_config('request.jwt.claim.sub',fixture.actor::text,true);
    perform set_config('request.jwt.claims',json_build_object('sub',fixture.actor,'role','authenticated')::text,true);
    execute format('delete from public.%I where message_id=$1 and user_id=$2',fixture.heart_table)
      using fixture.message_id,fixture.actor;
    get diagnostics total = row_count;
    if total <> 1 then raise exception 'Could not remove own heart: %',fixture.heart_table; end if;
    set local role anon;
    begin
      execute format('select count(*) from public.%I',fixture.heart_table) into total;
      raise exception 'Anonymous access was accepted: %',fixture.heart_table;
    exception when insufficient_privilege then null;
    end;
    reset role;
    tested := tested + 1;
  end loop;
  if tested < 3 then raise exception 'Missing test chat fixtures'; end if;
end $$;
rollback;
