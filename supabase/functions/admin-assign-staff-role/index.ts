import {
  auditStaffAction,
  createAdminClient,
  errorResponse,
  getRequestBody,
  isSuperAdmin,
  json,
  normalizeEmail,
  normalizeRoleKey,
  requireAdminCaller,
} from "../_shared/admin.ts";

type AuthUserRow = {
  id: string;
  email: string | null;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return errorResponse(405, "Method not allowed");
  }

  try {
    const caller = await requireAdminCaller(req);

    if (!isSuperAdmin(caller)) {
      return errorResponse(403, "Only super admins can assign roles");
    }

    const body = await getRequestBody(req);
    const email = normalizeEmail(body.email);
    const roleKey = normalizeRoleKey(body.roleKey);

    if (!email || !roleKey) {
      return errorResponse(400, "email and roleKey are required");
    }

    const supabase = createAdminClient();
    const { data: users, error: userError } = await supabase
      .schema("auth")
      .from("users")
      .select("id, email")
      .eq("email", email)
      .limit(1);

    if (userError) {
      return errorResponse(500, userError.message);
    }

    const targetUser = ((users ?? []) as AuthUserRow[])[0];

    if (!targetUser?.id) {
      return errorResponse(404, "No auth user found for that email");
    }

    const { data: roleRows, error: roleError } = await supabase
      .schema("private")
      .from("staff_roles")
      .select("id, key, name")
      .eq("key", roleKey)
      .limit(1);

    if (roleError) {
      return errorResponse(500, roleError.message);
    }

    const role = (roleRows ?? [])[0] as { id: number; key: string; name: string } | undefined;

    if (!role) {
      return errorResponse(404, "Role not found");
    }

    const { error: insertError } = await supabase.schema("private").from("staff_user_roles").upsert(
      {
        user_id: targetUser.id,
        role_id: role.id,
        assigned_by: caller.userId,
      },
      { onConflict: "user_id,role_id" },
    );

    if (insertError) {
      return errorResponse(500, insertError.message);
    }

    await auditStaffAction(supabase, caller.userId, "assign_staff_role", targetUser.id, {
      targetEmail: targetUser.email,
      roleKey: role.key,
    });

    return json({
      success: true,
      item: {
        userId: targetUser.id,
        email: targetUser.email,
        roleKey: role.key,
        roleName: role.name,
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("[admin-assign-staff-role] unexpected error", error);
    return errorResponse(500, "Unexpected error");
  }
});
