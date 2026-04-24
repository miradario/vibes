-- Enable Realtime for the table actually used by direct chat in the app.
alter publication supabase_realtime add table public.messages;
