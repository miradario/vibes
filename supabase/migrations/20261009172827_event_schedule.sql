-- Each occurrence retains its own local-time-derived timestamp. starts_at remains
-- the first occurrence for compatibility with older clients.
alter table public.events add column if not exists schedule jsonb not null default '[]'::jsonb;
alter table public.events add constraint events_schedule_array check (jsonb_typeof(schedule) = 'array');
comment on column public.events.schedule is 'Chronological event occurrences [{"startsAt": ISO timestamp}]. Empty means legacy starts_at.';
comment on column public.events.capacity is '0 means unlimited; positive values are the participant limit.';

create or replace function public.get_public_shared_content(
  p_content_type text,
  p_content_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if p_content_type = 'event' then
    select jsonb_build_object(
      'id', e.id,
      'type', 'event',
      'category', e.category,
      'participation_type', e.participation_type,
      'title', e.title,
      'subtitle', e.subtitle,
      'description', e.description,
      'starts_at', e.starts_at,
      'schedule', e.schedule,
      'location', e.location,
      'location_latitude', e.location_latitude,
      'location_longitude', e.location_longitude,
      'pricing_type', e.pricing_type,
      'modality', e.modality,
      'capacity', e.capacity,
      'participant_count', e.participant_count,
      'image_url', e.image_url,
      'host_name', e.host_name,
      'host_image_url', e.host_image_url,
      'tags', e.tags,
      'created_at', e.created_at
    )
    into result
    from public.events e
    where e.id = p_content_id
      and e.type = 'event';

    return result;
  end if;

  if p_content_type = 'challenge' then
    select jsonb_build_object(
      'id', c.id,
      'type', 'challenge',
      'title', c.title,
      'subtitle', c.subtitle,
      'description', c.description,
      'duration_days', c.duration_days,
      'participant_count', c.participant_count,
      'image_url', c.image_url,
      'host_name', c.host_name,
      'host_image_url', c.host_image_url,
      'tags', c.tags,
      'visibility', c.visibility,
      'created_at', c.created_at
    )
    into result
    from public.challenges c
    where c.id = p_content_id
      and coalesce(c.visibility, 'public') = 'public';

    return result;
  end if;

  return null;
end;
$$;

revoke all on function public.get_public_shared_content(text, uuid) from public;
grant execute on function public.get_public_shared_content(text, uuid) to anon, authenticated;

comment on function public.get_public_shared_content(text, uuid) is
  'Returns the sanitized public fields required to preview a shared event or public challenge.';
