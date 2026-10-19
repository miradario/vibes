export function discoverPhotoReadiness(photos: Array<{ key: string; uri: string | null }>, status: Record<string, boolean>) {
  const existing = photos.filter(photo => Boolean(photo.uri));
  return {
    ready: existing.every(photo => status[photo.key] === true),
    failed: existing.some(photo => status[photo.key] === false),
    pending: existing.filter(photo => status[photo.key] === undefined).map(photo => photo.key),
  };
}
