import { mapSupabaseSelect } from "./case.mapper";

export type ProfileRow = Record<string, any>;
export type ProfilePhotoRow = Record<string, any>;

export const mapProfileWithPhotos = (
  profileRow: ProfileRow,
  photoRows: ProfilePhotoRow[]
) => {
  const profile = mapSupabaseSelect(profileRow) as Record<string, any>;
  const photos =
    (mapSupabaseSelect(photoRows) as Record<string, any>[] | null) ?? [];

  const mappedPhotosFromTable = photos.map((photo) => ({
    id: photo.id,
    url: photo.url,
    order: photo.order,
    isPrimary: Boolean(photo.isPrimary),
  }));

  const mappedPhotosFromProfile = Array.isArray(profile.photos)
    ? profile.photos
        .map((item: any, index: number) => {
          if (typeof item === "string" && item.trim()) {
            return {
              id: `profile-photo-${index}`,
              url: item,
              order: index,
              isPrimary: index === 0,
            };
          }

          if (
            item &&
            typeof item === "object" &&
            typeof item.url === "string" &&
            item.url.trim()
          ) {
            return {
              id: item.id ?? `profile-photo-${index}`,
              url: item.url,
              order: item.order ?? index,
              isPrimary:
                typeof item.isPrimary === "boolean"
                  ? item.isPrimary
                  : index === 0,
            };
          }

          return null;
        })
        .filter(Boolean)
    : [];

  const mergedPhotos =
    mappedPhotosFromTable.length > 0 ? mappedPhotosFromTable : mappedPhotosFromProfile;

  return {
    ...profile,
    photos: mergedPhotos,
  };
};
