begin;
create or replace function public.community_unread_counts() returns table(kind text,conversation_id uuid,unread_count bigint) language sql stable security definer set search_path='' as $$
 select r.kind,r.conversation_id,count(*) from public.community_message_receipts r
 where r.user_id=(select auth.uid()) and r.read_at is null and public.community_has_access(r.kind,r.conversation_id,(select auth.uid()))
 group by r.kind,r.conversation_id
 union all
 select m.event_type::text,m.event_id,count(*) from public.event_messages m
 left join public.event_group_reads r on r.event_id=m.event_id and r.event_type=m.event_type and r.user_id=(select auth.uid())
 where m.sender_id<>(select auth.uid()) and (r.last_read_at is null or m.created_at>r.last_read_at)
 and (exists(select 1 from public.event_participants p where p.event_id=m.event_id and p.event_type=m.event_type and p.user_id=(select auth.uid()))
 or (m.event_type='challenge' and exists(select 1 from public.challenge_participants p where p.challenge_id=m.event_id and p.user_id=(select auth.uid()))))
 group by m.event_type,m.event_id;
$$;
commit;
