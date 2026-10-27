begin;
-- Preserve dates once a request refers to them, including requests later cancelled.
create function private.learning_lock_requested_class() returns trigger language plpgsql security definer set search_path='' as $$
declare a public.learning_activities;
begin
 select * into a from public.learning_activities where id::text=new.source_id for update;
 if found then
  if a.status<>'published' or exists(select 1 from unnest(new.starts_at) t where not exists(select 1 from public.learning_sessions s where s.activity_id=a.id and s.starts_at=t)) then raise exception 'INVALID_RESERVATION'; end if;
  update public.learning_activities set schedule_locked=true where id=a.id;
 end if;
 return new;
end $$;
revoke all on function private.learning_lock_requested_class() from public,anon,authenticated;
create trigger learning_lock_requested_class before insert on public.learning_reservation_requests for each row execute function private.learning_lock_requested_class();
update public.learning_activities a set schedule_locked=true where exists(select 1 from public.learning_reservation_requests r where r.source_id=a.id::text);
create or replace function private.learning_save_activity(p_id uuid,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.learning_actor(); a public.learning_activities; v_id uuid:=coalesce(p_id,gen_random_uuid());
 v_organizer uuid:=(p_data->>'organizer_id')::uuid; v_place uuid:=nullif(p_data->>'place_id','')::uuid;
 v_teachers uuid[]; v_sessions jsonb:=p_data->'sessions'; v_first timestamptz; v_last timestamptz; locked boolean:=false;
begin
 if not private.learning_can_manage(v_organizer) then raise exception 'FORBIDDEN'; end if;
 if p_id is not null then
  select * into a from public.learning_activities where id=p_id for update;
  if not found or not private.learning_can_manage(a.organizer_id) or a.organizer_id<>v_organizer then raise exception 'FORBIDDEN'; end if;
  if a.status in ('cancelled','completed') then raise exception 'ACTIVITY_CLOSED'; end if;
  locked:=a.schedule_locked or exists(select 1 from public.learning_enrollments where activity_id=p_id);
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

create function private.learning_cancel_class_requests() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='cancelled' and old.status is distinct from new.status then
  update public.learning_reservation_requests set status='cancelled',cancelled_at=now() where source_id=new.id::text and status='pending_confirmation';
 end if;
 return new;
end $$;
revoke all on function private.learning_cancel_class_requests() from public,anon,authenticated;
create trigger learning_cancel_class_requests after update of status on public.learning_activities for each row execute function private.learning_cancel_class_requests();
commit;
