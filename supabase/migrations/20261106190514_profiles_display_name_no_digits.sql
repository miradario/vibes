-- Rechazar dígitos Unicode en profiles.display_name (misma regla que hasNumbersInName /\p{N}/u).
-- NOT VALID: no valida filas existentes (hay perfiles en prod con números); los INSERT/UPDATE nuevos sí se chequean.
-- Después de limpiar o migrar esos nombres se puede: ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_display_name_no_digits;

alter table public.profiles
  add constraint profiles_display_name_no_digits
  check (
    display_name !~ '[[:digit:]]'
    and display_name !~ '[٠-٩۰-۹]'
  )
  not valid;
