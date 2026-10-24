alter table public.user_preferences add column meet_people_enabled boolean not null default true;
comment on column public.user_preferences.meet_people_enabled is 'Opt out of meeting people: hide discovery and exclude this account from candidates.';

-- Keep the existing paginated RPC, privacy fields and grants unchanged.
do $$
declare definition text;
begin
  definition := pg_get_functiondef('public.get_discovery_candidates(uuid[],boolean,integer,uuid,integer,integer)'::regprocedure);
  if strpos(definition, 'where p.deleted_at is null') = 0 then raise exception 'Unexpected discovery function definition'; end if;
  definition := replace(definition, 'where p.deleted_at is null',
    'where p.deleted_at is null and coalesce(up.meet_people_enabled, true) and not exists (select 1 from public.user_preferences viewer where viewer.user_id = me and not viewer.meet_people_enabled)');
  execute definition;
end $$;


notify pgrst, 'reload schema';
