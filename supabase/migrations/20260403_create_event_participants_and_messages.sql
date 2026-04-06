-- ============================================================
-- event_participants: tracks who joined which event/challenge
-- ============================================================

create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  event_type text not null check (event_type in ('event', 'challenge')),
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default timezone('utc', now()),
  unique (event_id, user_id)
);

create index if not exists event_participants_event_idx
  on public.event_participants (event_id);

create index if not exists event_participants_user_idx
  on public.event_participants (user_id);

alter table public.event_participants enable row level security;

-- Any authenticated user can see participants of any event
create policy "event_participants_select"
on public.event_participants for select
to authenticated using (true);

-- Authenticated users can join events (insert their own row)
create policy "event_participants_insert"
on public.event_participants for insert
to authenticated
with check (auth.uid() = user_id);

-- Users can leave events (delete their own row)
create policy "event_participants_delete"
on public.event_participants for delete
to authenticated
using (auth.uid() = user_id);

-- ============================================================
-- Auto-update participant_count on events table
-- ============================================================

create or replace function public.update_event_participant_count()
returns trigger
language plpgsql
security definer
as $$
begin
  if (tg_op = 'INSERT') then
    if new.event_type = 'event' then
      update public.events
        set participant_count = participant_count + 1
        where id = new.event_id;
    elsif new.event_type = 'challenge' then
      update public.challenges
        set participant_count = participant_count + 1
        where id = new.event_id;
    end if;
    return new;
  elsif (tg_op = 'DELETE') then
    if old.event_type = 'event' then
      update public.events
        set participant_count = greatest(participant_count - 1, 0)
        where id = old.event_id;
    elsif old.event_type = 'challenge' then
      update public.challenges
        set participant_count = greatest(participant_count - 1, 0)
        where id = old.event_id;
    end if;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_event_participant_count on public.event_participants;
create trigger trg_event_participant_count
after insert or delete on public.event_participants
for each row
execute function public.update_event_participant_count();

-- ============================================================
-- event_messages: group chat messages per event/challenge
-- ============================================================

create table if not exists public.event_messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  event_type text not null check (event_type in ('event', 'challenge')),
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) > 0 and char_length(body) <= 2000),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists event_messages_event_created_idx
  on public.event_messages (event_id, created_at asc);

alter table public.event_messages enable row level security;

-- Only participants can read messages
create policy "event_messages_select"
on public.event_messages for select
to authenticated
using (
  exists (
    select 1 from public.event_participants ep
    where ep.event_id = event_messages.event_id
      and ep.user_id = auth.uid()
  )
);

-- Only participants can send messages
create policy "event_messages_insert"
on public.event_messages for insert
to authenticated
with check (
  auth.uid() = sender_id
  and exists (
    select 1 from public.event_participants ep
    where ep.event_id = event_messages.event_id
      and ep.user_id = auth.uid()
  )
);

-- Sender can delete their own messages (for everyone)
create policy "event_messages_delete_own"
on public.event_messages for delete
to authenticated
using (auth.uid() = sender_id);

-- Event/challenge creator (admin) can delete any message
create policy "event_messages_delete_admin"
on public.event_messages for delete
to authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = event_messages.event_id
      and e.created_by = auth.uid()
  )
  or exists (
    select 1 from public.challenges c
    where c.id = event_messages.event_id
      and c.created_by = auth.uid()
  )
);

-- Event/challenge creator (admin) can kick participants
create policy "event_participants_delete_admin"
on public.event_participants for delete
to authenticated
using (
  exists (
    select 1 from public.events e
    where e.id = event_participants.event_id
      and e.created_by = auth.uid()
  )
  or exists (
    select 1 from public.challenges c
    where c.id = event_participants.event_id
      and c.created_by = auth.uid()
  )
);

-- Enable realtime for event_messages
alter publication supabase_realtime add table public.event_messages;
