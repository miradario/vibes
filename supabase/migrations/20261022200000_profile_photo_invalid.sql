-- Fotos de perfil marcadas como "no válidas" desde el backoffice.
-- NO APLICADA automáticamente: revisar y aplicar manualmente ANTES de deployar
-- la edge function admin-set-profile-photo-invalid (repo vibes-backoffice).
--
-- Regla: una foto no válida deja de aplicar. Si era la única, el usuario queda
-- sin foto (ve el aviso y no ve fotos de otros); si tiene varias, se usa la
-- siguiente válida. Se implementa ocultando la fila por RLS a anon/authenticated
-- (incluido el dueño), así toda la app la ignora sin cambiar cada query.

begin;

alter table public.profile_photos
  add column if not exists is_invalid boolean not null default false,
  add column if not exists invalidated_at timestamptz,
  add column if not exists invalidated_by uuid references auth.users(id) on delete set null;

create index if not exists profile_photos_profile_valid_idx
  on public.profile_photos (profile_id) where not is_invalid;

-- Restrictive: se combina con AND con las policies SELECT existentes.
drop policy if exists "profile_photos_hide_invalid" on public.profile_photos;
create policy "profile_photos_hide_invalid" on public.profile_photos
  as restrictive for select to anon, authenticated
  using (not is_invalid);

-- El dueño no puede auto-validar una foto ni marcarla él mismo.
create or replace function private.profile_photos_guard_invalid()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if tg_op = 'INSERT' then
      new.is_invalid := false;
      new.invalidated_at := null;
      new.invalidated_by := null;
    else
      new.is_invalid := old.is_invalid;
      new.invalidated_at := old.invalidated_at;
      new.invalidated_by := old.invalidated_by;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profile_photos_guard_invalid on public.profile_photos;
create trigger profile_photos_guard_invalid
  before insert or update on public.profile_photos
  for each row execute function private.profile_photos_guard_invalid();

-- Backoffice (service_role vía edge function con requireAdminCaller).
create or replace function public.admin_set_profile_photo_invalid(
  p_photo_id uuid,
  p_is_invalid boolean,
  p_actor_user_id uuid default null
)
returns table (id uuid, profile_id uuid, is_invalid boolean)
language sql
security definer
set search_path = ''
as $$
  update public.profile_photos p
     set is_invalid = p_is_invalid,
         invalidated_at = case when p_is_invalid then now() else null end,
         invalidated_by = case when p_is_invalid then p_actor_user_id else null end
   where p.id = p_photo_id
  returning p.id, p.profile_id, p.is_invalid;
$$;

revoke all on function public.admin_set_profile_photo_invalid(uuid, boolean, uuid) from public, anon, authenticated;
grant execute on function public.admin_set_profile_photo_invalid(uuid, boolean, uuid) to service_role;

-- App: el usuario puede saber si tiene fotos rechazadas (para el texto del aviso).
create or replace function public.my_profile_photo_status()
returns table (valid_count integer, invalid_count integer)
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) filter (where not p.is_invalid)::integer,
         count(*) filter (where p.is_invalid)::integer
    from public.profile_photos p
   where p.profile_id = auth.uid();
$$;

revoke all on function public.my_profile_photo_status() from public, anon;
grant execute on function public.my_profile_photo_status() to authenticated;

commit;
