begin;

create table public.vibi_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  category text check (category in ('challenge', 'event', 'person')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  lock_token uuid,
  locked_until timestamptz not null default '-infinity'
);
create table public.vibi_exchanges (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.vibi_conversations(id) on delete cascade,
  request_id uuid not null,
  user_text text not null check (char_length(user_text) between 1 and 2000),
  assistant_text text not null check (char_length(assistant_text) between 1 and 2000),
  category text check (category in ('challenge', 'event', 'person')),
  recommendations jsonb not null default '[]' check (
    jsonb_typeof(recommendations) = 'array' and jsonb_array_length(recommendations) <= 3
  ),
  created_at timestamptz not null default now(),
  unique (conversation_id, request_id)
);
create index vibi_exchanges_history on public.vibi_exchanges (conversation_id, id desc);
-- Separate from the conversation so clearing history cannot reset the quota.
create table public.vibi_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  usage_day date not null default (now() at time zone 'UTC')::date,
  attempts integer not null default 0,
  last_attempt timestamptz not null default '-infinity'
);

alter table public.vibi_conversations enable row level security;
alter table public.vibi_exchanges enable row level security;
alter table public.vibi_usage enable row level security;
revoke all on public.vibi_conversations, public.vibi_exchanges, public.vibi_usage from public, anon, authenticated;
grant select (id, user_id, category, created_at, updated_at) on public.vibi_conversations to authenticated;
grant select on public.vibi_exchanges to authenticated;
grant all on public.vibi_conversations, public.vibi_exchanges, public.vibi_usage to service_role;
grant usage, select on sequence public.vibi_exchanges_id_seq to service_role;
create policy vibi_conversation_owner on public.vibi_conversations for select to authenticated
  using (user_id = (select auth.uid()));
create policy vibi_exchange_owner on public.vibi_exchanges for select to authenticated
  using (exists (select 1 from public.vibi_conversations c where c.id = conversation_id and c.user_id = (select auth.uid())));

-- Only the authenticated Edge handler may invoke these invoker functions.
create function public.vibi_claim(p_user_id uuid, p_conversation_id uuid, p_token uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare usage_row public.vibi_usage;
begin
  update public.vibi_conversations set lock_token = p_token, locked_until = now() + interval '90 seconds'
    where id = p_conversation_id and user_id = p_user_id and locked_until < now();
  if not found then return false; end if;
  insert into public.vibi_usage(user_id) values (p_user_id) on conflict do nothing;
  select * into usage_row from public.vibi_usage where user_id = p_user_id for update;
  if usage_row.last_attempt > now() - interval '3 seconds' or
     (usage_row.usage_day = (now() at time zone 'UTC')::date and usage_row.attempts >= 60) then
    raise exception 'vibi_rate_limit' using errcode = 'P0001';
  end if;
  update public.vibi_usage set
    usage_day = (now() at time zone 'UTC')::date,
    attempts = case when usage_day = (now() at time zone 'UTC')::date then attempts + 1 else 1 end,
    last_attempt = now() where user_id = p_user_id;
  return true;
end;
$$;

create function public.vibi_finish(p_user_id uuid, p_conversation_id uuid, p_token uuid,
  p_request_id uuid, p_user_text text, p_assistant_text text, p_category text, p_recommendations jsonb)
returns public.vibi_exchanges language plpgsql security invoker set search_path = '' as $$
declare result public.vibi_exchanges;
begin
  update public.vibi_conversations set category = p_category, updated_at = now(),
    lock_token = null, locked_until = '-infinity'
    where id = p_conversation_id and user_id = p_user_id and lock_token = p_token and locked_until > now();
  if not found then raise exception 'vibi_conversation_changed'; end if;
  insert into public.vibi_exchanges(conversation_id, request_id, user_text, assistant_text, category, recommendations)
    values (p_conversation_id, p_request_id, p_user_text, p_assistant_text, p_category, p_recommendations)
    returning * into result;
  return result;
end;
$$;
revoke all on function public.vibi_claim(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.vibi_finish(uuid, uuid, uuid, uuid, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.vibi_claim(uuid, uuid, uuid) to service_role;
grant execute on function public.vibi_finish(uuid, uuid, uuid, uuid, text, text, text, jsonb) to service_role;

commit;
