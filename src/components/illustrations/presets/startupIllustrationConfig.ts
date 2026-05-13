/** @format */

import { vibesTheme } from "../../../theme/vibesTheme";
import {
  welcomeSvgLinearGradients,
  welcomeSvgPaths,
} from "../../../illustrations/welcomeSvgPaths";
import type { AnimatedIllustrationProps } from "../AnimatedIllustration";

export const startupIllustrationConfig: Pick<
  AnimatedIllustrationProps,
  | "paths"
  | "viewBox"
  | "linearGradients"
  | "hiddenPathIndexes"
  | "drawSegments"
  | "circles"
  | "drawDurationMs"
  | "fillRevealStart"
  | "fillRevealDurationMs"
  | "showPenTip"
> = {
  paths: welcomeSvgPaths,
  viewBox: "0 0 1588 2048",
  linearGradients: welcomeSvgLinearGradients,
  hiddenPathIndexes: [
    0,
    1,
    2,
    10,
    11,
    98,
    99,
    100,
    101,
    102,
    103,
    104,
    105,
    106,
    107,
    108,
    109,
    110,
    111,
    112,
    113,
    114,
  ],
  drawSegments: [
    { pathIndex: 17, dash: 42000, startAt: 0, span: 0.56, strokeWidth: 1.95 },
    { pathIndex: 37, dash: 17000, startAt: 0.56, span: 0.26, strokeWidth: 1.8 },
    { pathIndex: 44, dash: 10000, startAt: 0.82, span: 0.18, strokeWidth: 1.7 },
  ],
  circles: [
    {
      x: 250,
      y: 230,
      size: 100,
      color: vibesTheme.colors.accentBlue,
      opacity: 0.18,
      startAt: 0.16,
      durationMs: 540,
      scaleFrom: 0.58,
    },
    {
      x: 1160,
      y: 1210,
      size: 132,
      color: vibesTheme.colors.accentMustard,
      opacity: 0.2,
      startAt: 0.42,
      durationMs: 620,
      scaleFrom: 0.6,
    },
  ],
  drawDurationMs: 3600,
  fillRevealStart: 0.74,
  fillRevealDurationMs: 840,
  showPenTip: false,
};
