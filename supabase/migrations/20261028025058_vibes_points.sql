-- Vibes are non-monetary recognition. Only database-observed actions award them.
create schema if not exists private;
create table public.vibes_ledger (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('meditation','share','attendance','challenge')),
 source_key text not null,
 title text not null,
 points integer not null check(points = case kind when 'meditation' then 10 when 'share' then 5 when 'attendance' then 50 when 'challenge' then 100 end),
 occurred_at timestamptz not null,
 created_at timestamptz not null default now(),
 unique(user_id,source_key)
);
create index vibes_ledger_user_history on public.vibes_ledger(user_id,occurred_at desc,id desc);
alter table public.vibes_ledger enable row level security;
revoke all on public.vibes_ledger from public,anon,authenticated;
grant select on public.vibes_ledger to authenticated;
create policy vibes_ledger_own on public.vibes_ledger for select to authenticated using(user_id=(select auth.uid()));

-- Not exposed as RPCs. Trigger helpers need to read their source tables and write
-- the ledger independently of the user's SELECT policies. No client EXECUTE.
create function private.vibes_credit(u uuid,k text,source text,label text,at_time timestamptz)
returns void language plpgsql security definer set search_path='' as $$
declare amount integer;
begin
 if u is null or source is null or at_time is null then return; end if;
 amount := case k when 'meditation' then 10 when 'share' then 5 when 'attendance' then 50 when 'challenge' then 100 end;
 if amount is null then return; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('vibes:'||u::text,0));
 if k='share' and (select count(*) from public.vibes_ledger where user_id=u and kind='share' and occurred_at >= date_trunc('day',at_time at time zone 'UTC') at time zone 'UTC' and occurred_at < (date_trunc('day',at_time at time zone 'UTC')+interval '1 day') at time zone 'UTC') >=3 then return; end if;
 insert into public.vibes_ledger(user_id,kind,source_key,title,points,occurred_at)
 values(u,k,source,left(label,200),amount,at_time) on conflict(user_id,source_key) do nothing;
end $$;
revoke all on function private.vibes_credit(uuid,text,text,text,timestamptz) from public,anon,authenticated;

create function private.vibes_shared_message(m public.messages,at_time timestamptz)
returns void language plpgsql security definer set search_path='' as $$
declare link text[]; content_title text; destination text; content_id uuid;
begin
 if not exists(select 1 from public.matches where id=m.match_id and user1_id<>user2_id and m.sender_id in (user1_id,user2_id)) then return; end if;
 link:=regexp_match(m.text,'https://vibes\.gurudevelopers\.dev/(event|challenge)/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})($|[[:space:].,!?])','i');
 if link is not null then
  content_id:=link[2]::uuid; destination:=lower(link[1])||':'||content_id::text;
  if lower(link[1])='event' then select title into content_title from public.events where id=content_id and type='event';
  else select title into content_title from public.challenges where id=content_id and (visibility='public' or created_by=m.sender_id or exists(select 1 from public.challenge_participants p where p.challenge_id=content_id and p.user_id=m.sender_id)); end if;
 else
  link:=regexp_match(m.text,'com\.gurudevelopers\.vibes://class/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})($|[[:space:].,!?])','i');
  if link is null then return; end if;
  content_id:=link[1]::uuid; destination:='class:'||content_id::text;
  select title into content_title from public.learning_activities where id=content_id and status='published';
 end if;
 if content_title is null then return; end if;
 perform private.vibes_credit(m.sender_id,'share','share:'||destination,'Compartiste «'||content_title||'»',at_time);
end $$;
revoke all on function private.vibes_shared_message(public.messages,timestamptz) from public,anon,authenticated;

create function private.vibes_completed_challenge(u uuid,c uuid,at_time timestamptz)
returns void language plpgsql security definer set search_path='' as $$
declare target public.challenges;
begin
 select * into target from public.challenges where id=c;
 if target.duration_days is null or target.duration_days<1 then return; end if;
 if not exists(select 1 from public.challenge_participants where user_id=u and challenge_id=c) then return; end if;
 if (select count(distinct checkin_date) from public.challenge_checkins where user_id=u and challenge_id=c and checkin_date <= (now() at time zone 'UTC')::date) < target.duration_days then return; end if;
 perform private.vibes_credit(u,'challenge','challenge:'||c::text,'Completaste «'||target.title||'»',at_time);
end $$;
revoke all on function private.vibes_completed_challenge(uuid,uuid,timestamptz) from public,anon,authenticated;

create function private.vibes_attended_class(a public.learning_attendance)
returns void language plpgsql security definer set search_path='' as $$
declare u uuid; label text;
begin
 select e.user_id,c.title into u,label from public.learning_enrollments e join public.learning_activities c on c.id=e.activity_id join public.learning_sessions s on s.id=a.session_id and s.activity_id=c.id where e.id=a.enrollment_id and e.activity_id=a.activity_id and s.starts_at<=now();
 if u is null then return; end if;
 if a.present then
  perform private.vibes_credit(u,'attendance','attendance:'||a.session_id::text,'Asististe a «'||label||'»',a.recorded_at);
 else
  -- A corrected attendance must also correct the displayed total.
  delete from public.vibes_ledger where user_id=u and source_key='attendance:'||a.session_id::text;
 end if;
end $$;
revoke all on function private.vibes_attended_class(public.learning_attendance) from public,anon,authenticated;

create function private.vibes_observe_action() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='meditation_presence' then
  if new.presence_date between (now() at time zone 'UTC')::date-1 and (now() at time zone 'UTC')::date+1 then
   perform private.vibes_credit(new.user_id,'meditation','meditation:'||new.presence_date::text,'Registraste tu meditación',now());
  end if;
 elsif tg_table_name='messages' then perform private.vibes_shared_message(new,now());
 elsif tg_table_name='challenge_checkins' then perform private.vibes_completed_challenge(new.user_id,new.challenge_id,now());
 elsif tg_table_name='learning_attendance' then
  if tg_op='DELETE' then
   delete from public.vibes_ledger where kind='attendance' and source_key='attendance:'||old.session_id::text and user_id=(select user_id from public.learning_enrollments where id=old.enrollment_id);
   return old;
  end if;
  perform private.vibes_attended_class(new);
 end if;
 return new;
end $$;
revoke all on function private.vibes_observe_action() from public,anon,authenticated;
create trigger vibes_meditation after insert on public.meditation_presence for each row execute function private.vibes_observe_action();
create trigger vibes_share after insert on public.messages for each row execute function private.vibes_observe_action();
create trigger vibes_challenge after insert on public.challenge_checkins for each row execute function private.vibes_observe_action();
create trigger vibes_attendance after insert or update of present or delete on public.learning_attendance for each row execute function private.vibes_observe_action();

-- Historical actions are credited once, using their original dates. No invented
-- attendance for RSVPs, and no reward for opening an external share dialog.
do $$ declare r record; m public.messages; a public.learning_attendance;
begin
 for r in select * from public.meditation_presence where presence_date <= (now() at time zone 'UTC')::date loop
  perform private.vibes_credit(r.user_id,'meditation','meditation:'||r.presence_date::text,'Registraste tu meditación',r.created_at);
 end loop;
 for m in select * from public.messages where created_at<=now() order by created_at,id loop perform private.vibes_shared_message(m,m.created_at); end loop;
 for r in select d.user_id,d.challenge_id,d.created_at as at_time from
  (select user_id,challenge_id,created_at,row_number() over(partition by user_id,challenge_id order by checkin_date,created_at) as completed_day from public.challenge_checkins where checkin_date <= (now() at time zone 'UTC')::date and created_at<=now()) d
  join public.challenges c on c.id=d.challenge_id and c.duration_days=d.completed_day loop
  perform private.vibes_completed_challenge(r.user_id,r.challenge_id,r.at_time);
 end loop;
 for a in select * from public.learning_attendance where present loop perform private.vibes_attended_class(a); end loop;
end $$;

create function public.my_vibes_summary(month_start timestamptz,month_end timestamptz)
returns table(total bigint,this_month bigint,contributions bigint)
language sql stable security invoker set search_path='' as $$
 select coalesce(sum(points),0)::bigint,
 coalesce(sum(points) filter(where occurred_at>=month_start and occurred_at<month_end),0)::bigint,
 count(*) from public.vibes_ledger where user_id=(select auth.uid());
$$;
revoke all on function public.my_vibes_summary(timestamptz,timestamptz) from public,anon;
grant execute on function public.my_vibes_summary(timestamptz,timestamptz) to authenticated;

-- A meditation is self-reported, private by default. The server chooses the day.
create function public.register_vibes_meditation(duration integer,meditation_kind text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare inserted integer;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if duration not in (5,10,20) or duration is null or meditation_kind not in ('silent','guided') or meditation_kind is null then raise exception 'INVALID_MEDITATION'; end if;
 insert into public.meditation_presence(user_id,presence_date,duration_minutes,meditation_type,visibility)
 values(auth.uid(),(now() at time zone 'UTC')::date,duration,meditation_kind,'private') on conflict(user_id,presence_date) do nothing;
 get diagnostics inserted = row_count;
 return inserted=1;
end $$;
revoke all on function public.register_vibes_meditation(integer,text) from public,anon;
grant execute on function public.register_vibes_meditation(integer,text) to authenticated;
