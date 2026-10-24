-- No messages, swipes or network requests. Preference changes roll back.
begin;
select set_config('request.jwt.claim.sub','a7638253-1740-4f75-a414-d9bd7cdf31e9',true);
create temp table meet_people_fixture as
select c.id from public.get_discovery_candidates(null,true,200,null,null,null) c
join public.user_preferences p on p.user_id=c.id
where p.meet_people_enabled limit 1;
do $$
declare target uuid; me uuid := auth.uid();
begin
 select id into target from meet_people_fixture;
 if target is null then raise exception 'No eligible test fixture'; end if;
 if not exists(select 1 from public.get_discovery_candidates(array[target],true,200,null,null,null)) then raise exception 'Baseline candidate missing'; end if;
 update public.user_preferences set meet_people_enabled=false where user_id=target;
 if exists(select 1 from public.get_discovery_candidates(array[target],true,200,null,null,null)) then raise exception 'Opted-out candidate still visible'; end if;
 update public.user_preferences set meet_people_enabled=true where user_id=target;
 if not exists(select 1 from public.get_discovery_candidates(array[target],true,200,null,null,null)) then raise exception 'Reenabled candidate missing'; end if;
 update public.user_preferences set meet_people_enabled=false where user_id=me;
 if exists(select 1 from public.get_discovery_candidates(null,true,200,null,null,null)) then raise exception 'Opted-out viewer can browse'; end if;
end $$;
rollback;
