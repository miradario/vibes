-- Desafíos de Salud: además de pasos, mindfulness, sueño, ejercicio y distancia.
-- NO APLICADA en prod: aplicar solo con el OK de Agustín.
-- Unidades de challenges.daily_goal (entero) según metric_type:
--   steps            → pasos
--   mindful_minutes  → minutos de mindfulness / meditación (suma Salud + meditaciones de Vibes)
--   sleep_minutes    → minutos dormidos, atribuidos al día en que te despertás
--   exercise_minutes → minutos de ejercicio / movimiento
--   distance_meters  → metros (en Android puede incluir bici)
-- La RPC record_health_checkin, el guard de la métrica y la copia al reiniciar
-- ya funcionan con cualquier metric_type distinto de 'none': no cambian.
-- No toca datos: ninguna fila usa todavía las métricas nuevas.

alter table public.challenges drop constraint if exists challenges_metric_type_check;
alter table public.challenges add constraint challenges_metric_type_check
  check (metric_type in (
    'none', 'steps', 'mindful_minutes', 'sleep_minutes', 'exercise_minutes', 'distance_meters'
  ));

-- Las metas en minutos no pueden pasar de un día (1440). Pasos y metros siguen
-- con el tope general de challenges_daily_goal_check (1..100000).
alter table public.challenges drop constraint if exists challenges_daily_goal_minutes_check;
alter table public.challenges add constraint challenges_daily_goal_minutes_check
  check (
    metric_type not in ('mindful_minutes', 'sleep_minutes', 'exercise_minutes')
    or daily_goal <= 1440
  );
