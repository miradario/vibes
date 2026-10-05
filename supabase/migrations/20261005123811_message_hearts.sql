create table public.direct_message_hearts (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
create index direct_message_hearts_user_idx on public.direct_message_hearts(user_id);
alter table public.direct_message_hearts enable row level security;
revoke all on public.direct_message_hearts from public, anon, authenticated;
grant select, insert, delete on public.direct_message_hearts to authenticated;
-- The message table's RLS also applies inside these EXISTS queries.
create policy hearts_read on public.direct_message_hearts for select to authenticated
using (exists (select 1 from public.messages m where m.id = message_id));
create policy hearts_add on public.direct_message_hearts for insert to authenticated
with check (user_id = (select auth.uid()) and exists (
  select 1 from public.messages m where m.id = message_id
));
create policy hearts_remove on public.direct_message_hearts for delete to authenticated
using (user_id = (select auth.uid()) and exists (
  select 1 from public.messages m where m.id = message_id
));

create table public.group_message_hearts (
  message_id uuid not null references public.community_group_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
create index group_message_hearts_user_idx on public.group_message_hearts(user_id);
alter table public.group_message_hearts enable row level security;
revoke all on public.group_message_hearts from public, anon, authenticated;
grant select, insert, delete on public.group_message_hearts to authenticated;
-- The message table's RLS also applies inside these EXISTS queries.
create policy hearts_read on public.group_message_hearts for select to authenticated
using (exists (select 1 from public.community_group_messages m where m.id = message_id and m.message_kind = 'message'));
create policy hearts_add on public.group_message_hearts for insert to authenticated
with check (user_id = (select auth.uid()) and exists (
  select 1 from public.community_group_messages m where m.id = message_id and m.message_kind = 'message'
));
create policy hearts_remove on public.group_message_hearts for delete to authenticated
using (user_id = (select auth.uid()) and exists (
  select 1 from public.community_group_messages m where m.id = message_id and m.message_kind = 'message'
));

create table public.event_message_hearts (
  message_id uuid not null references public.event_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
create index event_message_hearts_user_idx on public.event_message_hearts(user_id);
alter table public.event_message_hearts enable row level security;
revoke all on public.event_message_hearts from public, anon, authenticated;
grant select, insert, delete on public.event_message_hearts to authenticated;
-- The message table's RLS also applies inside these EXISTS queries.
create policy hearts_read on public.event_message_hearts for select to authenticated
using (exists (select 1 from public.event_messages m where m.id = message_id));
create policy hearts_add on public.event_message_hearts for insert to authenticated
with check (user_id = (select auth.uid()) and exists (
  select 1 from public.event_messages m where m.id = message_id
));
create policy hearts_remove on public.event_message_hearts for delete to authenticated
using (user_id = (select auth.uid()) and exists (
  select 1 from public.event_messages m where m.id = message_id
));
