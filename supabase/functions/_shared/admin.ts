import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type SupabaseClient = ReturnType<typeof createClient>;

export type AdminRoleKey = "super_admin" | "admin";

export type AdminCaller = {
  userId: string;
  email: string;
  roles: AdminRoleKey[];
};

export const jsonHeaders = {
  "Content-Type": "application/json",
};

const getSupabaseUrl = () => {
  const value = Deno.env.get("SUPABASE_URL");

  if (!value) {
    throw new Error("Missing SUPABASE_URL");
  }

  return value;
};

const getSupabaseAnonKey = () => {
  const value = Deno.env.get("SUPABASE_ANON_KEY");

  if (!value) {
    throw new Error("Missing SUPABASE_ANON_KEY");
  }

  return value;
};

const getSupabaseServiceRoleKey = () => {
  const value = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!value) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return value;
};

export const createAdminClient = () =>
  createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { persistSession: false },
  });

const createCallerClient = (authorizationHeader: string) =>
  createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: authorizationHeader,
      },
    },
  });

export const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...(init?.headers ?? {}),
    },
  });

export const errorResponse = (status: number, message: string) =>
  json({ error: message }, { status });

export const requireAdminCaller = async (req: Request): Promise<AdminCaller> => {
  const authorizationHeader = req.headers.get("Authorization") ?? "";

  if (!authorizationHeader) {
    throw new Response(JSON.stringify({ error: "Missing authorization header" }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  const callerClient = createCallerClient(authorizationHeader);
  const {
    data: { user },
    error: userError,
  } = await callerClient.auth.getUser();

  if (userError || !user?.email) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  const { data: roleRows, error: roleError } = await callerClient.rpc("get_my_staff_roles");

  if (roleError) {
    throw new Response(JSON.stringify({ error: "Failed to resolve staff roles" }), {
      status: 403,
      headers: jsonHeaders,
    });
  }

  const roles = Array.isArray(roleRows)
    ? roleRows
        .map((row) => {
          if (!row || typeof row !== "object" || !("role_key" in row)) {
            return null;
          }

          return row.role_key;
        })
        .filter((role): role is AdminRoleKey => role === "super_admin" || role === "admin")
    : [];

  if (roles.length === 0) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: jsonHeaders,
    });
  }

  return {
    userId: user.id,
    email: user.email,
    roles,
  };
};

export const isSuperAdmin = (caller: AdminCaller) => caller.roles.includes("super_admin");

export const normalizeEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export const normalizeRoleKey = (value: unknown): AdminRoleKey | null => {
  if (value === "super_admin" || value === "admin") {
    return value;
  }

  return null;
};

export const getRequestBody = async (req: Request) => {
  const contentType = req.headers.get("Content-Type") ?? "";

  if (!contentType.includes("application/json")) {
    return {};
  }

  return await req.json();
};

export const auditStaffAction = async (
  supabase: SupabaseClient,
  actorUserId: string,
  action: string,
  entityId: string,
  payload: Record<string, unknown>,
) => {
  const { error } = await supabase.schema("private").from("staff_audit_logs").insert({
    actor_user_id: actorUserId,
    action,
    entity_type: "staff_user_role",
    entity_id: entityId,
    payload,
  });

  if (error) {
    console.error("[admin-audit] failed", action, error.message);
  }
};
