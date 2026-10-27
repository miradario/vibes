import catalog from "../../assets/catalog/buenos-aires-classes.json";
export const externalClasses = catalog.clases;
export const externalPlaces = catalog.lugares;
export type ExternalClass = (typeof externalClasses)[number];
export type ExternalPlace = (typeof externalPlaces)[number];
export const placeForClass = (item: ExternalClass) => externalPlaces.find(place => place.id === item.lugar_id);
export const externalLocation = (place?: ExternalPlace) => place ? [place.ubicacion.direccion, place.ubicacion.barrio, place.ubicacion.ciudad].filter(Boolean).join(" · ") : "Ubicación a confirmar";
export const externalPrice = (item: ExternalClass) => item.precio.importe === null ? "Precio a consultar" : item.precio.importe === 0 ? "Gratis" : `${new Intl.NumberFormat("es-AR", {style:"currency", currency:item.precio.moneda ?? "ARS",maximumFractionDigits:0}).format(item.precio.importe)} · ${item.precio.unidad ?? "Consultar"}`;
export const externalSchedule = (item: ExternalClass) => item.horarios_semanales.map(slot => `${slot.dia} ${slot.hora_inicio}${slot.hora_fin ? `–${slot.hora_fin}` : ""}`).join(" · ") || "Horarios a consultar";
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();
export function matchesExternalClass(item: ExternalClass, filters: {query:string;specialty:string;location:string;modality:string;date:string}) {
  const place = placeForClass(item);
  const text = [item.titulo,item.descripcion,item.categoria,item.docente?.nombre,place?.nombre,externalLocation(place)].join(" ");
  const modality = normalize(item.modalidad);
  return normalize(text).includes(normalize(filters.query)) && (!filters.specialty || normalize(item.categoria) === normalize(filters.specialty)) &&
    normalize(externalLocation(place)).includes(normalize(filters.location)) &&
    (!filters.modality || (filters.modality === "in_person" ? modality.includes("presencial") : filters.modality === "online" ? /online|distancia/.test(modality) : modality.includes("presencial") && /online|distancia/.test(modality))) &&
    (!filters.date || (typeof (item.proxima_fecha_confirmada as string | null) === "string" && String(item.proxima_fecha_confirmada).startsWith(filters.date)));
}
export function matchesExternalPlace(place: ExternalPlace, query: string, specialty: string) {
  return normalize([place.nombre,externalLocation(place)].join(" ")).includes(normalize(query)) &&
    (!specialty || externalClasses.some(item=>item.lugar_id === place.id && normalize(item.categoria) === normalize(specialty)));
}

/** A published database class replaces its original reference in discovery. */
export function unimportedCatalogClasses(activities: { status: string; catalog_source_id?: string | null }[]) {
  const imported = new Set(activities.filter(item => item.status === "published" && item.catalog_source_id).map(item => item.catalog_source_id));
  return externalClasses.filter(item => !imported.has(item.id));
}
