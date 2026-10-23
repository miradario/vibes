-- Matches are created on the server when two users like each other.
-- Existing app builds keep working: they look up the match after a like and
-- find the row created here, or their own insert hits the unique pair and
-- they recover it with a lookup (swipes.mutations.ts).

create or replace function private.create_match_on_mutual_like()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  low_id uuid := least(new.swiper_id, new.target_id);
  high_id uuid := greatest(new.swiper_id, new.target_id);
begin
  if new.direction <> 'like' or new.swiper_id = new.target_id then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.direction = 'like' then
    return new;
  end if;

  -- Serialize both sides of the same pair so simultaneous likes still match.
  perform pg_advisory_xact_lock(hashtextextended(low_id::text || ':' || high_id::text, 0));

  if exists (
    select 1 from public.swipes s
    where s.swiper_id = new.target_id
      and s.target_id = new.swiper_id
      and s.direction = 'like'
  ) then
    insert into public.matches (user1_id, user2_id)
    values (low_id, high_id)
    on conflict (user1_id, user2_id) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function private.create_match_on_mutual_like() from public, anon, authenticated;

drop trigger if exists trg_create_match_on_mutual_like on public.swipes;
create trigger trg_create_match_on_mutual_like
  after insert or update of direction on public.swipes
  for each row execute function private.create_match_on_mutual_like();

-- Matches are never edited from the app (unmatch deletes the row).
drop policy if exists matches_update_own on public.matches;

-- Direct inserts (older builds) are only accepted for a real mutual like.
drop policy if exists matches_insert on public.matches;
create policy matches_insert on public.matches
  as permissive for insert to authenticated
  with check (
    (auth.uid() = user1_id or auth.uid() = user2_id)
    and exists (
      select 1 from public.swipes s
      where s.swiper_id = user1_id and s.target_id = user2_id and s.direction = 'like'
    )
    and exists (
      select 1 from public.swipes s
      where s.swiper_id = user2_id and s.target_id = user1_id and s.direction = 'like'
    )
  );
