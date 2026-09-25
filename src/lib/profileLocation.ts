// Older mapped profiles can still contain a distance suffix in cached location text.
export function splitProfileLocation(location?: string, distanceLabel?: string) {
  const value = location?.trim();
  const match = value?.match(/^(?:(.*?)\s*[·•|]\s*)?(\d+(?:[.,]\d+)?\s*km)$/i);
  return {
    location: match ? match[1]?.trim() || undefined : value || undefined,
    distanceLabel: distanceLabel?.trim() || match?.[2] || undefined,
  };
}
