export function hasProfilePhotos(
  profile: { photos?: unknown } | null | undefined
): boolean {
  return (
    Array.isArray(profile?.photos) &&
    profile.photos.some((photo: unknown) => {
      // Photos marked as not valid from the backoffice don't count.
      if (photo && typeof photo === "object" && "is_invalid" in photo && photo.is_invalid === true) return false;
      const url =
        typeof photo === "string"
          ? photo
          : photo && typeof photo === "object" && "url" in photo
          ? photo.url
          : null;
      return typeof url === "string" && url.trim().length > 0;
    })
  );
}

/** Keep photo-bearing profiles first, including when their URLs are hidden. */
export function comparePhotoPriority(
  left: { photos?: unknown; hasProfilePhoto?: boolean },
  right: { photos?: unknown; hasProfilePhoto?: boolean }
) {
  return (
    Number(right.hasProfilePhoto ?? hasProfilePhotos(right)) -
    Number(left.hasProfilePhoto ?? hasProfilePhotos(left))
  );
}
