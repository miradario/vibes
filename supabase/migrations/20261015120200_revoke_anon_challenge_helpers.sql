-- Default privileges grant EXECUTE to anon directly; these helpers are only for
-- authenticated RLS policies.
revoke execute on function public.is_challenge_member(uuid) from anon;
revoke execute on function public.is_matched_with(uuid) from anon;
revoke execute on function public.challenge_creator_id(uuid) from anon;
