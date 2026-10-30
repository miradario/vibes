export type EventPlace = { address: string; lat: number | null; lng: number | null };
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
export function eventPlaces(events: Array<{ location?: string | null; locationLatitude?: number | null; locationLongitude?: number | null; modality?: string | null }>, search = ''): EventPlace[] {
 const places = new Map<string, EventPlace>();
 for (const event of events) {
  const address = event.location?.trim();
  if (!address || event.modality === 'online') continue;
  const key = normalize(address);
  const coordinates = Number.isFinite(event.locationLatitude) && Number.isFinite(event.locationLongitude);
  if (!places.has(key) || (coordinates && places.get(key)?.lat === null)) places.set(key, {
   address, lat: coordinates ? event.locationLatitude! : null, lng: coordinates ? event.locationLongitude! : null,
  });
 }
 return [...places.values()].filter(place => normalize(place.address).includes(normalize(search))).sort((a,b)=>a.address.localeCompare(b.address, 'es'));
}
