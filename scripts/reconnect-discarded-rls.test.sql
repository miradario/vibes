-- Uses an existing discarded row; all test changes are rolled back.
begin;
do $$ declare probe record; begin
select id,swiper_id,target_id into probe from public.swipes where direction='nope' limit 1;
if not found then raise exception 'No discarded swipe available for verification'; end if;
perform set_config('test.swipe_id',probe.id::text,true);
perform set_config('test.swipe_owner',probe.swiper_id::text,true);
perform set_config('test.swipe_target',probe.target_id::text,true);
perform set_config('request.jwt.claim.sub',probe.swiper_id::text,true);
end $$;
set local role authenticated;
do $$ declare affected integer; begin
update public.swipes set direction='like' where id=current_setting('test.swipe_id')::uuid;
get diagnostics affected=row_count;
if affected <> 1 then raise exception 'Owner reconnect must update one row'; end if;
perform set_config('request.jwt.claim.sub',current_setting('test.swipe_target'),true);
update public.swipes set direction='nope' where id=current_setting('test.swipe_id')::uuid;
get diagnostics affected=row_count;
if affected <> 0 then raise exception 'Recipient must not edit another user decision'; end if;
end $$;
rollback;
