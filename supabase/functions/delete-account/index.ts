import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type SupabaseClient = ReturnType<typeof createClient>;

const jsonHeaders = { "Content-Type": "application/json" };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

const getEnv = (key: string) => {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing ${key}`);
  return value;
};

const createAdminClient = () =>
  createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });

const createCallerClient = (authorizationHeader: string) =>
  createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_ANON_KEY"), {
    auth: { persistSession: false },
    global: { headers: { Authorization: authorizationHeader } },
  });

// Buckets where files live under "<userId>/..."
const USER_FOLDER_BUCKETS = [
  "profile pictures",
  "community-group-photos",
  "event-assets",
];

// Nullable authorship/audit columns that reference auth.users with
// ON DELETE NO ACTION (the migration switches them to SET NULL; we also null
// them here so deletion works before that migration is applied).
const NULLABLE_REFERENCES: Array<[string, string]> = [
  ["profiles", "deleted_by"],
  ["events", "created_by"],
  ["challenges", "created_by"],
  ["user_reports", "reviewed_by"],
  ["challenge_join_requests", "responder_id"],
  ["community_groups", "created_by"],
  ["vibi_prompt_versions", "created_by"],
  ["vibi_prompt_tests", "actor_id"],
  ["vibi_prompt_publications", "actor_id"],
  ["learning_attendance", "recorded_by"],
  ["signup_events", "user_id"],
  ["safety_feedback", "reporter_id"],
];

const listFolderRecursive = async (
  supabase: SupabaseClient,
  bucket: string,
  prefix: string
): Promise<string[]> => {
  const paths: string[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
    if (!data?.length) break;
    for (const entry of data) {
      const path = `${prefix}/${entry.name}`;
      if (entry.id === null) {
        paths.push(...(await listFolderRecursive(supabase, bucket, path)));
      } else {
        paths.push(path);
      }
    }
    if (data.length < 1000) break;
    offset += data.length;
  }
  return paths;
};

const collectStorageObjects = async (
  supabase: SupabaseClient,
  userId: string
) => {
  const byBucket = new Map<string, Set<string>>();
  const add = (bucket: string, name: string) => {
    if (!byBucket.has(bucket)) byBucket.set(bucket, new Set());
    byBucket.get(bucket)!.add(name);
  };

  // Every object owned by the user (covers chat-photos, whose paths are
  // "<kind>/<conversationId>/<userId>/file"). Requires the migration.
  const { data: owned, error: ownedError } = await supabase.rpc(
    "account_storage_objects",
    { target_user_id: userId }
  );
  if (ownedError) {
    console.warn("[delete-account] account_storage_objects unavailable", ownedError.message);
  } else {
    for (const row of (owned ?? []) as Array<{ bucket_id: string; name: string }>) {
      add(row.bucket_id, row.name);
    }
  }

  for (const bucket of USER_FOLDER_BUCKETS) {
    for (const path of await listFolderRecursive(supabase, bucket, userId)) {
      add(bucket, path);
    }
  }
  return byBucket;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authorizationHeader = req.headers.get("Authorization") ?? "";
    if (!authorizationHeader) {
      return json({ error: "Missing authorization header" }, 401);
    }

    // The user id always comes from the verified JWT, never from the body.
    const callerClient = createCallerClient(authorizationHeader);
    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser();
    if (userError || !user?.id) return json({ error: "Unauthorized" }, 401);

    const userId = user.id;
    const supabase = createAdminClient();

    // 1) Storage files.
    const objects = await collectStorageObjects(supabase, userId);
    let removedFiles = 0;
    for (const [bucket, names] of objects) {
      const list = [...names];
      for (let i = 0; i < list.length; i += 100) {
        const chunk = list.slice(i, i + 100);
        const { error } = await supabase.storage.from(bucket).remove(chunk);
        if (error) {
          console.error("[delete-account] storage remove failed", bucket, error.message);
          return json({ error: "Could not delete user files" }, 500);
        }
        removedFiles += chunk.length;
      }
    }

    // 2) Anonymize authorship references that would block the delete.
    for (const [table, column] of NULLABLE_REFERENCES) {
      const { error } = await supabase
        .from(table)
        .update({ [column]: null })
        .eq(column, userId);
      if (error) {
        console.warn("[delete-account] could not null reference", table, column, error.message);
      }
    }

    // 3) Delete the auth user. profiles and every user-owned table cascade.
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("[delete-account] deleteUser failed", deleteError.message);
      return json({ error: "Could not delete account" }, 500);
    }

    console.log("[delete-account] deleted", { userId, removedFiles });
    return json({ ok: true });
  } catch (error) {
    console.error("[delete-account] unexpected error", error);
    return json({ error: "Unexpected error" }, 500);
  }
});
