-- Verifica el trigger profiles_guard_admin_columns. Correr con permisos de
-- administrador (psql / SQL editor) en un entorno de prueba: crea fixtures
-- dentro de una transacción y termina con ROLLBACK.
begin;
insert into auth.users (id, aud, role) values ('be782afd-a6bc-4673-bc43-038fb4250021','authenticated','authenticated');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','be782afd-a6bc-4673-bc43-038fb4250021',true);
select set_config('request.jwt.claims','{"sub":"be782afd-a6bc-4673-bc43-038fb4250021","role":"authenticated"}',true);

-- INSERT: los valores administrativos se fuerzan a los seguros.
insert into public.profiles (id, display_name, gender_id, is_active, is_teacher, deleted_reason)
values ('be782afd-a6bc-4673-bc43-038fb4250021', 'QA Perfil', 3, false, true, 'qa');
do $$ begin
 if (select is_active from public.profiles where id='be782afd-a6bc-4673-bc43-038fb4250021') is not true then raise exception 'Insert kept is_active=false'; end if;
 if (select is_teacher from public.profiles where id='be782afd-a6bc-4673-bc43-038fb4250021') is not false then raise exception 'Insert kept is_teacher=true'; end if;
 if (select deleted_reason from public.profiles where id='be782afd-a6bc-4673-bc43-038fb4250021') is not null then raise exception 'Insert kept deleted_reason'; end if;
end $$;

-- UPDATE de columnas editables (perfil, ubicación) sigue funcionando, y mandar
-- el mismo valor de una columna protegida no falla.
update public.profiles set city = 'QA City', display_name = 'QA Editado', is_active = true, is_teacher = false
where id = 'be782afd-a6bc-4673-bc43-038fb4250021';
do $$ begin
 if (select city from public.profiles where id='be782afd-a6bc-4673-bc43-038fb4250021') is distinct from 'QA City' then raise exception 'Owner update failed'; end if;
end $$;

-- UPDATE de columnas protegidas: rechazado.
do $$ begin
 begin
  update public.profiles set is_teacher = true where id = 'be782afd-a6bc-4673-bc43-038fb4250021';
  raise exception 'is_teacher change accepted';
 exception when insufficient_privilege then null;
 end;
 begin
  update public.profiles set created_at = now() - interval '1 year' where id = 'be782afd-a6bc-4673-bc43-038fb4250021';
  raise exception 'created_at change accepted';
 exception when insufficient_privilege then null;
 end;
end $$;

-- El backoffice (rol con privilegios) desactiva al usuario.
reset role;
update public.profiles set is_active = false where id = 'be782afd-a6bc-4673-bc43-038fb4250021';

-- El usuario desactivado no puede reactivarse ni borrar su fila para reinsertarla.
set local role authenticated;
do $$ begin
 begin
  update public.profiles set is_active = true where id = 'be782afd-a6bc-4673-bc43-038fb4250021';
  raise exception 'Self reactivation accepted';
 exception when insufficient_privilege then null;
 end;
 begin
  delete from public.profiles where id = 'be782afd-a6bc-4673-bc43-038fb4250021';
  raise exception 'Delete of deactivated profile accepted';
 exception when insufficient_privilege then null;
 end;
 if (select is_active from public.profiles where id='be782afd-a6bc-4673-bc43-038fb4250021') is not false then raise exception 'Profile was reactivated'; end if;
 if has_table_privilege(current_user,'public.profiles','TRUNCATE') then raise exception 'Unexpected truncate privilege'; end if;
end $$;

-- service_role (edge functions del backoffice) puede reactivar.
reset role;
set local role service_role;
update public.profiles set is_active = true where id = 'be782afd-a6bc-4673-bc43-038fb4250021';
do $$ begin
 if (select is_active from public.profiles where id='be782afd-a6bc-4673-bc43-038fb4250021') is not true then raise exception 'service_role update failed'; end if;
end $$;

reset role;
rollback;
select 'PASS: insert defaults forzados, edición propia ok, is_active/is_teacher/created_at bloqueados, sin auto-reactivación ni delete, service_role ok; fixtures rolled back' as result;
