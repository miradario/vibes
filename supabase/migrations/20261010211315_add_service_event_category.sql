begin;
alter table public.events drop constraint if exists events_category_check;
alter table public.events add constraint events_category_check
  check (category in ('party', 'music', 'wellness', 'arts', 'food', 'movement', 'learning', 'community', 'volunteering', 'spirituality', 'service')) not valid;
alter table public.events validate constraint events_category_check;
notify pgrst, 'reload schema';
commit;
