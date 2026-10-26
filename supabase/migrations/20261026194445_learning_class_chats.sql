begin;
-- Class conversations reuse the existing group chat and its membership RLS.
create table private.learning_class_chats (
 source_id text primary key,
 group_id uuid not null unique references public.community_groups(id) on delete cascade
);
alter table private.learning_class_chats enable row level security;
revoke all on private.learning_class_chats from public,anon,authenticated;
create function private.learning_ensure_class_chat(p_source text,p_user uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare g uuid; v_title text;
begin
 -- Called only by the authenticated wrapper or request trigger, never exposed directly.
 select title into v_title from public.learning_reservation_requests
 where source_id=p_source and user_id=p_user and status='pending_confirmation' and exists(select 1 from unnest(starts_at) t where t>now()) limit 1;
 if not found then raise exception 'CLASS_CHAT_REQUIRES_REQUEST'; end if;
 perform pg_advisory_xact_lock(hashtextextended('learning-chat:'||p_source,0));
 select group_id into g from private.learning_class_chats where source_id=p_source;
 if not found then
  insert into public.community_groups(name,description,created_by)
  values(left(v_title,80),'Chat de la clase. Las solicitudes están pendientes y no confirman cupo.',null) returning id into g;
  insert into private.learning_class_chats(source_id,group_id) values(p_source,g);
 end if;
 insert into public.community_group_members(group_id,user_id) values(g,p_user) on conflict do nothing;
 return g;
end $$;
revoke all on function private.learning_ensure_class_chat(text,uuid) from public,anon,authenticated;
create function private.learning_class_chat(p_source text) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.learning_actor(); begin
 return private.learning_ensure_class_chat(p_source,u);
end $$;
create function public.learning_class_chat(p_source text) returns uuid
language sql security invoker set search_path='' as $$select private.learning_class_chat(p_source)$$;
revoke all on function private.learning_class_chat(text),public.learning_class_chat(text) from public,anon,authenticated;
grant execute on function private.learning_class_chat(text),public.learning_class_chat(text) to authenticated;
create function private.learning_sync_request_chat() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status='pending_confirmation' and exists(select 1 from unnest(new.starts_at) t where t>now()) then
  perform private.learning_ensure_class_chat(new.source_id,new.user_id);
 elsif not exists(select 1 from public.learning_reservation_requests r where r.source_id=new.source_id and r.user_id=new.user_id and r.status='pending_confirmation' and exists(select 1 from unnest(r.starts_at) t where t>now())) then
  delete from public.community_group_members where user_id=new.user_id and group_id=(select group_id from private.learning_class_chats where source_id=new.source_id);
 end if;
 return new;
end $$;
revoke all on function private.learning_sync_request_chat() from public,anon,authenticated;
create trigger learning_request_chat after insert or update of status on public.learning_reservation_requests for each row execute function private.learning_sync_request_chat();
commit;
