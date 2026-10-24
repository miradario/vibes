import { supabase } from "./supabase";

/**
 * Insert-or-update the signed-in user's own profiles row without
 * `INSERT ... ON CONFLICT DO UPDATE`. An upsert needs SELECT privilege on
 * every column it updates, and authenticated cannot read latitude, longitude
 * or birth_date directly (they are exposed through get_my_profile /
 * get_discovery_candidates). A plain UPDATE (falling back to INSERT when the
 * row does not exist yet) only needs SELECT on `id`.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID_RE.test(value);

export const saveOwnProfileRow = async (
  userId: string,
  payload: Record<string, unknown>
) => {
  if (!isUuid(userId)) {
    return {
      error: {
        code: "INVALID_USER_ID",
        message: "saveOwnProfileRow: userId is not a valid UUID",
        details: "",
        hint: "",
      },
    };
  }
  const { id: _ignored, ...changes } = payload;
  const hasChanges = Object.keys(changes).length > 0;
  const tryUpdate = async () => {
    const updated = await supabase
      .from("profiles")
      .update(changes)
      .eq("id", userId)
      .select("id");
    if (updated.error) return { error: updated.error, done: true };
    return { error: null, done: (updated.data ?? []).length > 0 };
  };
  if (hasChanges) {
    const first = await tryUpdate();
    if (first.done) return { error: first.error };
  }
  const inserted = await supabase.from("profiles").insert({ ...changes, id: userId });
  // 23505 = unique_violation: a concurrent onboarding created the row between
  // our UPDATE (0 rows) and INSERT. Retry the UPDATE once.
  if (inserted.error?.code === "23505") {
    if (!hasChanges) return { error: null };
    const retry = await tryUpdate();
    if (retry.error) return { error: retry.error };
    if (retry.done) return { error: null };
  }
  return { error: inserted.error };
};
