-- Swapping unique positions requires a temporary free position even inside one
-- transaction: PostgreSQL checks a non-deferrable unique index per row.
create or replace function public.reorder_profile_photo(
  photo_id uuid, expected_order integer, target_order integer
) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  caller uuid := auth.uid();
  source_order integer;
  target_id uuid;
  free_order integer;
begin
  if caller is null then raise exception 'Iniciá sesión para ordenar tus fotos'; end if;
  if target_order is null or target_order < 0 or target_order > 5 then
    raise exception 'Posición de foto inválida';
  end if;
  -- Serialize reorders for this owner and lock the affected photo rows.
  perform 1 from public.profiles where id = caller for update;
  perform 1 from public.profile_photos where profile_id = caller for update;
  select p."order" into source_order from public.profile_photos p
    where p.id = photo_id and p.profile_id = caller;
  if not found or source_order is distinct from expected_order then
    raise exception 'Las fotos cambiaron. Actualizá el perfil e intentá nuevamente';
  end if;
  if source_order = target_order then return; end if;
  select p.id into target_id from public.profile_photos p
    where p.profile_id = caller and p."order" = target_order;
  select greatest(coalesce(max(p."order"), 5), 5) + 1 into free_order
    from public.profile_photos p where p.profile_id = caller;
  update public.profile_photos set is_primary = false where profile_id = caller and is_primary;
  update public.profile_photos set "order" = free_order where id = photo_id and profile_id = caller;
  if target_id is not null then
    update public.profile_photos set "order" = source_order where id = target_id and profile_id = caller;
  end if;
  update public.profile_photos set "order" = target_order where id = photo_id and profile_id = caller;
  update public.profile_photos set is_primary = true
    where id = (select p.id from public.profile_photos p where p.profile_id = caller order by p."order", p.id limit 1)
      and profile_id = caller;
end;
$$;
revoke all on function public.reorder_profile_photo(uuid, integer, integer) from public, anon;
grant execute on function public.reorder_profile_photo(uuid, integer, integer) to authenticated;
