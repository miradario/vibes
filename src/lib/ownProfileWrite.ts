import { supabase } from "./supabase";

/**
 * Insert-or-update the signed-in user's own profiles row without
 * `INSERT ... ON CONFLICT DO UPDATE`. An upsert needs SELECT privilege on
 * every column it updates, and authenticated cannot read latitude, longitude
 * or birth_date directly (they are exposed through get_my_profile /
 * get_discovery_candidates). A plain UPDATE (falling back to INSERT when the
 * row does not exist yet) only needs SELECT on `id`.
 */
export const saveOwnProfileRow = async (
  userId: string,
  payload: Record<string, unknown>
) => {
  const { id: _ignored, ...changes } = payload;
  if (Object.keys(changes).length > 0) {
    const updated = await supabase
      .from("profiles")
      .update(changes)
      .eq("id", userId)
      .select("id");
    if (updated.error) return { error: updated.error };
    if ((updated.data ?? []).length > 0) return { error: null };
  }
  const inserted = await supabase.from("profiles").insert({ ...changes, id: userId });
  return { error: inserted.error };
};
