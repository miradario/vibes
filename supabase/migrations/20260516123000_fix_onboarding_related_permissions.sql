do $$
begin
  if to_regclass('public.user_preferences') is not null then
    execute 'grant select, insert, update, delete on table public.user_preferences to authenticated';
    execute 'alter table public.user_preferences enable row level security';

    execute 'drop policy if exists "user_preferences_select_authenticated" on public.user_preferences';
    execute 'create policy "user_preferences_select_authenticated" on public.user_preferences for select to authenticated using (true)';

    execute 'drop policy if exists "user_preferences_insert_own" on public.user_preferences';
    execute 'create policy "user_preferences_insert_own" on public.user_preferences for insert to authenticated with check (auth.uid() = user_id)';

    execute 'drop policy if exists "user_preferences_update_own" on public.user_preferences';
    execute 'create policy "user_preferences_update_own" on public.user_preferences for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)';

    execute 'drop policy if exists "user_preferences_delete_own" on public.user_preferences';
    execute 'create policy "user_preferences_delete_own" on public.user_preferences for delete to authenticated using (auth.uid() = user_id)';
  end if;

  if to_regclass('public.profile_photos') is not null then
    execute 'grant select, insert, update, delete on table public.profile_photos to authenticated';
    execute 'alter table public.profile_photos enable row level security';

    execute 'drop policy if exists "profile_photos_select_authenticated" on public.profile_photos';
    execute 'create policy "profile_photos_select_authenticated" on public.profile_photos for select to authenticated using (true)';

    execute 'drop policy if exists "profile_photos_insert_own" on public.profile_photos';
    execute 'create policy "profile_photos_insert_own" on public.profile_photos for insert to authenticated with check (auth.uid() = profile_id)';

    execute 'drop policy if exists "profile_photos_update_own" on public.profile_photos';
    execute 'create policy "profile_photos_update_own" on public.profile_photos for update to authenticated using (auth.uid() = profile_id) with check (auth.uid() = profile_id)';

    execute 'drop policy if exists "profile_photos_delete_own" on public.profile_photos';
    execute 'create policy "profile_photos_delete_own" on public.profile_photos for delete to authenticated using (auth.uid() = profile_id)';
  end if;
end $$;
