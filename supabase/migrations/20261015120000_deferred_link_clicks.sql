-- Deferred deep links: clicks logged by the landing (vibes.gurudevelopers.dev)
-- before redirecting to the store, and claimed by the app on first launch.

create table if not exists public.deferred_link_clicks (
  click_id uuid primary key,
  path text not null,
  url text not null,
  content_type text not null check (content_type in ('challenge', 'event')),
  content_id text not null,
  ip text,
  user_agent text,
  accept_language text,
  platform text not null check (platform in ('ios', 'android', 'other')),
  created_at timestamptz not null default timezone('utc', now()),
  claimed_at timestamptz,
  claimed_by_install text
);

create index if not exists deferred_link_clicks_ios_match_idx
  on public.deferred_link_clicks (ip, created_at desc)
  where platform = 'ios' and claimed_at is null;

-- RLS on, no policies: only service_role (landing server + edge function) can touch it.
alter table public.deferred_link_clicks enable row level security;
revoke all on table public.deferred_link_clicks from anon, authenticated;

-- Atomic claim. Called only by the claim-deferred-link edge function (service_role).
create or replace function public.claim_deferred_link(
  p_click_id uuid default null,
  p_ip text default null,
  p_locale text default null,
  p_os_version text default null,
  p_install_id text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_click_id uuid;
  v_url text;
  v_lang text := nullif(lower(split_part(coalesce(p_locale, ''), '-', 1)), '');
  v_os text := nullif(replace(coalesce(p_os_version, ''), '.', '_'), '');
begin
  if p_click_id is not null then
    -- Android: exact match via Play Install Referrer.
    select d.click_id into v_click_id
    from public.deferred_link_clicks d
    where d.click_id = p_click_id
      and d.claimed_at is null
      and d.created_at > timezone('utc', now()) - interval '24 hours'
    for update skip locked;
  elsif p_ip is not null then
    -- iOS: probabilistic match by IP, preferring same language and iOS version.
    select d.click_id into v_click_id
    from public.deferred_link_clicks d
    where d.platform = 'ios'
      and d.ip = p_ip
      and d.claimed_at is null
      and d.created_at > timezone('utc', now()) - interval '24 hours'
    order by
      (v_lang is not null and lower(coalesce(d.accept_language, '')) like v_lang || '%') desc,
      (v_os is not null and coalesce(d.user_agent, '') like '%OS ' || v_os || '%') desc,
      d.created_at desc
    limit 1
    for update skip locked;
  end if;

  if v_click_id is null then
    return null;
  end if;

  update public.deferred_link_clicks
  set claimed_at = timezone('utc', now()),
      claimed_by_install = p_install_id
  where click_id = v_click_id
  returning url into v_url;

  return v_url;
end;
$$;

revoke all on function public.claim_deferred_link(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.claim_deferred_link(uuid, text, text, text, text) to service_role;
