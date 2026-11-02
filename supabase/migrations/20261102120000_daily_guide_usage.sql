-- Per-user daily quota for the daily-guide Edge Function (same pattern as vibi_usage/vibi_claim).
create table public.daily_guide_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  usage_day date not null default (now() at time zone 'UTC')::date,
  attempts integer not null default 0,
  last_attempt timestamptz not null default '-infinity'
);

alter table public.daily_guide_usage enable row level security;
revoke all on public.daily_guide_usage from public, anon, authenticated;
grant all on public.daily_guide_usage to service_role;

-- Only the authenticated Edge handler (service_role) may invoke this.
create function public.daily_guide_claim(p_user_id uuid, p_daily_limit integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare usage_row public.daily_guide_usage;
begin
  insert into public.daily_guide_usage(user_id) values (p_user_id) on conflict do nothing;
  select * into usage_row from public.daily_guide_usage where user_id = p_user_id for update;
  if usage_row.last_attempt > now() - interval '3 seconds' or
     (usage_row.usage_day = (now() at time zone 'UTC')::date and usage_row.attempts >= p_daily_limit) then
    raise exception 'daily_guide_rate_limit' using errcode = 'P0001';
  end if;
  update public.daily_guide_usage set
    usage_day = (now() at time zone 'UTC')::date,
    attempts = case when usage_day = (now() at time zone 'UTC')::date then attempts + 1 else 1 end,
    last_attempt = now() where user_id = p_user_id;
  return true;
end;
$$;

revoke all on function public.daily_guide_claim(uuid, integer) from public, anon, authenticated;
grant execute on function public.daily_guide_claim(uuid, integer) to service_role;
