import { supabase } from "./supabase";
import { createSignedProfilePhotoUrl } from "./profilePhotoStorage";
export async function fetchProfileSummaries(ids: string[]) {
  if (!ids.length) return [];
  const [profiles, photos] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", ids)
      .is("deleted_at", null),
    supabase
      .from("profile_photos")
      .select("profile_id, url")
      .in("profile_id", ids)
      .order("is_primary", { ascending: false })
      .order("order", { ascending: true }),
  ]);
  if (profiles.error) throw profiles.error;
  if (photos.error) throw photos.error;
  return Promise.all(
    (profiles.data ?? []).map(async (profile) => ({
      userId: profile.id as string,
      displayName: profile.display_name as string | null,
      avatarUrl: await createSignedProfilePhotoUrl(
        photos.data?.find((photo) => photo.profile_id === profile.id)?.url
      ),
    }))
  );
}
