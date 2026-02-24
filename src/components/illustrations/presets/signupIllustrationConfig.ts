/** @format */

import {
  signupSvgLinearGradients,
  signupSvgPaths,
} from "../../../illustrations/signupSvgPaths";
import { vibesTheme } from "../../../theme/vibesTheme";
import type { AnimatedIllustrationProps } from "../AnimatedIllustration";

export const signupIllustrationConfig: Pick<
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
  paths: signupSvgPaths,
  viewBox: "0 0 1697 2048",
  linearGradients: signupSvgLinearGradients,
  hiddenPathIndexes: [0],
  drawSegments: [
    { pathIndex: 11, dash: 36000, startAt: 0, span: 0.46, strokeWidth: 2 },
    { pathIndex: 9, dash: 22000, startAt: 0.46, span: 0.25, strokeWidth: 2 },
    { pathIndex: 7, dash: 16000, startAt: 0.71, span: 0.19, strokeWidth: 1.9 },
    { pathIndex: 6, dash: 14000, startAt: 0.9, span: 0.1, strokeWidth: 1.8 },
  ],
  flyers: [],
  floatLayers: [
    {
      pathIndexes: [1, 2],
      amplitudeY: 4,
      amplitudeX: 2,
      durationMs: 3800,
      phase: 0.2,
      opacity: 0.95,
    },
  ],
  revealLayers: [
    {
      pathIndexes: [3, 4, 15],
      startAt: 0.6,
      durationMs: 720,
      fromOpacity: 0,
      toOpacity: 1,
      fromScale: 0.98,
      toScale: 1,
    },
  ],
  circles: [],
  drawDurationMs: 3400,
  fillRevealStart: 0.72,
  fillRevealDurationMs: 760,
  showPenTip: true,
  penPath: {
    inputRange: [0, 0.46, 0.71, 0.9, 1],
    x: [900, 720, 980, 1150, 1240],
    y: [500, 980, 1320, 1180, 1780],
    size: 7,
    color: vibesTheme.colors.accentCoral,
  },
};
