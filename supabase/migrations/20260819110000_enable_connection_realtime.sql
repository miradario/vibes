-- Keep connections, incoming likes and direct-chat summaries synchronized
-- across devices without requiring an app restart.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table public.matches;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'swipes'
  ) then
    alter publication supabase_realtime add table public.swipes;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'direct_message_reads'
  ) then
    alter publication supabase_realtime add table public.direct_message_reads;
  end if;
end
$$;

alter table public.matches replica identity full;
alter table public.swipes replica identity full;
alter table public.messages replica identity full;
alter table public.direct_message_reads replica identity full;
