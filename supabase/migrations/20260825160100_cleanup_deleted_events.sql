update public.events e
set participant_count = (
  select count(distinct ep.user_id)::integer
  from public.event_participants ep
  where ep.event_id = e.id and ep.event_type = 'event'
)
where e.type = 'event';

create or replace function public.cleanup_deleted_event_relations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.event_messages
  where event_id = old.id and event_type = 'event';

  delete from public.event_group_reads
  where event_id = old.id and event_type = 'event';

  delete from public.event_participants
  where event_id = old.id and event_type = 'event';

  return old;
end;
$$;

drop trigger if exists cleanup_deleted_event_relations on public.events;
create trigger cleanup_deleted_event_relations
before delete on public.events
for each row
when (old.type = 'event')
execute function public.cleanup_deleted_event_relations();
