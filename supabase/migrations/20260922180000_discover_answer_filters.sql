-- NULL distinguishes accounts that still need their local filters imported.
alter table public.user_preferences
  add column if not exists discover_answer_filters jsonb;
alter table public.user_preferences
  add constraint discover_answer_filters_object
  check (discover_answer_filters is null or jsonb_typeof(discover_answer_filters) = 'object');
comment on column public.user_preferences.discover_answer_filters is
  'Discover selections for public profile answers and height bounds; not profile answers themselves.';
