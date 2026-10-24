-- DO NOT MERGE / DO NOT APPLY TO PROD until the backoffice forced update
-- (UpdateGate) requires an app version that reads Discover/Home and the own
-- profile through get_discovery_candidates / get_my_profile.
-- Older builds select('*') on profiles and read other users' user_preferences
-- and will break (Discover, Home) once this is applied.
--
-- 1) profiles: authenticated keeps SELECT on every column except
--    latitude, longitude, birth_date (and the deletion audit fields).
--    This applies to the own row too: the app reads its own birth date via
--    get_my_profile(). Writes (INSERT/UPDATE of those columns) are unchanged.
--    NOTE: column grants are explicit, so a new column added to profiles
--    must be added to this grant to be readable by the app.
revoke select on table public.profiles from authenticated;
grant select (
  id, created_at, updated_at, display_name, is_active, is_teacher,
  orientation, gender_id, intent_id, country, city, location_label,
  neighborhood, age_range, deleted_at, nationality_code
) on table public.profiles to authenticated;

-- 2) user_preferences: each user can only read their own row. Other users'
--    allowed preference fields are returned by get_discovery_candidates.
drop policy if exists user_preferences_select_authenticated on public.user_preferences;
drop policy if exists user_preferences_select_own on public.user_preferences;
create policy user_preferences_select_own on public.user_preferences
  as permissive for select to authenticated
  using (user_id = (select auth.uid()));
