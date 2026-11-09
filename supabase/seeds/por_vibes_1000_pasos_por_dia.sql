-- Desafío curado "Por Vibes": 1000 pasos por día (desafío de Salud).
-- Requiere la migración 20261028120000_health_step_challenges.sql aplicada.
-- Correrlo a mano en el SQL editor (auth.uid() es null, así que puede poner el
-- tag 'por-vibes' y la meta). Es idempotente: si ya existe, no hace nada.
-- Dueño: el mismo usuario que creó los otros desafíos "Por Vibes"; si todavía
-- no hay ninguno, la cuenta de Vibes indicada abajo.
do $$
declare
  owner_id uuid;
begin
  if exists (
    select 1 from public.challenges
    where 'por-vibes' = any(tags) and metric_type = 'steps' and title = '1000 pasos por día'
  ) then
    raise notice 'El desafío "1000 pasos por día" ya existe';
    return;
  end if;

  select created_by into owner_id from public.challenges
  where 'por-vibes' = any(tags) order by created_at limit 1;
  if owner_id is null then
    select id into owner_id from auth.users where email = 'agustin@gurudevelopers.com.ar';
  end if;
  if owner_id is null then
    raise exception 'No encontré un dueño para el desafío curado';
  end if;

  insert into public.challenges (
    title, subtitle, description, duration_days, host_name, tags, created_by,
    visibility, metric_type, daily_goal
  ) values (
    '1000 pasos por día',
    'Moverte un poco todos los días también es cuidarte. Conectá Apple Salud o Health Connect y, cuando llegues a 1000 pasos, el día se marca solo. Si preferís, también podés marcarlo a mano.',
    '[[starts_at:' || to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') || ']]',
    21,
    'Vibes',
    array['por-vibes', 'movimiento'],
    owner_id,
    'public',
    'steps',
    1000
  );
end;
$$;
