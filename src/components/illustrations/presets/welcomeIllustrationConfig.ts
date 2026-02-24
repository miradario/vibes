/** @format */

import { vibesTheme } from "../../../theme/vibesTheme";
import {
  welcomeSvgLinearGradients,
  welcomeSvgPaths,
} from "../../../illustrations/welcomeSvgPaths";
import type { AnimatedIllustrationProps } from "../AnimatedIllustration";

export const welcomeIllustrationConfig: Pick<
  AnimatedIllustrationProps,
  | "paths"
  | "viewBox"
  | "linearGradients"
  | "hiddenPathIndexes"
  | "drawSegments"
  | "butterflies"
  | "circles"
  | "drawDurationMs"
  | "fillRevealStart"
  | "fillRevealDurationMs"
  | "showPenTip"
  | "penPath"
> = {
  paths: welcomeSvgPaths,
  viewBox: "0 0 1588 2048",
  linearGradients: welcomeSvgLinearGradients,
  hiddenPathIndexes: [
    0, 1, 2,
    10, 11,
    99, 100, 101, 102, 103, 104, 105,
    106, 107, 108, 109, 110, 112, 114,
  ],
  drawSegments: [
    { pathIndex: 98, dash: 8000, startAt: 0, span: 0.18, strokeWidth: 2.1 },
    { pathIndex: 17, dash: 48000, startAt: 0.18, span: 0.4, strokeWidth: 2.1 },
    { pathIndex: 37, dash: 18000, startAt: 0.58, span: 0.22, strokeWidth: 1.9 },
    { pathIndex: 44, dash: 12000, startAt: 0.8, span: 0.12, strokeWidth: 1.9 },
    { pathIndex: 115, dash: 10000, startAt: 0.92, span: 0.08, strokeWidth: 1.7 },
  ],
  butterflies: [
    {
      pathIndexes: [99, 100, 101, 102, 103, 104, 105],
      miniViewBox: "1088 430 150 180",
      anchorX: 985,
      anchorY: 365,
      size: 132,
      amplitudeX: 38,
      amplitudeY: 22,
      rotationDeg: 10,
      durationMs: 3300,
      phase: 0,
      scale: 1,
    },
    {
      pathIndexes: [106, 107, 108, 109, 110, 112, 114],
      miniViewBox: "1210 395 130 190",
      anchorX: 1115,
      anchorY: 395,
      size: 116,
      amplitudeX: 34,
      amplitudeY: 20,
      rotationDeg: 9,
      durationMs: 3700,
      delayMs: 180,
      phase: 0.22,
      scale: 0.9,
    },
    {
      pathIndexes: [99, 100, 102],
      miniViewBox: "1148 500 90 110",
      anchorX: 940,
      anchorY: 470,
      size: 88,
      amplitudeX: 28,
      amplitudeY: 16,
      rotationDeg: 8,
      durationMs: 4100,
      delayMs: 280,
      phase: 0.4,
      scale: 0.78,
    },
  ],
  circles: [
    {
      x: 250,
      y: 230,
      size: 120,
      color: vibesTheme.colors.accentBlue,
      opacity: 0.32,
      startAt: 0.1,
      durationMs: 500,
      scaleFrom: 0.55,
    },
    {
      x: 1160,
      y: 1210,
      size: 165,
      color: vibesTheme.colors.accentMustard,
      opacity: 0.35,
      startAt: 0.32,
      durationMs: 560,
      scaleFrom: 0.6,
    },
    {
      x: 1060,
      y: 190,
      size: 90,
      color: vibesTheme.colors.accentCoral,
      opacity: 0.28,
      startAt: 0.48,
      durationMs: 520,
      scaleFrom: 0.6,
    },
    {
      x: 370,
      y: 980,
      size: 72,
      color: vibesTheme.colors.accentCoral,
      opacity: 0.24,
      startAt: 0.68,
      durationMs: 480,
      scaleFrom: 0.7,
    },
  ],
  drawDurationMs: 3400,
  fillRevealStart: 0.76,
  fillRevealDurationMs: 780,
  showPenTip: true,
  penPath: {
    inputRange: [0, 0.18, 0.58, 0.8, 0.92, 1],
    x: [1080, 870, 700, 720, 980, 1240],
    y: [440, 700, 1180, 1420, 1160, 1250],
    size: 8,
    color: vibesTheme.colors.accentCoral,
  },
};
