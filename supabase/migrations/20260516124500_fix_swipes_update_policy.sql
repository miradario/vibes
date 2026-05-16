grant select, insert, update, delete on table public.swipes to authenticated;

alter table public.swipes enable row level security;

drop policy if exists "swipes_select_own" on public.swipes;
create policy "swipes_select_own" on public.swipes
  for select
  to authenticated
  using (auth.uid() = swiper_id or auth.uid() = target_id);

drop policy if exists "swipes_insert_own" on public.swipes;
create policy "swipes_insert_own" on public.swipes
  for insert
  to authenticated
  with check (auth.uid() = swiper_id);

drop policy if exists "swipes_update_own" on public.swipes;
create policy "swipes_update_own" on public.swipes
  for update
  to authenticated
  using (auth.uid() = swiper_id)
  with check (auth.uid() = swiper_id);

drop policy if exists "swipes_delete_own" on public.swipes;
create policy "swipes_delete_own" on public.swipes
  for delete
  to authenticated
  using (auth.uid() = swiper_id);
