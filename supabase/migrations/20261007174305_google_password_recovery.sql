-- Only the recovery Edge Function can inspect authentication providers.
create schema if not exists private;
create table if not exists private.password_recovery_attempts (
  email_hash text primary key,
  window_start timestamptz not null,
  attempts integer not null
);
alter table private.password_recovery_attempts enable row level security;
revoke all on private.password_recovery_attempts from public, anon, authenticated;

create or replace function private.password_recovery_route(p_email text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  normalized text := lower(btrim(p_email));
  hits integer;
begin
  if normalized is null or length(normalized) > 254 or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid email';
  end if;
  delete from private.password_recovery_attempts where window_start < now() - interval '1 day';
  insert into private.password_recovery_attempts as previous (email_hash, window_start, attempts)
  values (encode(sha256(convert_to(normalized, 'UTF8')), 'hex'), now(), 1)
  on conflict (email_hash) do update set
    attempts = case when previous.window_start < now() - interval '1 minute' then 1 else previous.attempts + 1 end,
    window_start = case when previous.window_start < now() - interval '1 minute' then now() else previous.window_start end
  returning attempts into hits;
  if hits > 5 then return 'rate_limited'; end if;
  if exists (
    select 1 from auth.users u join auth.identities i on i.user_id = u.id
    where lower(u.email) = normalized and i.provider = 'google'
      and u.deleted_at is null
  ) then return 'google'; end if;
  -- Unknown and password accounts deliberately have the same response.
  return 'email';
end;
$$;
revoke all on function private.password_recovery_route(text) from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.password_recovery_route(text) to service_role;
create or replace function public.password_recovery_route(p_email text)
returns text language sql security invoker set search_path = '' as $$
  select private.password_recovery_route(p_email);
$$;
revoke all on function public.password_recovery_route(text) from public, anon, authenticated;
grant execute on function public.password_recovery_route(text) to service_role;
