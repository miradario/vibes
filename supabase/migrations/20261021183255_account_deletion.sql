-- In-app account deletion (Apple Guideline 5.1.1(v)).
-- 1) Audit/authorship references to auth.users that were ON DELETE NO ACTION
--    block auth.admin.deleteUser. Switch them to ON DELETE SET NULL so the
--    shared content (events, challenges, groups, logs) survives anonymized.
-- 2) Helper for the delete-account edge function to find every storage object
--    owned by a user (service_role only).

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('public', 'profiles', 'deleted_by', 'profiles_deleted_by_fkey'),
      ('public', 'events', 'created_by', 'events_created_by_fkey'),
      ('public', 'challenges', 'created_by', 'challenges_created_by_fkey'),
      ('public', 'user_reports', 'reviewed_by', 'user_reports_reviewed_by_fkey'),
      ('public', 'challenge_join_requests', 'responder_id', 'challenge_join_requests_responder_id_fkey'),
      ('public', 'community_groups', 'created_by', 'community_groups_created_by_fkey'),
      ('public', 'vibi_prompt_versions', 'created_by', 'vibi_prompt_versions_created_by_fkey'),
      ('public', 'vibi_prompt_tests', 'actor_id', 'vibi_prompt_tests_actor_id_fkey'),
      ('public', 'vibi_prompt_publications', 'actor_id', 'vibi_prompt_publications_actor_id_fkey'),
      ('public', 'learning_attendance', 'recorded_by', 'learning_attendance_recorded_by_fkey'),
      ('public', 'signup_events', 'user_id', 'signup_events_user_id_fkey'),
      ('public', 'safety_feedback', 'reporter_id', 'safety_feedback_reporter_id_fkey'),
      ('private', 'staff_user_roles', 'assigned_by', 'staff_user_roles_assigned_by_fkey'),
      ('private', 'staff_audit_logs', 'actor_user_id', 'staff_audit_logs_actor_user_id_fkey'),
      ('private', 'notification_campaigns', 'created_by', 'notification_campaigns_created_by_fkey'),
      ('private', 'analytics_excluded_users', 'created_by', 'analytics_excluded_users_created_by_fkey')
    ) as t(sch, tbl, col, con)
  loop
    execute format('alter table %I.%I drop constraint if exists %I', r.sch, r.tbl, r.con);
    execute format(
      'alter table %I.%I add constraint %I foreign key (%I) references auth.users(id) on delete set null',
      r.sch, r.tbl, r.con, r.col
    );
  end loop;
end $$;

create or replace function public.account_storage_objects(target_user_id uuid)
returns table (bucket_id text, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select o.bucket_id, o.name
  from storage.objects o
  where o.owner_id = target_user_id::text
     or o.owner = target_user_id;
$$;

revoke all on function public.account_storage_objects(uuid) from public, anon, authenticated;
grant execute on function public.account_storage_objects(uuid) to service_role;
