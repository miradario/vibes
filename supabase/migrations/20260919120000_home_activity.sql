begin;

alter table public.private_user_state
  add column if not exists home_preferences_seen_at timestamptz;

-- Atomic claim: only one device can trigger the first-Home invitation.
create or replace function public.claim_home_preferences_visit()
returns boolean
language sql
security invoker
set search_path = ''
as $$
  with claimed as (
    insert into public.private_user_state(user_id, home_preferences_seen_at)
    values ((select auth.uid()), now())
    on conflict (user_id) do update
      set home_preferences_seen_at = excluded.home_preferences_seen_at
      where public.private_user_state.home_preferences_seen_at is null
    returning user_id
  )
  select exists(select 1 from claimed);
$$;
revoke all on function public.claim_home_preferences_visit() from public, anon;
grant execute on function public.claim_home_preferences_visit() to authenticated;

create table public.connection_views (
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  opened_at timestamptz not null default now(),
  primary key (user_id, match_id)
);
create index connection_views_match_idx on public.connection_views(match_id);
alter table public.connection_views enable row level security;
revoke all on public.connection_views from public, anon, authenticated;
grant select, insert on public.connection_views to authenticated;
create policy connection_views_select on public.connection_views for select to authenticated
  using (user_id = (select auth.uid()));
create policy connection_views_insert on public.connection_views for insert to authenticated
  with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.matches m where m.id = match_id and m.is_active
      and (m.user1_id = (select auth.uid()) or m.user2_id = (select auth.uid()))
    )
  );
-- Preserve already-opened conversations from the existing read history.
insert into public.connection_views(user_id, match_id, opened_at)
select r.user_id, r.match_id, r.last_read_at
from public.direct_message_reads r join public.matches m on m.id = r.match_id
where r.last_read_at is not null and r.user_id in (m.user1_id, m.user2_id)
on conflict do nothing;

commit;
