create table if not exists public.challenge_ai_messages (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message_date date not null,
  body text not null check (char_length(body) > 0 and char_length(body) <= 2000),
  model text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (challenge_id, user_id, message_date)
);

create index if not exists idx_challenge_ai_messages_lookup
  on public.challenge_ai_messages (challenge_id, user_id, message_date desc);

alter table public.challenge_ai_messages enable row level security;

drop policy if exists "challenge_ai_messages_select_own" on public.challenge_ai_messages;
create policy "challenge_ai_messages_select_own"
on public.challenge_ai_messages for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "challenge_ai_messages_insert_own" on public.challenge_ai_messages;
create policy "challenge_ai_messages_insert_own"
on public.challenge_ai_messages for insert
to authenticated
with check (auth.uid() = user_id);

