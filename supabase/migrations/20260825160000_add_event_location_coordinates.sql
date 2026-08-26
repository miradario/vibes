alter table public.events
  add column if not exists location_latitude double precision,
  add column if not exists location_longitude double precision;

alter table public.events
  drop constraint if exists events_location_coordinates_check;

alter table public.events
  add constraint events_location_coordinates_check
  check (
    (location_latitude is null and location_longitude is null)
    or (
      location_latitude between -90 and 90
      and location_longitude between -180 and 180
    )
  );
