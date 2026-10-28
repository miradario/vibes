create or replace function private.vibes_shared_message(m public.messages,at_time timestamptz)
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
  link:=regexp_match(m.text,'com\.gurudevelopers\.vibes://class/([A-Za-z0-9_-]{1,80})($|[[:space:].,!?])','i');
  if link is null then return; end if;
  destination:='class:'||link[1];
  if link[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
   content_id:=link[1]::uuid; destination:='class:'||content_id::text;
   select title into content_title from public.learning_activities where id=content_id and status='published';
  else
   select title into content_title from private.learning_external_schedule where id=link[1];
  end if;
 end if;
 if content_title is null then return; end if;
 perform private.vibes_credit(m.sender_id,'share','share:'||destination,'Compartiste «'||content_title||'»',at_time);
end $$;
revoke all on function private.vibes_shared_message(public.messages,timestamptz) from public,anon,authenticated;

-- Include existing invitations to actual catalog classes, with the same caps.
do $$ declare m public.messages; begin for m in select * from public.messages where created_at<=now() order by created_at,id loop perform private.vibes_shared_message(m,m.created_at); end loop; end $$;
