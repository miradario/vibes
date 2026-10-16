export type CropTransform = { zoom: number; x: number; y: number };

export function constrainPhotoCrop(width: number, height: number, size: number, value: CropTransform) {
  const fit = size / Math.min(width, height);
  const zoom = Math.max(1, Math.min(4, value.zoom));
  return {
    zoom,
    x: Math.min(0, Math.max(size - width * fit * zoom, value.x)),
    y: Math.min(0, Math.max(size - height * fit * zoom, value.y)),
  };
}

export function photoCropRect(width: number, height: number, size: number, value: CropTransform) {
  const bounded = constrainPhotoCrop(width, height, size, value);
  const scale = size / Math.min(width, height) * bounded.zoom;
  const side = Math.max(1, Math.min(width, height, Math.round(size / scale)));
  return {
    originX: Math.max(0, Math.min(width - side, Math.round(-bounded.x / scale))),
    originY: Math.max(0, Math.min(height - side, Math.round(-bounded.y / scale))),
    width: side,
    height: side,
  };
}
