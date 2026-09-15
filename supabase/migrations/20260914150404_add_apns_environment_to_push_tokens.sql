alter table public.push_tokens
  add column if not exists apns_environment text;

alter table public.push_tokens
  drop constraint if exists push_tokens_apns_environment_check;

alter table public.push_tokens
  add constraint push_tokens_apns_environment_check
  check (apns_environment is null or apns_environment in ('sandbox', 'production'));

update public.push_tokens
set apns_environment = 'production'
where provider = 'apns'
  and apns_environment is null;
