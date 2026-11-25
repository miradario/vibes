-- Bloquear que el cliente cambie columnas administrativas de public.profiles.
--
-- Problema: authenticated tiene INSERT/UPDATE sobre todas las columnas y la
-- policy profiles_update_own solo exige auth.uid() = id and deleted_at is null.
-- Un usuario desactivado desde el backoffice (is_active = false) se podía
-- reactivar con PATCH /rest/v1/profiles {"is_active": true}, y cualquiera podía
-- cambiarse is_teacher (lo usa get_discovery_candidates). Además, con
-- profiles_delete_own podía borrar su fila y volver a insertarla activa.
--
-- Fix: trigger BEFORE INSERT/UPDATE/DELETE que solo actúa cuando el rol de la
-- sesión es authenticated o anon (llamadas directas del cliente vía PostgREST).
--   * UPDATE: error 42501 si cambia is_active, is_teacher, created_at,
--     deleted_at, deleted_by o deleted_reason. Mandar el mismo valor no falla.
--   * INSERT: fuerza los valores seguros (is_active true, is_teacher false,
--     created_at now(), deleted_* null).
--   * DELETE: error 42501 si la fila está desactivada o soft-deleted.
-- No afecta a service_role (edge functions del backoffice: admin-update-user-status,
-- admin-soft-delete-user, delete-account) ni a funciones SECURITY DEFINER
-- (admin_update_user_status), porque ahí current_user es service_role/postgres.
-- La función del trigger no es SECURITY DEFINER a propósito: necesita ver el
-- rol real de quien llama.

create or replace function private.profiles_guard_admin_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    new.is_active := true;
    new.is_teacher := false;
    new.created_at := now();
    new.deleted_at := null;
    new.deleted_by := null;
    new.deleted_reason := null;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.is_active is distinct from old.is_active
      or new.is_teacher is distinct from old.is_teacher
      or new.created_at is distinct from old.created_at
      or new.deleted_at is distinct from old.deleted_at
      or new.deleted_by is distinct from old.deleted_by
      or new.deleted_reason is distinct from old.deleted_reason
    then
      raise exception 'profiles: is_active, is_teacher, created_at and deleted_* can only be changed by an admin'
        using errcode = '42501';
    end if;
    return new;
  end if;

  -- DELETE
  if old.is_active is not true or old.deleted_at is not null then
    raise exception 'profiles: a deactivated profile cannot be deleted by its owner'
      using errcode = '42501';
  end if;
  return old;
end;
$$;

revoke all on function private.profiles_guard_admin_columns() from public, anon, authenticated;

drop trigger if exists profiles_guard_admin_columns on public.profiles;
create trigger profiles_guard_admin_columns
  before insert or update or delete on public.profiles
  for each row execute function private.profiles_guard_admin_columns();

-- Defensa extra: authenticated no necesita TRUNCATE, TRIGGER ni REFERENCES
-- (TRUNCATE además saltea RLS). Las escrituras normales no cambian.
revoke truncate, trigger, references on public.profiles from authenticated;
