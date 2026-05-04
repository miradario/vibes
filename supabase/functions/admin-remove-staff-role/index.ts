import {
  auditStaffAction,
  createAdminClient,
  errorResponse,
  getRequestBody,
  isSuperAdmin,
  json,
  normalizeRoleKey,
  requireAdminCaller,
} from "../_shared/admin.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return errorResponse(405, "Method not allowed");
  }

  try {
    const caller = await requireAdminCaller(req);

    if (!isSuperAdmin(caller)) {
      return errorResponse(403, "Only super admins can remove roles");
    }

    const body = await getRequestBody(req);
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const roleKey = normalizeRoleKey(body.roleKey);

    if (!userId || !roleKey) {
      return errorResponse(400, "userId and roleKey are required");
    }

    if (userId === caller.userId && roleKey === "super_admin") {
      return errorResponse(400, "You cannot remove your own super_admin role");
    }

    const supabase = createAdminClient();
    const { data: roleRows, error: roleError } = await supabase
      .schema("private")
      .from("staff_roles")
      .select("id, key")
      .eq("key", roleKey)
      .limit(1);

    if (roleError) {
      return errorResponse(500, roleError.message);
    }

    const role = (roleRows ?? [])[0] as { id: number; key: string } | undefined;

    if (!role) {
      return errorResponse(404, "Role not found");
    }

    const { error: deleteError } = await supabase
      .schema("private")
      .from("staff_user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role_id", role.id);

    if (deleteError) {
      return errorResponse(500, deleteError.message);
    }

    await auditStaffAction(supabase, caller.userId, "remove_staff_role", userId, {
      roleKey: role.key,
    });

    return json({ success: true });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("[admin-remove-staff-role] unexpected error", error);
    return errorResponse(500, "Unexpected error");
  }
});
