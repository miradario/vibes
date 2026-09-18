begin;
alter table public.user_preferences add column if not exists profile_answers jsonb not null default '{}'::jsonb;
alter table public.user_preferences add constraint profile_answers_object check (jsonb_typeof(profile_answers) = 'object' and not (profile_answers ? 'availability') and not (profile_answers ? 'moods'));
create table public.private_user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  availability text not null default '' check (char_length(availability) <= 300),
  mood_day date,
  moods text[] not null default '{}'
);
alter table public.private_user_state enable row level security;
revoke all on public.private_user_state from public, anon, authenticated;
grant select, insert, update, delete on public.private_user_state to authenticated;
create policy private_state_select on public.private_user_state for select to authenticated using ((select auth.uid()) = user_id);
create policy private_state_insert on public.private_user_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy private_state_update on public.private_user_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy private_state_delete on public.private_user_state for delete to authenticated using ((select auth.uid()) = user_id);
commit;
