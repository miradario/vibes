alter table public.events
  add column if not exists event_link text,
  add column if not exists pricing_type text,
  add column if not exists payment_link text,
  add column if not exists modality text,
  add column if not exists online_link text;

update public.events
set pricing_type = coalesce(pricing_type, 'free'),
    modality = coalesce(modality, 'in_person')
where pricing_type is null
   or modality is null;

alter table public.events
  alter column pricing_type set default 'free',
  alter column pricing_type set not null,
  alter column modality set default 'in_person',
  alter column modality set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_pricing_type_check'
  ) then
    alter table public.events
      add constraint events_pricing_type_check
      check (pricing_type in ('free', 'paid'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_modality_check'
  ) then
    alter table public.events
      add constraint events_modality_check
      check (modality in ('in_person', 'online'));
  end if;
end $$;
