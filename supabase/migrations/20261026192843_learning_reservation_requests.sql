begin;
-- External references accept personal requests only: no organizer delivery, capacity guarantee or payment.
create table private.learning_external_schedule (
 id text primary key, title text not null, slots jsonb not null
);
alter table private.learning_external_schedule enable row level security;
revoke all on private.learning_external_schedule from public, anon, authenticated;
create table public.learning_reservation_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 source_id text not null, title text not null,
 mode text not null check(mode in ('single','monthly')),
 month date not null check(extract(day from month)=1),
 starts_at timestamptz[] not null check(cardinality(starts_at) between 1 and 100),
 status text not null default 'pending_confirmation' check(status in ('pending_confirmation','cancelled')),
 created_at timestamptz not null default now(), cancelled_at timestamptz
);
create index learning_requests_user_idx on public.learning_reservation_requests(user_id,created_at desc);
create index learning_requests_source_idx on public.learning_reservation_requests(source_id) where status='pending_confirmation';
alter table public.learning_reservation_requests enable row level security;
revoke all on public.learning_reservation_requests from public,anon,authenticated;
grant select on public.learning_reservation_requests to authenticated;
create policy learning_requests_own on public.learning_reservation_requests for select to authenticated
 using(user_id=(select auth.uid()) and (select private.learning_enabled()));
create function private.learning_request_reservation(p_source text,p_mode text,p_month date,p_days integer[],p_single timestamptz default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.learning_actor(); v_title text; v_slots jsonb; v_dates timestamptz[]; v_id uuid; v_timezone text:='America/Argentina/Buenos_Aires';
begin
 if p_mode is null or p_mode not in ('single','monthly') or p_month is null or extract(day from p_month)<>1
 or p_month<date_trunc('month',now() at time zone v_timezone)::date or p_month>(date_trunc('month',now() at time zone v_timezone)+interval '5 months')::date
 or p_days is null or cardinality(p_days)=0 or cardinality(p_days)>7 or exists(select 1 from unnest(p_days) d where d is null or d not between 0 and 6)
 then raise exception 'INVALID_RESERVATION'; end if;
 -- Serialize a user's requests to prevent duplicates even on concurrent retries.
 perform pg_advisory_xact_lock(hashtextextended(u::text||p_source,0));
 select title,slots into v_title,v_slots from private.learning_external_schedule where id=p_source;
 if found then
  select array_agg(t order by t) into v_dates from (
   select distinct (d::date+s.time::time) at time zone v_timezone as t
   from generate_series(p_month::timestamp,(p_month+interval '1 month - 1 day')::timestamp,interval '1 day') d
   cross join jsonb_to_recordset(v_slots) as s(day integer,time text)
   where extract(dow from d)::integer=s.day and s.day=any(p_days)
  ) dates where t>now();
 else
  select title,timezone into v_title,v_timezone from public.learning_activities where id::text=p_source and status='published';
  if not found then raise exception 'NOT_PUBLISHED'; end if;
  select array_agg(starts_at order by starts_at) into v_dates from public.learning_sessions
   where activity_id::text=p_source and starts_at>now()
   and date_trunc('month',starts_at at time zone v_timezone)::date=p_month
   and extract(dow from starts_at at time zone v_timezone)::integer=any(p_days);
 end if;
 if p_mode='single' then
  if p_single is null or not coalesce(p_single=any(v_dates),false) then raise exception 'INVALID_RESERVATION'; end if;
  v_dates:=array[p_single];
 end if;
 if coalesce(cardinality(v_dates),0)=0 then raise exception 'NO_RESERVATION_DATES'; end if;
 select id into v_id from public.learning_reservation_requests where user_id=u and source_id=p_source and status='pending_confirmation' and starts_at=v_dates;
 if found then return v_id; end if;
 if exists(select 1 from public.learning_reservation_requests where user_id=u and source_id=p_source and status='pending_confirmation' and starts_at && v_dates) then raise exception 'RESERVATION_OVERLAP'; end if;
 insert into public.learning_reservation_requests(user_id,source_id,title,mode,month,starts_at) values(u,p_source,v_title,p_mode,p_month,v_dates) returning id into v_id;
 return v_id;
end $$;
create function private.learning_cancel_reservation_request(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.learning_actor(); begin
 update public.learning_reservation_requests set status='cancelled',cancelled_at=now() where id=p_id and user_id=u and status='pending_confirmation';
end $$;
create function public.learning_request_reservation(p_source text,p_mode text,p_month date,p_days integer[],p_single timestamptz default null)
returns uuid language sql security invoker set search_path='' as $$ select private.learning_request_reservation(p_source,p_mode,p_month,p_days,p_single) $$;
create function public.learning_cancel_reservation_request(p_id uuid) returns void language sql security invoker set search_path='' as $$ select private.learning_cancel_reservation_request(p_id) $$;
revoke all on function private.learning_request_reservation(text,text,date,integer[],timestamptz), public.learning_request_reservation(text,text,date,integer[],timestamptz),private.learning_cancel_reservation_request(uuid),public.learning_cancel_reservation_request(uuid) from public,anon,authenticated;
grant execute on function private.learning_request_reservation(text,text,date,integer[],timestamptz), public.learning_request_reservation(text,text,date,integer[],timestamptz),private.learning_cancel_reservation_request(uuid),public.learning_cancel_reservation_request(uuid) to authenticated;
insert into private.learning_external_schedule(id,title,slots) values
('clase_001','Hatha Yoga Dinámico · mañana','[{"day": 1, "time": "09:00"}, {"day": 3, "time": "09:00"}]'::jsonb),
('clase_002','Hatha Yoga Dinámico · noche','[{"day": 1, "time": "19:00"}, {"day": 3, "time": "19:00"}]'::jsonb),
('clase_003','El movimiento abre caminos','[{"day": 1, "time": "19:30"}]'::jsonb),
('clase_004','5 Ritmos en Palermo','[{"day": 5, "time": "19:30"}]'::jsonb),
('clase_005','5 Ritmos · Alejandra Duhalde','[{"day": 3, "time": "07:15"}]'::jsonb),
('clase_006','Yôga · DeROSE Method Palermo','[]'::jsonb),
('clase_007','Meditación · DeROSE Method Palermo','[]'::jsonb),
('clase_008','Curso Certificado de Tantra para Occidentales','[]'::jsonb),
('clase_009','Curso-taller de meditación · Sri Chinmoy','[]'::jsonb);
commit;
