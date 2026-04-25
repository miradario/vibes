update public.challenges c
set participant_count = counts.participant_count
from (
  select
    challenge_id,
    count(distinct user_id)::integer as participant_count
  from (
    select
      cp.challenge_id,
      cp.user_id
    from public.challenge_participants cp

    union

    select
      ep.event_id as challenge_id,
      ep.user_id
    from public.event_participants ep
    where ep.event_type = 'challenge'
  ) merged
  group by challenge_id
) counts
where c.id = counts.challenge_id;

update public.challenges
set participant_count = 0
where id not in (
  select challenge_id
  from (
    select cp.challenge_id
    from public.challenge_participants cp

    union

    select ep.event_id as challenge_id
    from public.event_participants ep
    where ep.event_type = 'challenge'
  ) merged
);

drop trigger if exists on_challenge_join on public.challenge_participants;
drop function if exists public.handle_challenge_join();
