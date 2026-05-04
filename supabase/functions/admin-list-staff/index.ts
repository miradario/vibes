import {
  createAdminClient,
  errorResponse,
  json,
  requireAdminCaller,
} from "../_shared/admin.ts";

type StaffAssignmentRow = {
  user_id: string;
  role_id: number;
  assigned_by: string | null;
  assigned_at: string;
};

type StaffRoleRow = {
  id: number;
  key: string;
  name: string;
};

type AuthUserRow = {
  id: string;
  email: string | null;
};

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return errorResponse(405, "Method not allowed");
  }

  try {
    await requireAdminCaller(req);
    const supabase = createAdminClient();

    const [{ data: roleRows, error: roleError }, { data: assignmentRows, error: assignmentError }] =
      await Promise.all([
        supabase.schema("private").from("staff_roles").select("id, key, name").order("id"),
        supabase
          .schema("private")
          .from("staff_user_roles")
          .select("user_id, role_id, assigned_by, assigned_at")
          .order("assigned_at", { ascending: false }),
      ]);

    if (roleError) {
      return errorResponse(500, roleError.message);
    }

    if (assignmentError) {
      return errorResponse(500, assignmentError.message);
    }

    const roles = (roleRows ?? []) as StaffRoleRow[];
    const assignments = (assignmentRows ?? []) as StaffAssignmentRow[];
    const userIds = Array.from(
      new Set(
        assignments.flatMap((row) => [row.user_id, row.assigned_by].filter((value): value is string => Boolean(value))),
      ),
    );

    let usersById = new Map<string, AuthUserRow>();

    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .schema("auth")
        .from("users")
        .select("id, email")
        .in("id", userIds);

      if (usersError) {
        return errorResponse(500, usersError.message);
      }

      usersById = new Map(((users ?? []) as AuthUserRow[]).map((user) => [user.id, user]));
    }

    const roleById = new Map(roles.map((role) => [role.id, role]));
    const items = assignments.map((assignment) => {
      const role = roleById.get(assignment.role_id);
      const user = usersById.get(assignment.user_id);
      const assignedBy = assignment.assigned_by ? usersById.get(assignment.assigned_by) : null;

      return {
        userId: assignment.user_id,
        email: user?.email ?? null,
        roleKey: role?.key ?? null,
        roleName: role?.name ?? null,
        assignedAt: assignment.assigned_at,
        assignedBy: assignedBy?.email ?? null,
      };
    });

    return json({
      roles: roles.map((role) => ({ key: role.key, name: role.name })),
      items,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error("[admin-list-staff] unexpected error", error);
    return errorResponse(500, "Unexpected error");
  }
});
