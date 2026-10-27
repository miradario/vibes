// Conversión entre puntos de la preview estática del mapa (Google Static Maps,
// proyección Web Mercator) y coordenadas, para poder mover el pin sin un mapa nativo.

export const MAP_PREVIEW_ZOOM = 15;
const TILE_SIZE = 256;
const MAX_LAT = 85.05112878;

export type LatLng = { lat: number; lng: number };
export type Size = { width: number; height: number };

const worldSize = (zoom: number) => TILE_SIZE * Math.pow(2, zoom);

export const latLngToWorld = ({ lat, lng }: LatLng, zoom: number) => {
  const clampedLat = Math.max(-MAX_LAT, Math.min(MAX_LAT, lat));
  const sin = Math.sin((clampedLat * Math.PI) / 180);
  const size = worldSize(zoom);
  return {
    x: ((lng + 180) / 360) * size,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size,
  };
};

export const worldToLatLng = ({ x, y }: { x: number; y: number }, zoom: number): LatLng => {
  const size = worldSize(zoom);
  const lng = (x / size) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / size;
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));
  let wrappedLng = ((lng + 180) % 360 + 360) % 360 - 180;
  if (wrappedLng === -180 && lng > 0) wrappedLng = 180;
  return { lat, lng: wrappedLng };
};

// La imagen se muestra con resizeMode "cover": factor de pantalla por píxel de mapa.
export const coverScale = (container: Size, image: Size) =>
  Math.max(container.width / image.width, container.height / image.height);

// Punto tocado dentro de la preview (en puntos de pantalla) → coordenadas.
export const previewPointToLatLng = (params: {
  center: LatLng;
  point: { x: number; y: number };
  container: Size;
  image: Size;
  zoom?: number;
}): LatLng => {
  const zoom = params.zoom ?? MAP_PREVIEW_ZOOM;
  const scale = coverScale(params.container, params.image);
  const centerWorld = latLngToWorld(params.center, zoom);
  const dx = (params.point.x - params.container.width / 2) / scale;
  const dy = (params.point.y - params.container.height / 2) / scale;
  return worldToLatLng({ x: centerWorld.x + dx, y: centerWorld.y + dy }, zoom);
};

export const clampPointToContainer = (point: { x: number; y: number }, container: Size) => ({
  x: Math.max(0, Math.min(container.width, point.x)),
  y: Math.max(0, Math.min(container.height, point.y)),
});
