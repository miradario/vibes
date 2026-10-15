-- Private challenges: replace "any authenticated user can read every challenge"
-- with the same rules the client uses in filterChallengesForViewer
-- (src/queries/events.queries.ts): creator, participant, public, or friends
-- (creator matched with viewer).

-- Helpers are security definer so policies don't recurse through RLS.
create or replace function public.is_challenge_member(p_challenge_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.challenge_participants p
    where p.challenge_id = p_challenge_id and p.user_id = auth.uid()
  ) or exists (
    select 1 from public.event_participants ep
    where ep.event_id = p_challenge_id
      and ep.event_type = 'challenge'
      and ep.user_id = auth.uid()
  );
$$;

create or replace function public.is_matched_with(p_other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_other_user is not null and exists (
    select 1 from public.matches m
    where (m.user1_id = auth.uid() and m.user2_id = p_other_user)
       or (m.user2_id = auth.uid() and m.user1_id = p_other_user)
  );
$$;

-- Creator lookup that ignores challenges RLS, for join requests from non-members.
create or replace function public.challenge_creator_id(p_challenge_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.created_by from public.challenges c where c.id = p_challenge_id;
$$;

revoke all on function public.is_challenge_member(uuid) from public;
revoke all on function public.is_matched_with(uuid) from public;
revoke all on function public.challenge_creator_id(uuid) from public;
grant execute on function public.is_challenge_member(uuid) to authenticated;
grant execute on function public.is_matched_with(uuid) to authenticated;
grant execute on function public.challenge_creator_id(uuid) to authenticated;

drop policy if exists "challenges_select_authenticated" on public.challenges;
drop policy if exists "challenges_select_visible" on public.challenges;
create policy "challenges_select_visible"
on public.challenges
for select
to authenticated
using (
  created_by = auth.uid()
  or coalesce(visibility, 'public') = 'public'
  or public.is_challenge_member(id)
  or (visibility = 'friends' and public.is_matched_with(created_by))
);

-- "Solicitar acceso": a non-member can no longer see a private challenge, so the
-- old subquery on public.challenges would block the insert. Use the definer helper.
drop policy if exists "challenge_join_requests_insert_own" on public.challenge_join_requests;
create policy "challenge_join_requests_insert_own"
on public.challenge_join_requests for insert
to authenticated
with check (
  auth.uid() = requester_id
  and public.challenge_creator_id(challenge_id) is not null
  and public.challenge_creator_id(challenge_id) <> auth.uid()
);

-- Shared preview: public challenges keep returning content; non-public ones
-- return only {id, type, visibility, restricted} so the app can tell
-- "private" apart from "not found".
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
    select case
      when coalesce(c.visibility, 'public') = 'public' then jsonb_build_object(
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
      else jsonb_build_object(
        'id', c.id,
        'type', 'challenge',
        'visibility', c.visibility,
        'restricted', true
      )
    end
    into result
    from public.challenges c
    where c.id = p_content_id;

    return result;
  end if;

  return null;
end;
$$;

revoke all on function public.get_public_shared_content(text, uuid) from public;
grant execute on function public.get_public_shared_content(text, uuid) to anon, authenticated;
