-- Reconnecting from discarded history updates the original swipe.
-- Preserve RLS and allow only the author to read/update their own decision.
begin;
grant select on public.swipes to authenticated;
grant update (direction, created_at) on public.swipes to authenticated;
alter table public.swipes enable row level security;

-- Existing SELECT policies already expose a user's own swipes.
drop policy if exists swipes_update_own on public.swipes;
create policy swipes_update_own on public.swipes
  for update to authenticated
  using ((select auth.uid()) = swiper_id)
  with check ((select auth.uid()) = swiper_id);
notify pgrst, 'reload schema';
commit;
