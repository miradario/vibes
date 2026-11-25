-- Applied to prod 2026-11-25. Allows deferred links to a session (invitation email for students
-- without a Vibes account). Widens the check only; existing rows stay valid.
-- Constraint name is Postgres' default for the inline check in 20261015120000_deferred_link_clicks.sql;
-- confirm with: select conname from pg_constraint where conrelid = 'public.deferred_link_clicks'::regclass and contype = 'c';
alter table public.deferred_link_clicks drop constraint if exists deferred_link_clicks_content_type_check;
alter table public.deferred_link_clicks
  add constraint deferred_link_clicks_content_type_check check (content_type in ('challenge', 'event', 'session'));
