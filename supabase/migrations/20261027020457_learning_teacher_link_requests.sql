begin;
alter table public.learning_profiles add column account_user_id uuid references auth.users(id) on delete set null;
alter table public.learning_profiles add column location_details text not null default '' check(length(location_details)<=300);
create table private.learning_teacher_requests (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null unique references public.learning_profiles(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted','rejected','cancelled')),
 created_at timestamptz not null default now(),
 check(sender_id <> recipient_id)
);
create index learning_teacher_requests_recipient on private.learning_teacher_requests(recipient_id,status);
create index learning_teacher_requests_sender on private.learning_teacher_requests(sender_id,status);
create unique index learning_teacher_requests_pending_pair on private.learning_teacher_requests(sender_id,recipient_id) where status='pending';
alter table private.learning_teacher_requests enable row level security;
revoke all on private.learning_teacher_requests from public,anon,authenticated;

create function private.learning_save_teacher(p_mode text,p_data jsonb,p_target uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.learning_actor(); v_id uuid; v_name text; begin
 if p_mode not in ('self','managed','user') or p_mode is null then raise exception 'INVALID_IDENTITY'; end if;
 if p_mode='user' then
  if p_target is null or p_target=u then raise exception 'INVALID_RECIPIENT'; end if;
  if not exists(select 1 from public.matches where is_active and ((user1_id=u and user2_id=p_target) or (user2_id=u and user1_id=p_target))) or exists(select 1 from public.user_blocks where (blocker_id=u and blocked_user_id=p_target) or (blocker_id=p_target and blocked_user_id=u)) then raise exception 'INVALID_RECIPIENT'; end if;
  select display_name into v_name from public.profiles where id=p_target and is_active and deleted_at is null;
  if not found then raise exception 'INVALID_RECIPIENT'; end if;
  if exists(select 1 from private.learning_teacher_requests where sender_id=u and recipient_id=p_target and status='pending') then raise exception 'REQUEST_ALREADY_PENDING'; end if;
  if (select count(*) from private.learning_teacher_requests where sender_id=u and created_at>now()-interval '1 day')>=20 then raise exception 'REQUEST_LIMIT'; end if;
  p_data:=p_data || jsonb_build_object('name',coalesce(nullif(trim(v_name),''),'Profesor'),'published',false);
 end if;
 v_id:=private.learning_save_profile(null,p_data || jsonb_build_object('kind','teacher'));
 if p_mode='self' then
  update public.learning_profiles set account_user_id=u where id=v_id;
 elsif p_mode='user' then
  insert into private.learning_teacher_requests(profile_id,sender_id,recipient_id) values(v_id,u,p_target);
 end if;
 return v_id;
end $$;

create function private.learning_teacher_requests() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=private.learning_actor(); begin
 return coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'profile_id',r.profile_id,'sender_id',r.sender_id,'recipient_id',r.recipient_id,'status',r.status,'name',p.name,'description',p.description,'specialties',p.specialties,'sender_name',s.display_name,'recipient_name',t.display_name) order by r.created_at desc)
 from private.learning_teacher_requests r join public.learning_profiles p on p.id=r.profile_id join public.profiles s on s.id=r.sender_id join public.profiles t on t.id=r.recipient_id
 where (r.sender_id=u or r.recipient_id=u)),'[]'::jsonb);
end $$;

create function private.learning_respond_teacher(p_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.learning_actor(); r private.learning_teacher_requests; begin
 select * into r from private.learning_teacher_requests where id=p_id for update;
 if not found or not ((r.recipient_id=u and p_status in ('accepted','rejected')) or (r.sender_id=u and p_status='cancelled')) then raise exception 'FORBIDDEN'; end if;
 if r.status<>'pending' then raise exception 'REQUEST_CLOSED'; end if;
 if p_status='accepted' and (not exists(select 1 from public.profiles where id=r.sender_id and is_active and deleted_at is null) or exists(select 1 from public.user_blocks where (blocker_id=u and blocked_user_id=r.sender_id) or (blocker_id=r.sender_id and blocked_user_id=u))) then raise exception 'INVALID_RECIPIENT'; end if;
 update private.learning_teacher_requests set status=p_status where id=p_id;
 if p_status='accepted' then
  insert into private.learning_managers(profile_id,user_id) values(r.profile_id,u) on conflict do nothing;
  update public.learning_profiles set account_user_id=u where id=r.profile_id;
 end if;
end $$;

-- A pending or refused identity cannot be published by the requester.
create function private.learning_guard_teacher_identity() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if new.published and exists(select 1 from private.learning_teacher_requests where profile_id=new.id and status<>'accepted') then raise exception 'TEACHER_ACCEPTANCE_REQUIRED'; end if;
 return new;
end $$;
create trigger learning_guard_teacher_identity before update on public.learning_profiles for each row execute function private.learning_guard_teacher_identity();
revoke all on function private.learning_guard_teacher_identity() from public,anon,authenticated;
create function public.learning_save_teacher(p_mode text,p_data jsonb,p_target uuid default null) returns uuid language sql security invoker set search_path='' as $$ select private.learning_save_teacher(p_mode,p_data,p_target) $$;
create function public.learning_teacher_requests() returns jsonb language sql security invoker set search_path='' as $$ select private.learning_teacher_requests() $$;
create function public.learning_respond_teacher(p_id uuid,p_status text) returns void language sql security invoker set search_path='' as $$ select private.learning_respond_teacher(p_id,p_status) $$;
revoke all on function private.learning_save_teacher(text,jsonb,uuid),private.learning_teacher_requests(),private.learning_respond_teacher(uuid,text),public.learning_save_teacher(text,jsonb,uuid),public.learning_teacher_requests(),public.learning_respond_teacher(uuid,text) from public,anon,authenticated;
grant execute on function private.learning_save_teacher(text,jsonb,uuid),private.learning_teacher_requests(),private.learning_respond_teacher(uuid,text),public.learning_save_teacher(text,jsonb,uuid),public.learning_teacher_requests(),public.learning_respond_teacher(uuid,text) to authenticated;
create function private.learning_save_place(p_id uuid,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; begin
 perform private.learning_actor();
 if length(trim(coalesce(p_data->>'location','')))=0 then raise exception 'LOCATION_REQUIRED'; end if;
 v_id:=private.learning_save_profile(p_id,p_data || jsonb_build_object('kind','place','modality','in_person'));
 update public.learning_profiles set location_details=trim(coalesce(p_data->>'location_details','')) where id=v_id;
 return v_id;
end $$;
create function public.learning_save_place(p_id uuid,p_data jsonb) returns uuid language sql security invoker set search_path='' as $$ select private.learning_save_place(p_id,p_data) $$;
revoke all on function private.learning_save_place(uuid,jsonb),public.learning_save_place(uuid,jsonb) from public,anon,authenticated;
grant execute on function private.learning_save_place(uuid,jsonb),public.learning_save_place(uuid,jsonb) to authenticated;
commit;
