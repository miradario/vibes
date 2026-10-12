-- Existing memberships remain intact. New groups invite connections instead of adding them.
create table public.community_group_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.community_groups(id) on delete cascade,
  invitee_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id),
  group_name text not null,
  group_description text not null,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique(group_id,invitee_id),
  check (invitee_id <> invited_by)
);
create index community_invitations_inbox on public.community_group_invitations(invitee_id,created_at desc) where status='pending';
create index community_invitations_sender on public.community_group_invitations(invited_by);
alter table public.community_group_invitations enable row level security;
revoke all on public.community_group_invitations from public,anon,authenticated;
grant select on public.community_group_invitations to authenticated;
create policy invitations_own on public.community_group_invitations for select to authenticated
  using (invitee_id=(select auth.uid()));

create schema if not exists private;
grant usage on schema private to authenticated;
create function private.create_community_group_with_invitations(group_name text,group_description text,member_ids uuid[])
returns uuid language plpgsql security definer set search_path='' as $$
declare caller uuid := auth.uid(); new_group uuid;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if coalesce(cardinality(member_ids),0)>100 then raise exception 'Too many invitations'; end if;
  if exists (
    select 1 from unnest(member_ids) member_id
    where member_id is null or (member_id<>caller and not exists (
      select 1 from public.matches m where m.is_active and
      ((m.user1_id=caller and m.user2_id=member_id) or (m.user2_id=caller and m.user1_id=member_id))
    ))
  ) then raise exception 'Invitees must be your active connections'; end if;
  insert into public.community_groups(name,description,created_by)
    values(btrim(group_name),btrim(coalesce(group_description,'')),caller) returning id into new_group;
  insert into public.community_group_members(group_id,user_id) values(new_group,caller);
  insert into public.community_group_invitations(group_id,invitee_id,invited_by,group_name,group_description)
    select new_group,member_id,caller,btrim(group_name),btrim(coalesce(group_description,''))
    from (select distinct unnest(member_ids) as member_id) invitees where member_id<>caller;
  return new_group;
end;
$$;
revoke all on function private.create_community_group_with_invitations(text,text,uuid[]) from public,anon,authenticated;
grant execute on function private.create_community_group_with_invitations(text,text,uuid[]) to authenticated;
-- Preserve the existing API signature, including for older clients.
create or replace function public.create_community_group(group_name text,group_description text,member_ids uuid[])
returns uuid language sql security invoker set search_path='' as $$
  select private.create_community_group_with_invitations(group_name,group_description,member_ids);
$$;
revoke all on function public.create_community_group(text,text,uuid[]) from public,anon,authenticated;
grant execute on function public.create_community_group(text,text,uuid[]) to authenticated;

create function private.respond_community_group_invitation(invitation_id uuid,accept_invitation boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); target_group uuid; invitation public.community_group_invitations%rowtype;
  next_status text:=case when accept_invitation then 'accepted' else 'declined' end;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if accept_invitation is null then raise exception 'Choose accept or decline'; end if;
  select group_id into target_group from public.community_group_invitations where id=invitation_id and invitee_id=caller;
  if not found then raise exception 'Invitation not available'; end if;
  -- Match the lock order used by messages and leaving a group.
  perform 1 from public.community_groups where id=target_group for update;
  if not found then raise exception 'Group not available'; end if;
  select * into invitation from public.community_group_invitations where id=invitation_id and invitee_id=caller for update;
  if not found then raise exception 'Invitation not available'; end if;
  if invitation.status=next_status then return target_group; end if;
  if invitation.status<>'pending' then raise exception 'Invitation already answered'; end if;
  if accept_invitation then
    insert into public.community_group_members(group_id,user_id) values(target_group,caller) on conflict do nothing;
  end if;
  update public.community_group_invitations set status=next_status,responded_at=now() where id=invitation_id;
  return target_group;
end;
$$;
revoke all on function private.respond_community_group_invitation(uuid,boolean) from public,anon,authenticated;
grant execute on function private.respond_community_group_invitation(uuid,boolean) to authenticated;
create function public.respond_community_group_invitation(invitation_id uuid,accept_invitation boolean)
returns uuid language sql security invoker set search_path='' as $$
  select private.respond_community_group_invitation(invitation_id,accept_invitation);
$$;
revoke all on function public.respond_community_group_invitation(uuid,boolean) from public,anon,authenticated;
grant execute on function public.respond_community_group_invitation(uuid,boolean) to authenticated;
alter publication supabase_realtime add table public.community_group_invitations;
