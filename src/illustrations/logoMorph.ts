export type LogoMorphShape = {
  letter: string;
  part: string;
  color: string;
  contours: { color?: string; from: number[][]; to: number[][] }[];
};
export const LOGO_MORPH_DURATION = 2500;
export const logoMorphShapes: LogoMorphShape[] = require("../../assets/branding/vibes-logo-morph.json");
// Keep the stem and bowl in a single closed outline throughout the morph.
// Close the counter early so it cannot become a separate moving circle.
function connectedBPath(shape: LogoMorphShape, t: number): string {
  "worklet";
  let path = "";
  const outline = shape.contours[0];
  for (let i = 0; i < outline.from.length; i++) {
    const from = outline.from[i], to = outline.to[i];
    path += (i === 0 ? "M" : "L") +
      (from[0] + (to[0] - from[0]) * t) + " " +
      (from[1] + (to[1] - from[1]) * t);
  }
  path += "Z";
  const counter = shape.contours[1];
  let centerX = 0, centerY = 0;
  for (const point of counter.from) {
    centerX += point[0] / counter.from.length;
    centerY += point[1] / counter.from.length;
  }
  const closing = Math.min(1, t / 0.16);
  for (let i = 0; i < counter.from.length; i++) {
    const from = counter.from[i];
    const x = from[0] + (centerX - from[0]) * closing + (counter.to[0][0] - centerX) * t;
    const y = from[1] + (centerY - from[1]) * closing + (counter.to[0][1] - centerY) * t;
    path += (i === 0 ? "M" : "L") + x + " " + y;
  }
  return path + "Z";
}
export function logoMorphPath(shape: LogoMorphShape, progress: number): string {
  "worklet";
  const t = Math.max(0, Math.min(progress, 1));
  if (shape.letter === "b" && t > 0 && t < 1) return connectedBPath(shape, t);
  let path = "";
  for (const contour of shape.contours) {
    for (let i = 0; i < contour.from.length; i++) {
      const x = contour.from[i][0] + (contour.to[i][0] - contour.from[i][0]) * t;
      const y = contour.from[i][1] + (contour.to[i][1] - contour.from[i][1]) * t;
      path += (i === 0 ? "M" : "L") + x + " " + y;
    }
    path += "Z";
  }
  return path;
}

export const logoMorphRenderShapes: LogoMorphShape[] = logoMorphShapes.flatMap(shape =>
  shape.letter === "i"
    ? shape.contours.map((contour, index) => ({ ...shape, letter: `i-${index}`, color: contour.color ?? shape.color, contours: [contour] }))
    : [shape]
);
