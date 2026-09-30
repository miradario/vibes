create table public.vibi_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  title text not null check(char_length(title) between 1 and 100),
  content text not null check(char_length(content) between 20 and 12000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.vibi_prompt_config (
  id integer primary key check(id=1),
  published_id uuid references public.vibi_prompt_versions(id)
);
insert into public.vibi_prompt_config values (1,null);
create table public.vibi_prompt_tests (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.vibi_prompt_versions(id),
  actor_id uuid references auth.users(id) on delete set null,
  model text not null,
  successful boolean not null default false,
  created_at timestamptz not null default now()
);
create index vibi_prompt_tests_actor_time on public.vibi_prompt_tests(actor_id,created_at desc);
create index vibi_prompt_tests_version on public.vibi_prompt_tests(prompt_id) where successful;
create table public.vibi_prompt_publications (
  id bigint generated always as identity primary key,
  prompt_id uuid not null references public.vibi_prompt_versions(id),
  previous_id uuid references public.vibi_prompt_versions(id),
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.vibi_prompt_versions enable row level security;
alter table public.vibi_prompt_config enable row level security;
alter table public.vibi_prompt_tests enable row level security;
alter table public.vibi_prompt_publications enable row level security;
revoke all on public.vibi_prompt_versions, public.vibi_prompt_config, public.vibi_prompt_tests, public.vibi_prompt_publications from public,anon,authenticated;
grant all on public.vibi_prompt_versions, public.vibi_prompt_config, public.vibi_prompt_tests, public.vibi_prompt_publications to service_role;
grant usage,select on sequence public.vibi_prompt_publications_id_seq to service_role;

create function public.vibi_begin_prompt_test(p_actor uuid,p_prompt uuid,p_model text) returns uuid
language plpgsql security invoker set search_path='' as $$
declare result uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_actor::text,0));
  if exists(select 1 from public.vibi_prompt_tests where actor_id=p_actor and created_at > now()-interval '3 seconds')
    or (select count(*) from public.vibi_prompt_tests where actor_id=p_actor and created_at > now()-interval '1 day') >= 200 then
    raise exception 'Demasiadas pruebas. Intentá más tarde.';
  end if;
  insert into public.vibi_prompt_tests(prompt_id,actor_id,model) values(p_prompt,p_actor,p_model) returning id into result;
  return result;
end $$;
create function public.vibi_publish_prompt(p_actor uuid,p_prompt uuid,p_expected uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare current_id uuid;
begin
  select published_id into current_id from public.vibi_prompt_config where id=1 for update;
  if current_id is distinct from p_expected then raise exception 'La versión publicada cambió. Recargá antes de publicar.'; end if;
  if not exists(select 1 from public.vibi_prompt_tests where prompt_id=p_prompt and successful) then
    raise exception 'Probá esta versión antes de publicarla.';
  end if;
  update public.vibi_prompt_config set published_id=p_prompt where id=1;
  insert into public.vibi_prompt_publications(prompt_id,previous_id,actor_id) values(p_prompt,current_id,p_actor);
end $$;
revoke all on function public.vibi_begin_prompt_test(uuid,uuid,text), public.vibi_publish_prompt(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.vibi_begin_prompt_test(uuid,uuid,text), public.vibi_publish_prompt(uuid,uuid,uuid) to service_role;

alter table public.vibi_exchanges add column prompt_version text not null default 'builtin-v1';
drop function public.vibi_finish(uuid,uuid,uuid,uuid,text,text,text,jsonb);
create function public.vibi_finish(p_user_id uuid, p_conversation_id uuid, p_token uuid,
  p_request_id uuid, p_user_text text, p_assistant_text text, p_category text, p_recommendations jsonb,
  p_prompt_version text default 'builtin-v1')
returns public.vibi_exchanges language plpgsql security invoker set search_path = '' as $$
declare result public.vibi_exchanges;
begin
  update public.vibi_conversations set category = p_category, updated_at = now(),
    lock_token = null, locked_until = '-infinity'
    where id = p_conversation_id and user_id = p_user_id and lock_token = p_token and locked_until > now();
  if not found then raise exception 'vibi_conversation_changed'; end if;
  insert into public.vibi_exchanges(conversation_id, request_id, user_text, assistant_text, category, recommendations,prompt_version)
    values (p_conversation_id, p_request_id, p_user_text, p_assistant_text, p_category, p_recommendations,p_prompt_version)
    returning * into result;
  return result;
end;
$$;
revoke all on function public.vibi_finish(uuid,uuid,uuid,uuid,text,text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.vibi_finish(uuid,uuid,uuid,uuid,text,text,text,jsonb,text) to service_role;
