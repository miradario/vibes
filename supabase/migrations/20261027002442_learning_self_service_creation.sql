begin;
-- Self-service creates only owned learning profiles. It grants no operator/admin role.
create or replace function private.learning_access() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid(); active boolean; begin
 active:=u is not null and private.learning_enabled() and exists(select 1 from public.profiles where id=u and is_active and deleted_at is null);
 return jsonb_build_object('enabled',coalesce(active,false),'can_create',coalesce(active,false),
 'managed_ids',case when active then coalesce((select jsonb_agg(profile_id) from private.learning_managers where user_id=u),'[]'::jsonb) else '[]'::jsonb end);
end $$;
create or replace function private.learning_save_profile(p_id uuid,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.learning_actor(); v_id uuid:=coalesce(p_id,gen_random_uuid()); v_kind text:=p_data->>'kind'; v_specialties text[];
begin
 if p_id is not null then
  if not private.learning_can_manage(p_id) then raise exception 'FORBIDDEN'; end if;
  perform 1 from public.learning_profiles where id=p_id for update;
  if v_kind is distinct from (select kind from public.learning_profiles where id=p_id) then raise exception 'PROFILE_KIND_LOCKED'; end if;
 end if;
 select coalesce(array_agg(trim(value)) filter(where trim(value)<>''),'{}') into v_specialties from jsonb_array_elements_text(coalesce(p_data->'specialties','[]'));
 if cardinality(v_specialties)>20 then raise exception 'INVALID_SPECIALTIES'; end if;
 if p_data->>'modality'<>'online' and length(trim(coalesce(p_data->>'location','')))=0 then raise exception 'LOCATION_REQUIRED'; end if;
 if coalesce(p_data->>'image_url','')<>'' and p_data->>'image_url' !~ '^https://' then raise exception 'INVALID_IMAGE'; end if;
 if coalesce(p_data->>'cover_url','')<>'' and p_data->>'cover_url' !~ '^https://' then raise exception 'INVALID_IMAGE'; end if;
 insert into public.learning_profiles(id,kind,name,description,specialties,image_url,cover_url,location,modality,published)
 values(v_id,v_kind,trim(p_data->>'name'),coalesce(p_data->>'description',''),v_specialties,nullif(p_data->>'image_url',''),nullif(p_data->>'cover_url',''),coalesce(p_data->>'location',''),p_data->>'modality',coalesce((p_data->>'published')::boolean,false))
 on conflict(id) do update set name=excluded.name,description=excluded.description,specialties=excluded.specialties,image_url=excluded.image_url,cover_url=excluded.cover_url,location=excluded.location,modality=excluded.modality,published=excluded.published;
 if p_id is null then insert into private.learning_managers values(v_id,u); end if;
 return v_id;
end $$;

commit;
