/** Signed tokens rotate; the object path and explicit version still identify the same photo. */
export function imageCacheSource<T>(source: T): T {
  if (!source || typeof source !== "object" || !("uri" in source)) return source;
  const value = source as { uri?: unknown; cacheKey?: string };
  if (typeof value.uri !== "string" || value.cacheKey) return source;
  try {
    const url = new URL(value.uri);
    if (!url.pathname.includes("/storage/v1/object/sign/")) return source;
    url.searchParams.delete("token");
    return { ...source, cacheKey: url.toString() };
  } catch {
    return source;
  }
}
