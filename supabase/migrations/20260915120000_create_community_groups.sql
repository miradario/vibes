-- Independent, private community groups. Creation and membership are atomic.
create table public.community_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.community_group_members (
  group_id uuid not null references public.community_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (group_id, user_id)
);
create index community_group_members_user_idx on public.community_group_members(user_id, group_id);
create table public.community_group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.community_groups(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index community_group_messages_group_idx on public.community_group_messages(group_id, created_at desc);
create index community_groups_creator_idx on public.community_groups(created_by);
create index community_group_messages_sender_idx on public.community_group_messages(sender_id);

create function public.is_community_group_member(target_group uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.community_group_members
    where group_id = target_group and user_id = (select auth.uid()));
$$;
revoke all on function public.is_community_group_member(uuid) from public;
grant execute on function public.is_community_group_member(uuid) to authenticated;

alter table public.community_groups enable row level security;
alter table public.community_group_members enable row level security;
alter table public.community_group_messages enable row level security;
create policy groups_read on public.community_groups for select to authenticated
  using (public.is_community_group_member(id));
create policy members_read on public.community_group_members for select to authenticated
  using (public.is_community_group_member(group_id));
create policy messages_read on public.community_group_messages for select to authenticated
  using (public.is_community_group_member(group_id));
create policy messages_send on public.community_group_messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.is_community_group_member(group_id));
grant select on public.community_groups, public.community_group_members to authenticated;
grant select, insert on public.community_group_messages to authenticated;

create function public.create_community_group(group_name text, group_description text, member_ids uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  new_group uuid;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from unnest(member_ids) member_id where member_id <> caller) then
    raise exception 'Select at least one connection';
  end if;
  if coalesce(cardinality(member_ids), 0) > 100 then raise exception 'Too many members'; end if;
  if exists (
    select 1 from unnest(member_ids) member_id
    where member_id is null or (member_id <> caller and not exists (
      select 1 from public.matches m
      where (m.user1_id = caller and m.user2_id = member_id)
         or (m.user2_id = caller and m.user1_id = member_id)
    ))
  ) then raise exception 'Members must be your connections'; end if;
  insert into public.community_groups(name, description, created_by)
    values (btrim(group_name), btrim(coalesce(group_description, '')), caller) returning id into new_group;
  insert into public.community_group_members(group_id, user_id)
    select new_group, member_id from (
      select caller as member_id union select unnest(member_ids)
    ) members;
  return new_group;
end;
$$;
revoke all on function public.create_community_group(text, text, uuid[]) from public;
grant execute on function public.create_community_group(text, text, uuid[]) to authenticated;
alter publication supabase_realtime add table public.community_groups, public.community_group_messages;
