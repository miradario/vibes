# profiles: columnas administrativas

Migración: `supabase/migrations/20261125110419_profiles_protect_admin_columns.sql`.
**Todavía no aplicada en prod (`mhmpjezgdvnqyqsnabuq`)**: requiere el OK de Agus.

El cliente (rol `authenticated` vía PostgREST) puede escribir su propia fila de
`public.profiles`, pero el trigger `profiles_guard_admin_columns` impide que toque
las columnas que maneja el backoffice:

| Columna | INSERT del cliente | UPDATE del cliente |
| --- | --- | --- |
| `is_active` | se fuerza `true` | error 42501 si cambia |
| `is_teacher` | se fuerza `false` | error 42501 si cambia |
| `created_at` | se fuerza `now()` | error 42501 si cambia |
| `deleted_at`, `deleted_by`, `deleted_reason` | se fuerzan `null` | error 42501 si cambian |

Además el cliente no puede borrar su fila si está desactivada o soft-deleted
(así no puede borrarla y reinsertarla activa), y `authenticated` ya no tiene
`TRUNCATE`, `TRIGGER` ni `REFERENCES` sobre la tabla.

Mandar el mismo valor que ya tiene la fila no falla. Las columnas editables
(display_name, birth_date, orientation, gender_id, intent_id, country, city,
location_label, latitude, longitude, neighborhood, age_range, nationality_code)
no cambian.

No afecta a `service_role` (edge functions `admin-update-user-status`,
`admin-soft-delete-user`, `delete-account`) ni a funciones `SECURITY DEFINER`
como `admin_update_user_status`: el trigger solo actúa cuando `current_user` es
`authenticated` o `anon`. Por eso la función del trigger no es `SECURITY DEFINER`.

Prueba: `scripts/profiles-admin-columns.test.sql` (fixtures + ROLLBACK).
