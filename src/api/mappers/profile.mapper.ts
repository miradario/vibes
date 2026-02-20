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

  const mappedPhotos = photos.map((photo) => ({
    id: photo.id,
    url: photo.url,
    order: photo.order,
    isPrimary: Boolean(photo.isPrimary),
  }));

  return {
    ...profile,
    photos: mappedPhotos,
  };
};
