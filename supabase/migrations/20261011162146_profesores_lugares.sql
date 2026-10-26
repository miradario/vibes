-- Additive, disabled by default. Existing events/auth/profiles are not modified.
begin;
create schema if not exists private;
create table private.learning_settings (id boolean primary key default true check(id), enabled boolean not null default false);
insert into private.learning_settings default values;
create table private.learning_operators (user_id uuid primary key references auth.users(id) on delete cascade);
create table public.learning_profiles (
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('teacher','place')),
 name text not null check(length(trim(name)) between 1 and 120), description text not null default '' check(length(description)<=5000),
 specialties text[] not null default '{}', image_url text, cover_url text, location text not null default '',
 modality text not null check(modality in ('in_person','online','mixed')), published boolean not null default false,
 created_at timestamptz not null default now()
);
create table private.learning_managers (
 profile_id uuid references public.learning_profiles(id) on delete cascade, user_id uuid references auth.users(id) on delete cascade,
 primary key(profile_id,user_id)
);
create index learning_managers_user_idx on private.learning_managers(user_id,profile_id);
create table public.learning_teacher_places (
 teacher_id uuid references public.learning_profiles(id), place_id uuid references public.learning_profiles(id), primary key(teacher_id,place_id)
);
create index learning_teacher_places_place_idx on public.learning_teacher_places(place_id);
create table public.learning_activities (
 id uuid primary key default gen_random_uuid(), organizer_id uuid not null references public.learning_profiles(id),
 kind text not null check(kind in ('class','course')), title text not null check(length(trim(title)) between 1 and 160),
 description text not null default '' check(length(description)<=8000), image_url text,
 teacher_ids uuid[] not null check(cardinality(teacher_ids) between 1 and 12), place_id uuid references public.learning_profiles(id),
 modality text not null check(modality in ('in_person','online','mixed')), location text not null default '',
 timezone text not null default 'America/Argentina/Buenos_Aires', capacity integer not null check(capacity between 1 and 10000),
 price numeric(12,2) not null default 0 check(price>=0), currency text not null default 'ARS' check(currency ~ '^[A-Z]{3}$'),
 status text not null default 'draft' check(status in ('draft','published','cancelled','completed')),
 reserved_count integer not null default 0 check(reserved_count between 0 and capacity),
 schedule_locked boolean not null default false,
 created_at timestamptz not null default now()
);
create index learning_activities_organizer_idx on public.learning_activities(organizer_id);
create index learning_activities_place_idx on public.learning_activities(place_id);
create index learning_activities_status_idx on public.learning_activities(status,created_at desc);
create index learning_activities_teachers_idx on public.learning_activities using gin(teacher_ids);
create table public.learning_sessions (
 id uuid primary key default gen_random_uuid(), activity_id uuid not null references public.learning_activities(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 160), starts_at timestamptz not null, ends_at timestamptz not null,
 check(ends_at>starts_at), unique(activity_id,starts_at), unique(id,activity_id)
);
create index learning_sessions_start_idx on public.learning_sessions(starts_at,activity_id);
create table public.learning_enrollments (
 id uuid primary key default gen_random_uuid(), activity_id uuid not null references public.learning_activities(id),
 user_id uuid not null references auth.users(id), status text not null default 'confirmed' check(status in ('confirmed','cancelled')),
 -- There is deliberately no paid/settled state until a real payment integration exists.
 payment_status text not null default 'not_required' check(payment_status='not_required'),
 created_at timestamptz not null default now(), cancelled_at timestamptz,
 unique(activity_id,user_id), unique(id,activity_id)
);
create index learning_enrollments_user_idx on public.learning_enrollments(user_id,status);
create table public.learning_attendance (
 session_id uuid not null, enrollment_id uuid not null, activity_id uuid not null,
 present boolean not null, recorded_by uuid not null references auth.users(id), recorded_at timestamptz not null default now(),
 primary key(session_id,enrollment_id),
 foreign key(session_id,activity_id) references public.learning_sessions(id,activity_id),
 foreign key(enrollment_id,activity_id) references public.learning_enrollments(id,activity_id)
);
create index learning_attendance_enrollment_idx on public.learning_attendance(enrollment_id);

create function private.learning_enabled() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select enabled from private.learning_settings where id),false)
$$;
create function private.learning_actor() returns uuid language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid(); begin
 if not private.learning_enabled() then raise exception 'LEARNING_DISABLED'; end if;
 if u is null or not exists(select 1 from public.profiles where id=u and is_active and deleted_at is null) then raise exception 'AUTH_REQUIRED'; end if;
 return u;
end $$;
create function private.learning_can_manage(p_profile uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and private.learning_enabled() and exists(select 1 from private.learning_managers where profile_id=p_profile and user_id=auth.uid())
$$;
create function private.learning_can_read_activity(p_activity uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and private.learning_enabled() and exists(
 select 1 from public.learning_activities a where a.id=p_activity and
 (a.status<>'draft' or private.learning_can_manage(a.organizer_id) or exists(select 1 from public.learning_enrollments e where e.activity_id=a.id and e.user_id=auth.uid())))
$$;
create function private.learning_access() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid(); begin
 if u is null then return jsonb_build_object('enabled',false,'can_create',false,'managed_ids','[]'::jsonb); end if;
 return jsonb_build_object('enabled',private.learning_enabled(),'can_create',private.learning_enabled() and exists(select 1 from private.learning_operators where user_id=u),
 'managed_ids',coalesce((select jsonb_agg(profile_id) from private.learning_managers where user_id=u),'[]'::jsonb));
end $$;
create function private.learning_save_profile(p_id uuid,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.learning_actor(); v_id uuid:=coalesce(p_id,gen_random_uuid()); v_kind text:=p_data->>'kind'; v_specialties text[];
begin
 if p_id is null then
  if not exists(select 1 from private.learning_operators where user_id=u) then raise exception 'FORBIDDEN'; end if;
 else
  if not private.learning_can_manage(p_id) then raise exception 'FORBIDDEN'; end if;
  perform 1 from public.learning_profiles where id=p_id for update;
  if v_kind is distinct from (select kind from public.learning_profiles where id=p_id) then raise exception 'PROFILE_KIND_LOCKED'; end if;
 end if;
 select coalesce(array_agg(trim(value)) filter(where trim(value)<>''),'{}') into v_specialties from jsonb_array_elements_text(coalesce(p_data->'specialties','[]'));
 if cardinality(v_specialties)>20 then raise exception 'INVALID_SPECIALTIES'; end if;
 if p_data->>'modality'<>'online' and length(trim(coalesce(p_data->>'location','')))=0 then raise exception 'LOCATION_REQUIRED'; end if;
 if coalesce(p_data->>'image_url','')<>'' and p_data->>'image_url' !~ '^https://' then raise exception 'INVALID_IMAGE'; end if;
 if coalesce(p_data->>'cover_url','')<>'' and p_data->>'cover_url' !~ '^https://' then raise exception 'INVALID_IMAGE'; end if;
 insert into public.learning_profiles(id,kind,name,description,specialties,image_url,cover_url,location,modality,published)
 values(v_id,v_kind,trim(p_data->>'name'),coalesce(p_data->>'description',''),v_specialties,nullif(p_data->>'image_url',''),nullif(p_data->>'cover_url',''),coalesce(p_data->>'location',''),p_data->>'modality',coalesce((p_data->>'published')::boolean,false))
 on conflict(id) do update set name=excluded.name,description=excluded.description,specialties=excluded.specialties,image_url=excluded.image_url,cover_url=excluded.cover_url,location=excluded.location,modality=excluded.modality,published=excluded.published;
 if p_id is null then insert into private.learning_managers values(v_id,u); end if;
 return v_id;
end $$;
create function private.learning_link_profiles(p_teacher uuid,p_place uuid,p_link boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 perform private.learning_actor();
 if not private.learning_can_manage(p_teacher) or not private.learning_can_manage(p_place) then raise exception 'FORBIDDEN'; end if;
 if not exists(select 1 from public.learning_profiles where id=p_teacher and kind='teacher') or not exists(select 1 from public.learning_profiles where id=p_place and kind='place') then raise exception 'INVALID_RELATION'; end if;
 if p_link then insert into public.learning_teacher_places values(p_teacher,p_place) on conflict do nothing;
 else delete from public.learning_teacher_places where teacher_id=p_teacher and place_id=p_place; end if;
end $$;
create function private.learning_save_activity(p_id uuid,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.learning_actor(); a public.learning_activities; v_id uuid:=coalesce(p_id,gen_random_uuid());
 v_organizer uuid:=(p_data->>'organizer_id')::uuid; v_place uuid:=nullif(p_data->>'place_id','')::uuid;
 v_teachers uuid[]; v_sessions jsonb:=p_data->'sessions'; v_first timestamptz; v_last timestamptz; locked boolean:=false;
begin
 if not private.learning_can_manage(v_organizer) then raise exception 'FORBIDDEN'; end if;
 if p_id is not null then
  select * into a from public.learning_activities where id=p_id for update;
  if not found or not private.learning_can_manage(a.organizer_id) or a.organizer_id<>v_organizer then raise exception 'FORBIDDEN'; end if;
  if a.status in ('cancelled','completed') then raise exception 'ACTIVITY_CLOSED'; end if;
  locked:=exists(select 1 from public.learning_enrollments where activity_id=p_id);
 end if;
 select array_agg(value::uuid) into v_teachers from jsonb_array_elements_text(p_data->'teacher_ids');
 if v_teachers is null or cardinality(v_teachers) not between 1 and 12 then raise exception 'TEACHER_REQUIRED'; end if;
 if exists(select 1 from unnest(v_teachers) t where not exists(select 1 from public.learning_profiles where id=t and kind='teacher')) then raise exception 'INVALID_TEACHER'; end if;
 -- Referencing another person's offering requires explicit management or a mutual place relationship.
 if exists(select 1 from unnest(v_teachers) t where not private.learning_can_manage(t) and not
 (v_place=v_organizer and exists(select 1 from public.learning_teacher_places where teacher_id=t and place_id=v_place))) then raise exception 'FORBIDDEN_TEACHER'; end if;
 if v_place is not null then
  if not exists(select 1 from public.learning_profiles where id=v_place and kind='place') then raise exception 'INVALID_PLACE'; end if;
  if not private.learning_can_manage(v_place) and exists(select 1 from unnest(v_teachers) t where not exists(select 1 from public.learning_teacher_places where teacher_id=t and place_id=v_place)) then raise exception 'FORBIDDEN_PLACE'; end if;
 end if;
 if p_data->>'modality'<>'online' and length(trim(coalesce(p_data->>'location','')))=0 then raise exception 'LOCATION_REQUIRED'; end if;
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=p_data->>'timezone') then raise exception 'INVALID_TIMEZONE'; end if;
 if jsonb_typeof(v_sessions) is distinct from 'array' or jsonb_array_length(v_sessions)<1 or jsonb_array_length(v_sessions)>100 then raise exception 'INVALID_SESSIONS'; end if;
 if (p_data->>'kind'='class' and jsonb_array_length(v_sessions)<>1) or (p_data->>'kind'='course' and jsonb_array_length(v_sessions)<2) then raise exception 'INVALID_SESSIONS'; end if;
 if exists(select 1 from jsonb_array_elements(v_sessions) s where length(trim(coalesce(s->>'title','')))=0 or (s->>'ends_at')::timestamptz <= (s->>'starts_at')::timestamptz or s->>'starts_at' is null or s->>'ends_at' is null) then raise exception 'INVALID_SESSIONS'; end if;
 if exists(select 1 from (select (s->>'starts_at')::timestamptz start_at,lag((s->>'ends_at')::timestamptz) over(order by (s->>'starts_at')::timestamptz) prev_end from jsonb_array_elements(v_sessions) s) q where start_at<prev_end) then raise exception 'OVERLAPPING_SESSIONS'; end if;
 select min((s->>'starts_at')::timestamptz),max((s->>'ends_at')::timestamptz) into v_first,v_last from jsonb_array_elements(v_sessions) s;
 if not locked and v_first<=now() then raise exception 'FUTURE_DATE_REQUIRED'; end if;
 if coalesce(p_data->>'image_url','')<>'' and p_data->>'image_url' !~ '^https://' then raise exception 'INVALID_IMAGE'; end if;
 if locked then
  if a.kind is distinct from p_data->>'kind' or a.teacher_ids is distinct from v_teachers or a.place_id is distinct from v_place or a.modality is distinct from p_data->>'modality' or a.location is distinct from coalesce(p_data->>'location','') or a.timezone is distinct from p_data->>'timezone' or a.price is distinct from (p_data->>'price')::numeric or a.currency is distinct from p_data->>'currency' then raise exception 'ENROLLED_DETAILS_LOCKED'; end if;
  if v_sessions is distinct from (select jsonb_agg(jsonb_build_object('title',title,'starts_at',to_char(starts_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'ends_at',to_char(ends_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) order by starts_at) from public.learning_sessions where activity_id=p_id) then raise exception 'ENROLLED_SCHEDULE_LOCKED'; end if;
 end if;
 if (p_data->>'capacity')::integer<coalesce(a.reserved_count,0) then raise exception 'CAPACITY_BELOW_ENROLLED'; end if;
 insert into public.learning_activities(id,organizer_id,kind,title,description,image_url,teacher_ids,place_id,modality,location,timezone,capacity,price,currency)
 values(v_id,v_organizer,p_data->>'kind',trim(p_data->>'title'),coalesce(p_data->>'description',''),nullif(p_data->>'image_url',''),v_teachers,v_place,p_data->>'modality',coalesce(p_data->>'location',''),p_data->>'timezone',(p_data->>'capacity')::integer,(p_data->>'price')::numeric,p_data->>'currency')
 on conflict(id) do update set title=excluded.title,description=excluded.description,image_url=excluded.image_url,kind=excluded.kind,teacher_ids=excluded.teacher_ids,place_id=excluded.place_id,modality=excluded.modality,location=excluded.location,timezone=excluded.timezone,capacity=excluded.capacity,price=excluded.price,currency=excluded.currency;
 if not locked then
  delete from public.learning_sessions where activity_id=v_id;
  insert into public.learning_sessions(activity_id,title,starts_at,ends_at) select v_id,s->>'title',(s->>'starts_at')::timestamptz,(s->>'ends_at')::timestamptz from jsonb_array_elements(v_sessions) s;
 end if;
 return v_id;
end $$;
create function private.learning_set_status(p_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare a public.learning_activities; begin
 perform private.learning_actor(); select * into a from public.learning_activities where id=p_id for update;
 if not found or not private.learning_can_manage(a.organizer_id) then raise exception 'FORBIDDEN'; end if;
 if p_status=a.status then return; end if;
 if not ((a.status='draft' and p_status in ('published','cancelled')) or (a.status='published' and p_status in ('cancelled','completed'))) then raise exception 'INVALID_TRANSITION'; end if;
 if p_status='published' then
  if not exists(select 1 from public.learning_profiles where id=a.organizer_id and published) or exists(select 1 from unnest(a.teacher_ids) t where not exists(select 1 from public.learning_profiles where id=t and published)) or (a.place_id is not null and not exists(select 1 from public.learning_profiles where id=a.place_id and published)) then raise exception 'PUBLISH_PROFILES_FIRST'; end if;
  if not exists(select 1 from public.learning_sessions where activity_id=p_id) or (select min(starts_at) from public.learning_sessions where activity_id=p_id)<=now() then raise exception 'FUTURE_DATE_REQUIRED'; end if;
 end if;
 if p_status='completed' and (select max(ends_at) from public.learning_sessions where activity_id=p_id)>now() then raise exception 'ACTIVITY_NOT_ENDED'; end if;
 update public.learning_activities set status=p_status where id=p_id;
 if p_status='cancelled' then
  update public.learning_enrollments set status='cancelled',cancelled_at=now() where activity_id=p_id and status='confirmed';
  update public.learning_activities set reserved_count=0 where id=p_id;
 end if;
end $$;
create function private.learning_enroll(p_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.learning_actor(); a public.learning_activities; e public.learning_enrollments; v_id uuid;
begin
 -- All enrollment, cancellation and capacity mutations acquire the same row lock.
 select * into a from public.learning_activities where id=p_id for update;
 if not found or a.status<>'published' then raise exception 'NOT_PUBLISHED'; end if;
 if a.price>0 then raise exception 'PAYMENT_UNAVAILABLE'; end if;
 if (select min(starts_at) from public.learning_sessions where activity_id=p_id)<=now() then raise exception 'ENROLLMENT_CLOSED'; end if;
 select * into e from public.learning_enrollments where activity_id=p_id and user_id=u;
 if e.status='confirmed' then return e.id; end if;
 if a.reserved_count>=a.capacity then raise exception 'FULL_CAPACITY'; end if;
 insert into public.learning_enrollments(activity_id,user_id) values(p_id,u)
 on conflict(activity_id,user_id) do update set status='confirmed',cancelled_at=null returning id into v_id;
 update public.learning_activities set reserved_count=reserved_count+1,schedule_locked=true where id=p_id;
 return v_id;
end $$;
create function private.learning_cancel_enrollment(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.learning_actor(); a public.learning_activities; begin
 select * into a from public.learning_activities where id=p_id for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if not exists(select 1 from public.learning_enrollments where activity_id=p_id and user_id=u and status='confirmed') then return; end if;
 if a.status<>'published' or (select min(starts_at) from public.learning_sessions where activity_id=p_id)<=now() then raise exception 'CANCELLATION_CLOSED'; end if;
 update public.learning_enrollments set status='cancelled',cancelled_at=now() where activity_id=p_id and user_id=u;
 update public.learning_activities set reserved_count=reserved_count-1 where id=p_id;
end $$;
create function private.learning_roster(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.learning_actor();
 if not exists(select 1 from public.learning_activities where id=p_id and private.learning_can_manage(organizer_id)) then raise exception 'FORBIDDEN'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'name',coalesce(p.display_name,'Alumno'),'status',e.status,'attendance',coalesce((select jsonb_agg(jsonb_build_object('session_id',r.session_id,'present',r.present)) from public.learning_attendance r where r.enrollment_id=e.id),'[]'::jsonb)) order by e.created_at)
 from public.learning_enrollments e left join public.profiles p on p.id=e.user_id where e.activity_id=p_id),'[]'::jsonb);
end $$;
create function private.learning_record_attendance(p_session uuid,p_enrollment uuid,p_present boolean) returns void language plpgsql security definer set search_path='' as $$
declare a public.learning_activities; s public.learning_sessions; u uuid:=private.learning_actor(); begin
 select * into s from public.learning_sessions where id=p_session;
 select * into a from public.learning_activities where id=s.activity_id for update;
 if not found or not private.learning_can_manage(a.organizer_id) then raise exception 'FORBIDDEN'; end if;
 if a.status not in ('published','completed') then raise exception 'ACTIVITY_CLOSED'; end if;
 if s.starts_at>now() then raise exception 'ATTENDANCE_NOT_STARTED'; end if;
 if p_present is null or not exists(select 1 from public.learning_enrollments where id=p_enrollment and activity_id=a.id and status='confirmed') then raise exception 'INVALID_ENROLLMENT'; end if;
 insert into public.learning_attendance(session_id,enrollment_id,activity_id,present,recorded_by) values(p_session,p_enrollment,a.id,p_present,u)
 on conflict(session_id,enrollment_id) do update set present=excluded.present,recorded_by=excluded.recorded_by,recorded_at=now();
end $$;

-- Explicit grants: all client writes go through authenticated, authorized RPCs.
alter table private.learning_settings enable row level security;
alter table private.learning_operators enable row level security;
alter table private.learning_managers enable row level security;
revoke all on private.learning_settings,private.learning_operators,private.learning_managers from public,anon,authenticated;
alter table public.learning_profiles enable row level security;
alter table public.learning_teacher_places enable row level security;
alter table public.learning_activities enable row level security;
alter table public.learning_sessions enable row level security;
alter table public.learning_enrollments enable row level security;
alter table public.learning_attendance enable row level security;
revoke all on public.learning_profiles,public.learning_teacher_places,public.learning_activities,public.learning_sessions,public.learning_enrollments,public.learning_attendance from public,anon,authenticated;
grant select on public.learning_profiles,public.learning_teacher_places,public.learning_activities,public.learning_sessions,public.learning_enrollments,public.learning_attendance to authenticated;
create policy learning_profiles_read on public.learning_profiles for select to authenticated using ((select private.learning_enabled()) and (published or private.learning_can_manage(id)));
create policy learning_links_read on public.learning_teacher_places for select to authenticated using ((select private.learning_enabled()) and exists(select 1 from public.learning_profiles where id=teacher_id) and exists(select 1 from public.learning_profiles where id=place_id));
create policy learning_activities_read on public.learning_activities for select to authenticated using (private.learning_can_read_activity(id));
create policy learning_sessions_read on public.learning_sessions for select to authenticated using (private.learning_can_read_activity(activity_id));
create policy learning_enrollments_read on public.learning_enrollments for select to authenticated using ((select private.learning_enabled()) and user_id=(select auth.uid()));
create policy learning_attendance_read on public.learning_attendance for select to authenticated using ((select private.learning_enabled()) and exists(select 1 from public.learning_enrollments where id=enrollment_id and user_id=(select auth.uid())));

-- Public wrappers are SECURITY INVOKER. Private definers always validate actor and ownership.
create function public.learning_access() returns jsonb language sql security invoker set search_path='' as $$ select private.learning_access() $$;
create function public.learning_save_profile(p_id uuid,p_data jsonb) returns uuid language sql security invoker set search_path='' as $$ select private.learning_save_profile(p_id,p_data) $$;
create function public.learning_link_profiles(p_teacher uuid,p_place uuid,p_link boolean) returns void language sql security invoker set search_path='' as $$ select private.learning_link_profiles(p_teacher,p_place,p_link) $$;
create function public.learning_save_activity(p_id uuid,p_data jsonb) returns uuid language sql security invoker set search_path='' as $$ select private.learning_save_activity(p_id,p_data) $$;
create function public.learning_set_status(p_id uuid,p_status text) returns void language sql security invoker set search_path='' as $$ select private.learning_set_status(p_id,p_status) $$;
create function public.learning_enroll(p_id uuid) returns uuid language sql security invoker set search_path='' as $$ select private.learning_enroll(p_id) $$;
create function public.learning_cancel_enrollment(p_id uuid) returns void language sql security invoker set search_path='' as $$ select private.learning_cancel_enrollment(p_id) $$;
create function public.learning_roster(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.learning_roster(p_id) $$;
create function public.learning_record_attendance(p_session uuid,p_enrollment uuid,p_present boolean) returns void language sql security invoker set search_path='' as $$ select private.learning_record_attendance(p_session,p_enrollment,p_present) $$;
do $$ declare f record; begin
 for f in select n.nspname,p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.proname like 'learning_%' loop
  execute format('revoke all on function %s from public,anon,authenticated',f.sig);
  execute format('grant execute on function %s to authenticated',f.sig);
 end loop;
end $$;
grant usage on schema private to authenticated;
commit;
