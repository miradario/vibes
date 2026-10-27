begin;
alter table public.learning_profiles add column latitude double precision,add column longitude double precision;
alter table public.learning_profiles add constraint learning_place_coordinates_valid check((latitude is null and longitude is null) or (kind='place' and latitude is not null and longitude is not null and latitude between -90 and 90 and longitude between -180 and 180));
create or replace function private.learning_save_place(p_id uuid,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; lat double precision; lng double precision; begin
 perform private.learning_actor();
 if length(trim(coalesce(p_data->>'location','')))=0 then raise exception 'LOCATION_REQUIRED'; end if;
 if p_data ? 'latitude' or p_data ? 'longitude' then
  lat:=(p_data->>'latitude')::double precision;lng:=(p_data->>'longitude')::double precision;
  if (lat is null)<>(lng is null) or (lat is not null and (lat not between -90 and 90 or lng not between -180 and 180)) then raise exception 'INVALID_PLACE_COORDINATES'; end if;
 end if;
 v_id:=private.learning_save_profile(p_id,p_data || jsonb_build_object('kind','place','modality','in_person'));
 update public.learning_profiles set location_details=trim(coalesce(p_data->>'location_details','')) where id=v_id;
 if p_data ? 'latitude' or p_data ? 'longitude' then update public.learning_profiles set latitude=lat,longitude=lng where id=v_id; end if;
 return v_id;
end $$;
commit;
