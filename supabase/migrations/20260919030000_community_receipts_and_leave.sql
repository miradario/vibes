begin;
create function public.refresh_swipe_timestamp() returns trigger language plpgsql set search_path='' as $$
begin new.created_at=now(); return new; end;
$$;
revoke all on function public.refresh_swipe_timestamp() from public;
create trigger refresh_swipe_timestamp before update on public.swipes for each row execute function public.refresh_swipe_timestamp();
create index if not exists swipes_visibility_idx on public.swipes(swiper_id,direction,created_at);
alter table public.community_group_members add column joined_at timestamptz not null default now();
alter table public.community_group_messages add column message_kind text not null default 'message' check (message_kind in ('message','system'));
drop policy messages_send on public.community_group_messages;
create policy messages_send on public.community_group_messages for insert to authenticated with check (sender_id=(select auth.uid()) and message_kind='message' and public.is_community_group_member(group_id));
revoke all on public.community_groups, public.community_group_members, public.community_group_messages from public, anon, authenticated;
grant select on public.community_groups, public.community_group_members to authenticated;
grant select, insert on public.community_group_messages to authenticated;

create table public.community_message_receipts (
 kind text not null check (kind in ('direct','group')),
 message_id uuid not null,
 conversation_id uuid not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 delivered_at timestamptz,
 read_at timestamptz,
 primary key(kind,message_id,user_id)
);
create index community_receipts_inbox on public.community_message_receipts(user_id,kind,conversation_id) where read_at is null;
create index community_receipts_conversation on public.community_message_receipts(kind,conversation_id);
alter table public.community_message_receipts enable row level security;
revoke all on public.community_message_receipts from public,anon,authenticated;
grant select on public.community_message_receipts to authenticated;
create policy receipts_own on public.community_message_receipts for select to authenticated using(user_id=(select auth.uid()));

create function public.community_has_access(k text, c uuid, u uuid) returns boolean language sql stable security definer set search_path='' as $$
 select case when k='direct' then exists(select 1 from public.matches where id=c and is_active and u in(user1_id,user2_id))
 when k='group' then exists(select 1 from public.community_group_members where group_id=c and user_id=u) else false end;
$$;
revoke all on function public.community_has_access(text,uuid,uuid) from public,anon,authenticated;

create function public.community_snapshot_recipients() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='messages' then
  insert into public.community_message_receipts(kind,message_id,conversation_id,user_id)
  select 'direct',new.id,new.match_id,u from public.matches m cross join lateral unnest(array[m.user1_id,m.user2_id]) u where m.id=new.match_id and u<>new.sender_id;
 else
  -- Serialize messages and exits so recipient snapshots cannot race membership changes.
  perform 1 from public.community_groups where id=new.group_id for update;
  if new.message_kind='message' and not exists(select 1 from public.community_group_members where group_id=new.group_id and user_id=new.sender_id) then raise exception 'Not a member'; end if;
  insert into public.community_message_receipts(kind,message_id,conversation_id,user_id)
  select 'group',new.id,new.group_id,user_id from public.community_group_members where group_id=new.group_id and user_id<>new.sender_id;
 end if;
 return new;
end;
$$;
revoke all on function public.community_snapshot_recipients() from public;
create trigger community_direct_receipts after insert on public.messages for each row execute function public.community_snapshot_recipients();
create trigger community_group_receipts after insert on public.community_group_messages for each row execute function public.community_snapshot_recipients();
create function public.community_cleanup_receipts() returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from public.community_message_receipts where kind=case when tg_table_name='messages' then 'direct' else 'group' end and message_id=old.id;
 return old;
end;
$$;
revoke all on function public.community_cleanup_receipts() from public;
create trigger community_direct_receipts_delete after delete on public.messages for each row execute function public.community_cleanup_receipts();
create trigger community_group_receipts_delete after delete on public.community_group_messages for each row execute function public.community_cleanup_receipts();
-- Preserve existing direct read markers when introducing per-message receipts.
insert into public.community_message_receipts(kind,message_id,conversation_id,user_id,delivered_at,read_at)
select 'direct',msg.id,msg.match_id,u,
 case when msg.created_at<=r.last_read_at then r.last_read_at end,
 case when msg.created_at<=r.last_read_at then r.last_read_at end
from public.messages msg join public.matches m on m.id=msg.match_id
cross join lateral unnest(array[m.user1_id,m.user2_id]) u
left join public.direct_message_reads r on r.match_id=m.id and r.user_id=u
where u<>msg.sender_id;
insert into public.community_message_receipts(kind,message_id,conversation_id,user_id)
select 'group',msg.id,msg.group_id,m.user_id from public.community_group_messages msg join public.community_group_members m on m.group_id=msg.group_id where m.user_id<>msg.sender_id;

-- Return actual incoming content; the client acknowledges only after receiving this response.
create function public.community_receive_messages() returns table(kind text,message_id uuid,conversation_id uuid,body text) language sql stable security definer set search_path='' as $$
 select r.kind,r.message_id,r.conversation_id,coalesce(d.text,g.body)
 from public.community_message_receipts r
 left join public.messages d on r.kind='direct' and d.id=r.message_id
 left join public.community_group_messages g on r.kind='group' and g.id=r.message_id
 where r.user_id=(select auth.uid()) and r.delivered_at is null
 and public.community_has_access(r.kind,r.conversation_id,(select auth.uid()))
 and (d.id is not null or g.id is not null)
 order by coalesce(d.created_at,g.created_at),r.message_id limit 100;
$$;
create function public.community_ack_messages(k text, ids uuid[], mark_read boolean default false) returns void language plpgsql security definer set search_path='' as $$
begin
 if cardinality(ids)>500 then raise exception 'Too many messages'; end if;
 update public.community_message_receipts r set delivered_at=coalesce(r.delivered_at,now()),read_at=case when mark_read then coalesce(r.read_at,now()) else r.read_at end
 where r.user_id=(select auth.uid()) and r.kind=k and r.message_id=any(ids)
 and public.community_has_access(r.kind,r.conversation_id,(select auth.uid()));
end;
$$;
create function public.community_unread_counts() returns table(kind text,conversation_id uuid,unread_count bigint) language sql stable security definer set search_path='' as $$
 select r.kind,r.conversation_id,count(*) from public.community_message_receipts r
 where r.user_id=(select auth.uid()) and r.read_at is null and public.community_has_access(r.kind,r.conversation_id,(select auth.uid()))
 group by r.kind,r.conversation_id;
$$;
create function public.community_message_statuses(k text, ids uuid[]) returns table(message_id uuid,status text) language sql stable security definer set search_path='' as $$
 select msg.id, case when count(r.user_id)=0 then 'sent'
 when bool_and(r.read_at is not null) then 'read'
 when bool_and(r.delivered_at is not null) then 'delivered' else 'sent' end
 from (
  select d.id,d.match_id as conversation_id from public.messages d where k='direct' and d.id=any(ids) and d.sender_id=(select auth.uid())
  union all select g.id,g.group_id from public.community_group_messages g where k='group' and g.id=any(ids) and g.sender_id=(select auth.uid()) and g.message_kind='message'
 ) msg left join public.community_message_receipts r on r.kind=k and r.message_id=msg.id and public.community_has_access(k,msg.conversation_id,r.user_id)
 where public.community_has_access(k,msg.conversation_id,(select auth.uid())) group by msg.id;
$$;

create function public.leave_community_group(target_group uuid) returns void language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); owner_id uuid; successor uuid; caller_name text; successor_name text;
begin
 select created_by into owner_id from public.community_groups where id=target_group for update;
 if not found or not exists(select 1 from public.community_group_members where group_id=target_group and user_id=caller) then raise exception 'Not a member'; end if;
 select coalesce(nullif(display_name,''),'Un integrante') into caller_name from public.profiles where id=caller;
 delete from public.community_group_members where group_id=target_group and user_id=caller;
 delete from public.community_message_receipts where kind='group' and conversation_id=target_group and user_id=caller;
 select user_id into successor from public.community_group_members where group_id=target_group order by joined_at,user_id limit 1;
 if successor is null then
  delete from public.community_groups where id=target_group;
  return;
 end if;
 insert into public.community_group_messages(group_id,sender_id,body,message_kind) values(target_group,caller,coalesce(caller_name,'Un integrante')||' salió del grupo','system');
 if owner_id=caller then
  update public.community_groups set created_by=successor where id=target_group;
  select coalesce(nullif(display_name,''),'Un integrante') into successor_name from public.profiles where id=successor;
  insert into public.community_group_messages(group_id,sender_id,body,message_kind) values(target_group,caller,coalesce(successor_name,'Un integrante')||' ahora administra el grupo','system');
 end if;
end;
$$;
revoke all on function public.community_receive_messages(),public.community_ack_messages(text,uuid[],boolean),public.community_unread_counts(),public.community_message_statuses(text,uuid[]),public.leave_community_group(uuid) from public,anon;
grant execute on function public.community_receive_messages(),public.community_ack_messages(text,uuid[],boolean),public.community_unread_counts(),public.community_message_statuses(text,uuid[]),public.leave_community_group(uuid) to authenticated;
alter publication supabase_realtime add table public.community_message_receipts, public.community_group_members;
commit;
