-- ⚠️ NO APLICADO. Contenido "Por Vibes" de los desafíos de Salud nuevos.
-- Requiere la migración 20261110162317_health_metric_challenges.sql aplicada.
-- Correrlo a mano en el SQL editor solo con el OK de Agustín (auth.uid() es
-- null ahí, así que el guard deja poner la métrica). Es idempotente.
--  1) Vincula la plantilla 78305396 "10 minutos de meditación al despertar" a
--     mindful_minutes 10 y ajusta el subtítulo. Las copias ya reiniciadas
--     (p. ej. a37b6986) no cambian: siguen siendo manuales.
--  2) Crea "Dormí 7 horas" (sleep_minutes 420, 14 días), "30 minutos de
--     movimiento" (exercise_minutes 30, 21 días) y "Moverte 2 km por día"
--     (distance_meters 2000, 21 días).
do $$
declare
  owner_id uuid;
  starts text := '[[starts_at:' || to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') || ']]';
begin
  update public.challenges
     set metric_type = 'mindful_minutes',
         daily_goal = 10,
         subtitle = 'Arrancá el día en silencio, antes que el celular. Conectá Apple Salud o Health Connect, o registrá tu meditación en Vibes, y cuando llegues a 10 minutos el día se marca solo. Si preferís, también podés marcarlo a mano.'
   where id = '78305396-4e1c-44ef-9221-be17a9d4345d'
     and metric_type = 'none';

  select created_by into owner_id from public.challenges
  where 'por-vibes' = any(tags) order by created_at limit 1;
  if owner_id is null then
    raise exception 'No encontré un dueño para los desafíos curados';
  end if;

  if not exists (
    select 1 from public.challenges
    where 'por-vibes' = any(tags) and metric_type = 'sleep_minutes' and title = 'Dormí 7 horas'
  ) then
    insert into public.challenges (
      title, subtitle, description, duration_days, host_name, tags, created_by,
      visibility, metric_type, daily_goal
    ) values (
      'Dormí 7 horas',
      'Descansar bien también es cuidarte. Conectá Apple Salud o Health Connect y, cuando tu reloj o tu app de sueño registren 7 horas, el día en que te despertás se marca solo. Si preferís, también podés marcarlo a mano.',
      starts, 14, 'Vibes', array['por-vibes', 'bienestar'], owner_id,
      'public', 'sleep_minutes', 420
    );
  end if;

  if not exists (
    select 1 from public.challenges
    where 'por-vibes' = any(tags) and metric_type = 'exercise_minutes' and title = '30 minutos de movimiento'
  ) then
    insert into public.challenges (
      title, subtitle, description, duration_days, host_name, tags, created_by,
      visibility, metric_type, daily_goal
    ) values (
      '30 minutos de movimiento',
      'Caminá, bailá, entrená o hacé yoga: lo que te mueva. Conectá Apple Salud (mejor con Apple Watch) o Health Connect y, cuando sumes 30 minutos de ejercicio, el día se marca solo. Si preferís, también podés marcarlo a mano.',
      starts, 21, 'Vibes', array['por-vibes', 'movimiento'], owner_id,
      'public', 'exercise_minutes', 30
    );
  end if;

  if not exists (
    select 1 from public.challenges
    where 'por-vibes' = any(tags) and metric_type = 'distance_meters' and title = 'Moverte 2 km por día'
  ) then
    insert into public.challenges (
      title, subtitle, description, duration_days, host_name, tags, created_by,
      visibility, metric_type, daily_goal
    ) values (
      'Moverte 2 km por día',
      'Salí a caminar o a correr a tu ritmo. Conectá Apple Salud o Health Connect y, cuando llegues a moverte 2 km, el día se marca solo. Si preferís, también podés marcarlo a mano.',
      starts, 21, 'Vibes', array['por-vibes', 'movimiento'], owner_id,
      'public', 'distance_meters', 2000
    );
  end if;
end;
$$;
