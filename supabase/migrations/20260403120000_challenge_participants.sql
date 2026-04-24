-- 1. Tabla de participantes del challenge
create table if not exists public.challenge_participants (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default timezone('utc', now()),
  streak integer not null default 0,
  last_checkin_date date,
  total_checkins integer not null default 0,
  constraint challenge_participants_unique unique (challenge_id, user_id),
  constraint challenge_participants_streak_nonnegative check (streak >= 0),
  constraint challenge_participants_total_nonnegative check (total_checkins >= 0)
);

create index if not exists challenge_participants_challenge_idx
  on public.challenge_participants (challenge_id);

create index if not exists challenge_participants_user_idx
  on public.challenge_participants (user_id);

-- 2. Tabla de check-ins diarios
create table if not exists public.challenge_checkins (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_date date not null default (timezone('utc', now()))::date,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint challenge_checkins_unique unique (challenge_id, user_id, checkin_date)
);

create index if not exists challenge_checkins_participant_idx
  on public.challenge_checkins (challenge_id, user_id);

-- 3. Función que actualiza streak y total_checkins al hacer check-in
create or replace function public.handle_challenge_checkin()
returns trigger
language plpgsql
as $$
declare
  v_last_date date;
  v_streak integer;
begin
  select last_checkin_date, streak
  into v_last_date, v_streak
  from public.challenge_participants
  where challenge_id = new.challenge_id and user_id = new.user_id;

  -- Racha: si el check-in anterior fue ayer, incrementa; si fue hoy (duplicado), no cambia; si fue más atrás, reinicia
  if v_last_date = new.checkin_date - 1 then
    v_streak := v_streak + 1;
  elsif v_last_date = new.checkin_date then
    -- ya hizo check-in hoy, no cambia nada
    return new;
  else
    v_streak := 1;
  end if;

  update public.challenge_participants
  set
    streak = v_streak,
    last_checkin_date = new.checkin_date,
    total_checkins = total_checkins + 1
  where challenge_id = new.challenge_id and user_id = new.user_id;

  return new;
end;
$$;

drop trigger if exists on_challenge_checkin on public.challenge_checkins;
create trigger on_challenge_checkin
after insert on public.challenge_checkins
for each row
execute function public.handle_challenge_checkin();

-- 4. Función que incrementa participant_count al unirse
create or replace function public.handle_challenge_join()
returns trigger
language plpgsql
as $$
begin
  update public.challenges
  set participant_count = participant_count + 1
  where id = new.challenge_id;
  return new;
end;
$$;

drop trigger if exists on_challenge_join on public.challenge_participants;
create trigger on_challenge_join
after insert on public.challenge_participants
for each row
execute function public.handle_challenge_join();

-- 5. RLS
alter table public.challenge_participants enable row level security;
alter table public.challenge_checkins enable row level security;

-- challenge_participants
drop policy if exists "participants_select" on public.challenge_participants;
create policy "participants_select"
on public.challenge_participants for select to authenticated using (true);

drop policy if exists "participants_insert_own" on public.challenge_participants;
create policy "participants_insert_own"
on public.challenge_participants for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "participants_delete_own" on public.challenge_participants;
create policy "participants_delete_own"
on public.challenge_participants for delete to authenticated
using (auth.uid() = user_id);

-- challenge_checkins
drop policy if exists "checkins_select" on public.challenge_checkins;
create policy "checkins_select"
on public.challenge_checkins for select to authenticated using (true);

drop policy if exists "checkins_insert_own" on public.challenge_checkins;
create policy "checkins_insert_own"
on public.challenge_checkins for insert to authenticated
with check (auth.uid() = user_id);
