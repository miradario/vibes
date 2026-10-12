export type LogoMorphShape = {
  letter: string;
  part: string;
  color: string;
  contours: { color?: string; from: number[][]; to: number[][] }[];
};
export const LOGO_MORPH_DURATION = 2500;
export const logoMorphShapes: LogoMorphShape[] = require("../../assets/branding/vibes-logo-morph.json");
export function logoMorphPath(shape: LogoMorphShape, progress: number): string {
  "worklet";
  const t = Math.max(0, Math.min(progress, 1));
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
