/** @format */

import {
  loginSvgLinearGradients,
  loginSvgPaths,
} from "../../../illustrations/loginSvgPaths";
import { vibesTheme } from "../../../theme/vibesTheme";
import type { AnimatedIllustrationProps } from "../AnimatedIllustration";

export const loginIllustrationConfig: Pick<
  AnimatedIllustrationProps,
  | "paths"
  | "viewBox"
  | "linearGradients"
  | "hiddenPathIndexes"
  | "drawSegments"
  | "flyers"
  | "floatLayers"
  | "revealLayers"
  | "circles"
  | "drawDurationMs"
  | "fillRevealStart"
  | "fillRevealDurationMs"
  | "showPenTip"
  | "penPath"
> = {
  paths: loginSvgPaths,
  viewBox: "0 0 1688 2024",
  linearGradients: loginSvgLinearGradients,
  hiddenPathIndexes: [
    0,
    47, 48, 49, 50, 51, 52, 53, 54, 60, 61, 62, 65,
    1, 2, 3, 4, 5, 9, 10, 18, 19, 39,
  ],
  drawSegments: [
    { pathIndex: 55, dash: 22000, startAt: 0.0, span: 0.2, strokeWidth: 2 },
    { pathIndex: 28, dash: 26000, startAt: 0.2, span: 0.3, strokeWidth: 2 },
    { pathIndex: 35, dash: 28000, startAt: 0.5, span: 0.26, strokeWidth: 2 },
    { pathIndex: 56, dash: 16000, startAt: 0.76, span: 0.14, strokeWidth: 1.9 },
    { pathIndex: 64, dash: 15000, startAt: 0.9, span: 0.1, strokeWidth: 1.9 },
  ],
  flyers: [
    {
      pathIndexes: [47, 48, 49, 50, 51, 52, 53, 54, 65],
      miniViewBox: "317 441 220 250",
      anchorX: 420,
      anchorY: 520,
      size: 116,
      amplitudeX: 34,
      amplitudeY: 20,
      rotationDeg: 9,
      durationMs: 3400,
      phase: 0.1,
      mode: "loop",
      scale: 1,
    },
    {
      pathIndexes: [60, 61, 62],
      miniViewBox: "233 180 170 170",
      anchorX: 285,
      anchorY: 215,
      size: 86,
      amplitudeX: 26,
      amplitudeY: 14,
      rotationDeg: 7,
      durationMs: 3700,
      delayMs: 120,
      phase: 0.3,
      mode: "loop",
      scale: 1,
    },
    {
      pathIndexes: [60, 61, 62],
      miniViewBox: "233 180 170 170",
      anchorX: 350,
      anchorY: 270,
      size: 68,
      amplitudeX: 20,
      amplitudeY: 12,
      rotationDeg: 6,
      durationMs: 4100,
      delayMs: 260,
      phase: 0.55,
      mode: "loop",
      scale: 0.88,
    },
  ],
  floatLayers: [
    {
      pathIndexes: [1, 2, 3, 4, 5],
      amplitudeY: 5,
      durationMs: 3600,
      opacity: 0.96,
      phase: 0,
    },
    {
      pathIndexes: [9, 10],
      amplitudeY: 7,
      amplitudeX: 3,
      durationMs: 4300,
      opacity: 0.9,
      phase: 0.35,
    },
  ],
  revealLayers: [
    {
      pathIndexes: [39, 18, 19],
      startAt: 0.62,
      durationMs: 700,
      fromOpacity: 0,
      toOpacity: 1,
      fromScale: 0.97,
      toScale: 1,
    },
  ],
  circles: [],
  drawDurationMs: 3400,
  fillRevealStart: 0.72,
  fillRevealDurationMs: 760,
  showPenTip: true,
  penPath: {
    inputRange: [0, 0.2, 0.5, 0.76, 0.9, 1],
    x: [970, 780, 1220, 1260, 560, 390],
    y: [185, 1080, 760, 1320, 1410, 520],
    size: 7,
    color: vibesTheme.colors.accentCoral,
  },
};
