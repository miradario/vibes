-- Restringe EXECUTE en funciones SECURITY DEFINER que no necesitan ser
-- invocables por usuarios anónimos. Sin cambios de comportamiento para la app:
--  * Las funciones trigger (no se llaman por RPC) siguen disparándose (el privilegio EXECUTE no se
--    chequea al disparar un trigger).
--  * is_community_group_member solo se usa en políticas RLS del rol
--    authenticated, que conserva el permiso.

revoke execute on function public.cleanup_deleted_event_relations() from public, anon, authenticated;
revoke execute on function public.community_cleanup_receipts() from public, anon, authenticated;
revoke execute on function public.community_snapshot_recipients() from public, anon, authenticated;

revoke execute on function public.is_community_group_member(uuid) from public, anon;
grant execute on function public.is_community_group_member(uuid) to authenticated, service_role;
