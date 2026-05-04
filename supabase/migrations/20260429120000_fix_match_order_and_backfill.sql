create or replace function public.normalize_match_order()
returns trigger as $$
begin
  if new.user1_id > new.user2_id then
    declare tmp uuid;
    begin
      tmp := new.user1_id;
      new.user1_id := new.user2_id;
      new.user2_id := tmp;
    end;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_normalize_match_order on public.matches;

create trigger trg_normalize_match_order
  before insert or update on public.matches
  for each row execute function public.normalize_match_order();

with ranked_matches as (
  select
    id,
    row_number() over (
      partition by least(user1_id, user2_id), greatest(user1_id, user2_id)
      order by created_at asc, id asc
    ) as duplicate_rank
  from public.matches
)
delete from public.matches m
using ranked_matches ranked
where m.id = ranked.id
  and ranked.duplicate_rank > 1;

update public.matches m
set user1_id = ordered.user1_id,
    user2_id = ordered.user2_id
from (
  select
    id,
    least(user1_id, user2_id) as user1_id,
    greatest(user1_id, user2_id) as user2_id
  from public.matches
) ordered
where m.id = ordered.id
  and (
    m.user1_id is distinct from ordered.user1_id
    or m.user2_id is distinct from ordered.user2_id
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.matches'::regclass
      and conname = 'matches_order'
  ) then
    alter table public.matches
      add constraint matches_order
      check (user1_id < user2_id);
  end if;
end $$;

insert into public.matches (user1_id, user2_id, created_at)
select
  mutual.user1_id,
  mutual.user2_id,
  mutual.matched_at
from (
  select
    least(s1.swiper_id, s1.target_id) as user1_id,
    greatest(s1.swiper_id, s1.target_id) as user2_id,
    min(greatest(s1.created_at, s2.created_at)) as matched_at
  from public.swipes s1
  inner join public.swipes s2
    on s1.swiper_id = s2.target_id
   and s1.target_id = s2.swiper_id
  where s1.direction = 'like'
    and s2.direction = 'like'
    and s1.swiper_id <> s1.target_id
  group by 1, 2
) mutual
left join public.matches m
  on m.user1_id = mutual.user1_id
 and m.user2_id = mutual.user2_id
where m.id is null
on conflict (user1_id, user2_id) do nothing;
