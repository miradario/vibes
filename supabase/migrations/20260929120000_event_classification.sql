-- Keep legacy events unclassified instead of guessing their activity or format.
begin;
alter table public.events
  add column if not exists category text,
  add column if not exists participation_type text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'events_category_check' and conrelid = 'public.events'::regclass) then
    alter table public.events add constraint events_category_check
      check (category in ('party', 'music', 'wellness', 'arts', 'food', 'movement', 'learning', 'community', 'volunteering', 'spirituality')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'events_participation_type_check' and conrelid = 'public.events'::regclass) then
    alter table public.events add constraint events_participation_type_check
      check (participation_type in ('interactive', 'show', 'workshop', 'meetup', 'guided', 'talk', 'fair')) not valid;
  end if;
end $$;
alter table public.events validate constraint events_category_check;
alter table public.events validate constraint events_participation_type_check;
comment on column public.events.category is 'Activity category, independent of participation type and modality.';
comment on column public.events.participation_type is 'How attendees participate; not the event/challenge discriminator.';
notify pgrst, 'reload schema';
commit;
