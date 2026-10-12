import { logoMorphRenderShapes } from "./logoMorph";

const CENTER = 627;
const OUTER_RADIUS = 430;
const INNER_RADIUS = 330;
const order = [4, 1, 0, 5, 2, 3];

function signedArea(points: number[][]) {
  return points.reduce((area, point, i) => {
    const next = points[(i + 1) % points.length];
    return area + point[0] * next[1] - next[0] * point[1];
  }, 0);
}

/** Use the exact logo contours; each colored piece becomes one segment of a ring. */
export const logoLoaderShapes = logoMorphRenderShapes.map((shape, index) => {
  const angle = -Math.PI / 2 + order[index] * Math.PI / 3;
  const start = angle - Math.PI / 6 + 0.035;
  const end = angle + Math.PI / 6 - 0.035;
  const ring: number[][] = [];
  for (let i = 0; i < 160; i++) {
    let radius: number;
    let theta: number;
    if (i < 70) { radius = OUTER_RADIUS; theta = start + (end - start) * i / 70; }
    else if (i < 80) { radius = OUTER_RADIUS + (INNER_RADIUS - OUTER_RADIUS) * (i - 70) / 10; theta = end; }
    else if (i < 150) { radius = INNER_RADIUS; theta = end + (start - end) * (i - 80) / 70; }
    else { radius = INNER_RADIUS + (OUTER_RADIUS - INNER_RADIUS) * (i - 150) / 10; theta = start; }
    ring.push([CENTER + radius * Math.cos(theta), CENTER + radius * Math.sin(theta)]);
  }
  const source = shape.contours[0].to;
  if (signedArea(source) * signedArea(ring) < 0) ring.reverse();
  // Align contour origins to avoid a twisted segment during the transformation.
  let bestShift = 0;
  let bestDistance = Infinity;
  for (let shift = 0; shift < ring.length; shift++) {
    let distance = 0;
    for (let i = 0; i < source.length; i++) {
      const target = ring[(i + shift) % ring.length];
      distance += (target[0] - source[i][0]) ** 2 + (target[1] - source[i][1]) ** 2;
    }
    if (distance < bestDistance) { bestDistance = distance; bestShift = shift; }
  }
  return {
    key: shape.letter,
    color: shape.color,
    from: source,
    to: ring.map((_, i) => ring[(i + bestShift) % ring.length]),
    offset: [Math.cos(angle) * 70, Math.sin(angle) * 70],
  };
});

export function logoLoaderFrame(phase: number) {
  "worklet";
  const p = Math.max(0, Math.min(1, phase));
  const rawMorph = p < 0.12 ? 0 : p < 0.4 ? (p - 0.12) / 0.28 : p < 0.72 ? 1 : p < 0.95 ? 1 - (p - 0.72) / 0.23 : 0;
  const morph = rawMorph * rawMorph * (3 - 2 * rawMorph);
  const rotation = p < 0.4 ? 0 : p < 0.72 ? (p - 0.4) / 0.32 * 360 : 360;
  return { morph, rotation };
}

export function logoLoaderPath(shape: typeof logoLoaderShapes[number], morph: number) {
  "worklet";
  const t = Math.max(0, Math.min(1, morph));
  const separation = Math.sin(t * Math.PI);
  let path = "";
  for (let i = 0; i < shape.from.length; i++) {
    const x = shape.from[i][0] + (shape.to[i][0] - shape.from[i][0]) * t + shape.offset[0] * separation;
    const y = shape.from[i][1] + (shape.to[i][1] - shape.from[i][1]) * t + shape.offset[1] * separation;
    path += (i === 0 ? "M" : "L") + x + " " + y;
  }
  return path + "Z";
}
